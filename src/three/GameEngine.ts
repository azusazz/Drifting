import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  BASE_STORAGE_CAPACITY,
  BUILD_ITEMS,
  CHEST_STORAGE_BONUS,
  DAY_DURATION_SECONDS,
  INITIAL_RESOURCES,
  STAGE_META,
  TILE_SIZE,
} from '../constants/buildings';
import {
  BuildItemId,
  ContextualHints,
  DailyReportStats,
  EdgeAxis,
  EdgeWallState,
  FacilityType,
  FloatingPopup,
  FurnitureType,
  GameHudSnapshot,
  GamePhase,
  GameStats,
  HoldActionKind,
  HoldProgressState,
  InteractionTool,
  PendingPlacementInfo,
  RaftTile,
  ResourceType,
  RotationDir,
  SharkBehavior,
  StageGoalItem,
  StageId,
  TimeOfDay,
  ToastMessage,
  WeatherType,
} from '../types/game';
import {
  BuildingVisual,
  createBuildingVisual,
  createEdgeWallVisual,
  createFloatingItemVisual,
  createFurnitureVisual,
  createHouseFloorVisual,
  createHouseRoofVisual,
  createMaterials,
  createPlayerVisual,
  createRaftTileVisual,
  createSharkVisual,
  EdgeWallVisual,
  FurnitureVisual,
  HouseRoofVisual,
  MaterialLibrary,
  PlayerVisual,
  RaftTileVisual,
  SharkVisual,
} from './models';
import { OceanSimulation } from './ocean';
import { soundEngine } from './sound';

export interface GameEngineCallbacks {
  onHudUpdate: (snapshot: GameHudSnapshot) => void;
  onPopupsUpdate: (popups: FloatingPopup[]) => void;
  onToast: (toast: ToastMessage) => void;
}

interface TileRuntime {
  data: RaftTile;
  visual: RaftTileVisual;
  buildingVisual: BuildingVisual | null;
  houseFloorGroup: THREE.Group | null;
  houseRoofVisual: HouseRoofVisual | null;
  furnitureVisual: FurnitureVisual | null;
  rugVisual: FurnitureVisual | null;
}

interface EdgeWallRuntime {
  data: EdgeWallState;
  visual: EdgeWallVisual;
}

interface FloatingItemRuntime {
  id: number;
  type: ResourceType;
  amount: number;
  mesh: THREE.Group;
  x: number;
  z: number;
  vx: number;
  vz: number;
  bobOffset: number;
  hooked: boolean;
}

interface ActivePopup3D {
  id: number;
  text: string;
  tone: FloatingPopup['tone'];
  wx: number;
  wy: number;
  wz: number;
  age: number;
  maxAge: number;
  isClaim?: boolean;
}

const HOLD_DURATIONS: Record<HoldActionKind, number> = {
  repair: 1.5,
  harvest: 1.0,
  rest: 1.2,
};

const HOLD_LABELS: Record<HoldActionKind, string> = {
  repair: '正在维修木筏...',
  harvest: '正在收取物资...',
  rest: '正在木床休息...',
};

// Pre-allocated scratch math objects (zero per-frame heap churn)
const _rayMouse = new THREE.Vector2();
const _waterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _hitPoint = new THREE.Vector3();
const _projPos = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _camDesired = new THREE.Vector3();

function tileKey(gx: number, gz: number): string {
  return `${gx},${gz}`;
}

function edgeKey(axis: EdgeAxis, gx: number, gz: number): string {
  return `${axis}:${gx},${gz}`;
}

function edgeWorldCenter(axis: EdgeAxis, gx: number, gz: number): { x: number; z: number } {
  if (axis === 'H') {
    return { x: gx * TILE_SIZE, z: (gz - 0.5) * TILE_SIZE };
  }
  return { x: (gx - 0.5) * TILE_SIZE, z: gz * TILE_SIZE };
}

function isSoftwareWebGLRenderer(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return false;
    const rendererStr = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
    return /SwiftShader|llvmpipe|softpipe|Software Adapter|Microsoft Basic Render Driver/i.test(
      rendererStr,
    );
  } catch {
    return false;
  }
}

export class GameEngine {
  private mountEl: HTMLElement;
  private callbacks: GameEngineCallbacks;

  private renderer: THREE.WebGLRenderer;
  private isSoftwareGl: boolean;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private pmremTarget: THREE.WebGLRenderTarget;
  private mats: MaterialLibrary;
  private ocean: OceanSimulation;

  // Lighting
  private hemiLight: THREE.HemisphereLight;
  private sunLight: THREE.DirectionalLight;
  private fillLight: THREE.DirectionalLight;

  // World groups
  private raftGroup = new THREE.Group();
  private floatingGroup = new THREE.Group();
  private playerVisual: PlayerVisual;
  private sharkVisual: SharkVisual;
  private hookLine: THREE.Line;
  private hookTip: THREE.Mesh;
  private previewMesh: THREE.Mesh;
  private sharkBeaconRing: THREE.Mesh;

  // Raycaster
  private raycaster = new THREE.Raycaster();

  // Game state
  private phase: GamePhase = 'title';
  private day = 1;
  private dayTime = 8; // seconds into current day
  private weather: WeatherType = 'clear';
  private nextWeather: WeatherType = 'overcast';
  private stormFactor = 0;
  private stage: StageId = 1;

  private resources = { ...INITIAL_RESOURCES };
  private survival = {
    health: 100,
    maxHealth: 100,
    hunger: 92,
    maxHunger: 100,
    thirst: 92,
    maxThirst: 100,
  };

  private tiles = new Map<string, TileRuntime>();
  private edgeWalls = new Map<string, EdgeWallRuntime>();
  private floatingItems: FloatingItemRuntime[] = [];
  private popups: ActivePopup3D[] = [];
  private nextEntityId = 1;

  // Player state
  private playerPos = new THREE.Vector3(0, 0.22, 0);
  private playerYaw = 0;
  private playerSpeed = 0;
  private playerInWater = false;
  private waterBiteCooldown = 0;
  private lastStrikeMs = 0;
  private spearHoldTimer = 0;
  private virtualMove = { x: 0, z: 0 };
  private keysPressed = new Set<string>();
  private damageFlash = 0;
  private bedRestCooldown = 0;

  // Hook throw state
  private hookState: {
    active: boolean;
    returning: boolean;
    progress: number;
    targetItem: FloatingItemRuntime | null;
    targetPos: THREE.Vector3;
  } = {
    active: false,
    returning: false,
    progress: 0,
    targetItem: null,
    targetPos: new THREE.Vector3(),
  };

  // Shark state
  private shark = {
    behavior: 'circling' as SharkBehavior,
    hp: 100,
    maxHp: 100,
    angle: 0,
    radius: 10.5,
    x: 10.5,
    z: 0,
    targetTileKey: null as string | null,
    cycleTimer: 16,
    warningTimer: 0,
    warningDuration: 6.5,
    biteCooldown: 0,
    repelledTimer: 0,
    hitFlash: 0,
    isFrenzy: false,
  };

  // Tools & Preview
  private selectedTool: InteractionTool = null;
  private rotation: RotationDir = 0;
  private roofCutaway = false;
  private pendingTarget: {
    valid: boolean;
    reason: string;
    gx: number;
    gz: number;
    axis?: EdgeAxis;
    worldX: number;
    worldZ: number;
  } | null = null;

  // Camera zoom & pan
  private cameraDistance = 16.5;
  private cameraPanOffset = new THREE.Vector2(0, 0);

  // Stats & reports
  private stats: GameStats = {
    resourcesCollected: 0,
    tilesBuilt: 0,
    buildingsConstructed: 0,
    housePartsBuilt: 0,
    furniturePlaced: 0,
    sharksRepelled: 0,
    foodHarvested: 0,
    waterCollected: 0,
    daysSurvived: 0,
  };
  private dailyCounters = {
    resourcesCollectedToday: 0,
    builtToday: 0,
    sharksRepelledToday: 0,
    damageTakenToday: 0,
  };
  private dailyReport: DailyReportStats | null = null;
  private gameOverReason = '';

  // Hold-to-perform action state
  private holdState: {
    kind: HoldActionKind;
    elapsed: number;
    duration: number;
    source: 'ui' | 'key' | 'canvas';
  } | null = null;

  // Timers
  private simTime = 0;
  private spawnTimer = 1.5;
  private autoRepairTimer = 0;
  private hudEmitAccum = 0;
  private lastPointerDown = { x: 0, y: 0, time: 0, active: false, dragged: false, pointerId: -1 };
  private longPressTimer: number | null = null;

  // Loop
  private disposed = false;
  private rafId = 0;
  private timeoutId = 0;
  private lastFrameMs = 0;

  constructor(mountEl: HTMLElement, callbacks: GameEngineCallbacks) {
    this.mountEl = mountEl;
    this.callbacks = callbacks;

    const width = Math.max(320, mountEl.clientWidth || window.innerWidth);
    const height = Math.max(320, mountEl.clientHeight || window.innerHeight);

    // Temp probe context for software WebGL detection
    const probeCanvas = document.createElement('canvas');
    const probeGl =
      probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    this.isSoftwareGl = probeGl ? isSoftwareWebGLRenderer(probeGl) : false;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2),
    );
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountEl.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#69c2dc');
    this.scene.fog = new THREE.FogExp2('#7ecde2', 0.011);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envScene = new RoomEnvironment();
    this.pmremTarget = pmrem.fromScene(envScene, 0.04);
    this.scene.environment = this.pmremTarget.texture;
    envScene.dispose();
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 160);
    this.camera.position.set(0, 13.5, 13.5);
    this.camera.lookAt(0, 0, 0);

    // 3-point maritime lighting
    this.hemiLight = new THREE.HemisphereLight('#bfefff', '#0e4c62', 0.85);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight('#fff1d6', 1.85);
    this.sunLight.position.set(14, 22, 10);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 65;
    const d = 16;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    this.fillLight = new THREE.DirectionalLight('#67c8e8', 0.55);
    this.fillLight.position.set(-14, 9, -12);
    this.scene.add(this.fillLight);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.mats = createMaterials(maxAniso);

    this.ocean = new OceanSimulation();
    this.scene.add(this.ocean.group);
    this.scene.add(this.raftGroup);
    this.scene.add(this.floatingGroup);

    this.playerVisual = createPlayerVisual(this.mats);
    this.scene.add(this.playerVisual.group);

    this.sharkVisual = createSharkVisual(this.mats);
    this.scene.add(this.sharkVisual.group);

    // Hook line & tip
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    this.hookLine = new THREE.Line(
      lineGeo,
      new THREE.LineBasicMaterial({ color: '#e2e8f0' }),
    );
    this.hookLine.visible = false;
    this.scene.add(this.hookLine);

    this.hookTip = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.34, 6),
      this.mats.iron,
    );
    this.hookTip.visible = false;
    this.scene.add(this.hookTip);

    // Placement highlight preview
    this.previewMesh = new THREE.Mesh(
      new THREE.BoxGeometry(TILE_SIZE * 0.94, 0.24, TILE_SIZE * 0.94),
      new THREE.MeshBasicMaterial({
        color: '#22c55e',
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      }),
    );
    this.previewMesh.visible = false;
    this.scene.add(this.previewMesh);

    // Shark warning ring
    this.sharkBeaconRing = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.25, 24),
      new THREE.MeshBasicMaterial({
        color: '#ef4444',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.78,
      }),
    );
    this.sharkBeaconRing.rotation.x = -Math.PI / 2;
    this.sharkBeaconRing.visible = false;
    this.scene.add(this.sharkBeaconRing);

    this.resetWorldToStarterRaft();
    this.bindEvents();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.emitHud();
    this.lastFrameMs = performance.now();
    this.scheduleNextFrame();
  }

  private scheduleNextFrame(): void {
    if (this.disposed) return;
    this.rafId = window.requestAnimationFrame(this.loop);
  }

  private loop = (nowMs: number): void => {
    if (this.disposed) return;
    const rawDt = (nowMs - this.lastFrameMs) / 1000;
    this.lastFrameMs = nowMs;
    const dt = Math.min(0.08, Math.max(0.001, rawDt));

    this.stepSimulation(dt);
    this.renderFrame();

    if (this.isSoftwareGl) {
      const gl = this.renderer.getContext();
      if (typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext) {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        if (sync) {
          gl.flush();
          gl.deleteSync(sync);
        }
      }
      this.timeoutId = window.setTimeout(() => this.scheduleNextFrame(), 80);
    } else {
      this.scheduleNextFrame();
    }
  };

  private renderFrame(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
  };

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    const dom = this.renderer.domElement;
    dom.addEventListener('webglcontextlost', this.handleContextLost);
    dom.addEventListener('pointerdown', this.handlePointerDown);
    dom.addEventListener('pointermove', this.handlePointerMove);
    dom.addEventListener('pointerup', this.handlePointerUp);
    dom.addEventListener('pointercancel', this.handlePointerCancel);
    dom.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  private unbindEvents(): void {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);

    const dom = this.renderer.domElement;
    dom.removeEventListener('webglcontextlost', this.handleContextLost);
    dom.removeEventListener('pointerdown', this.handlePointerDown);
    dom.removeEventListener('pointermove', this.handlePointerMove);
    dom.removeEventListener('pointerup', this.handlePointerUp);
    dom.removeEventListener('pointercancel', this.handlePointerCancel);
    dom.removeEventListener('wheel', this.handleWheel);
  }

  private handleResize = (): void => {
    if (this.disposed) return;
    const width = Math.max(320, this.mountEl.clientWidth || window.innerWidth);
    const height = Math.max(320, this.mountEl.clientHeight || window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.adjustCameraZoom(e.deltaY > 0 ? 1.2 : -1.2);
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
    ) {
      return;
    }

    const code = e.code;
    this.keysPressed.add(code);

    if (code === 'Escape') {
      this.cancelHoldAction();
      if (this.selectedTool) {
        this.setSelectedTool(null);
      } else if (this.phase === 'playing' || this.phase === 'paused') {
        this.togglePause();
      }
      return;
    }

    if (this.phase !== 'playing') return;
    if (e.repeat) return;

    if (code === 'KeyE') {
      const ctx = this.computeContextHints();
      if (ctx.canHarvestNearby) {
        this.startHoldAction('harvest', 'key');
      } else if (ctx.canRestBed) {
        this.startHoldAction('rest', 'key');
      }
    } else if (code === 'KeyF') {
      this.triggerStrikeShark();
    } else if (code === 'KeyR') {
      const ctx = this.computeContextHints();
      if (ctx.canRepairNearby) {
        this.startHoldAction('repair', 'key');
      } else {
        this.setSelectedTool(this.selectedTool === 'repair' ? null : 'repair');
      }
    } else if (code === 'KeyT') {
      this.rotatePlacement();
    } else if (code === 'KeyX') {
      this.setSelectedTool(this.selectedTool === 'demolish' ? null : 'demolish');
    } else if (code === 'KeyB') {
      this.setSelectedTool(this.selectedTool === 'floor' ? null : 'floor');
    } else if (code === 'Digit1') {
      this.consumeFood();
    } else if (code === 'Digit2') {
      this.consumeWater();
    } else if (code === 'Digit3') {
      this.setSelectedTool('purifier');
    } else if (code === 'Digit4') {
      this.setSelectedTool('garden');
    } else if (code === 'Digit5') {
      this.setSelectedTool('workbench');
    } else if (code === 'Digit6') {
      this.setSelectedTool('defense');
    } else if (code === 'Digit7') {
      this.setSelectedTool('repair_station');
    } else if (code === 'Digit8') {
      this.setSelectedTool('collector');
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keysPressed.delete(e.code);
    if (this.holdState && this.holdState.source === 'key') {
      if (e.code === 'KeyR' && this.holdState.kind === 'repair') {
        this.cancelHoldAction('repair');
      } else if (
        e.code === 'KeyE' &&
        (this.holdState.kind === 'harvest' || this.holdState.kind === 'rest')
      ) {
        this.cancelHoldAction();
      }
    }
  };

  private getRayWaterPoint(clientX: number, clientY: number): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    _rayMouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _rayMouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(_rayMouse, this.camera);
    const hit = this.raycaster.ray.intersectPlane(_waterPlane, _hitPoint);
    return hit ? _hitPoint.clone() : null;
  }

  private handlePointerDown = (e: PointerEvent): void => {
    if (this.phase !== 'playing') return;
    soundEngine.startOceanAmbience();

    this.lastPointerDown = {
      x: e.clientX,
      y: e.clientY,
      time: performance.now(),
      active: true,
      dragged: false,
      pointerId: e.pointerId,
    };

    if (this.longPressTimer !== null) {
      window.clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // Allow holding directly on damaged tile / facility / bed in the 3D scene
    if (!this.selectedTool || this.selectedTool === 'repair') {
      const wp = this.getRayWaterPoint(e.clientX, e.clientY);
      if (wp) {
        const gx = Math.round(wp.x / TILE_SIZE);
        const gz = Math.round(wp.z / TILE_SIZE);
        const tile = this.tiles.get(tileKey(gx, gz));
        if (tile) {
          if (tile.data.status !== 'intact') {
            this.startHoldAction('repair', 'canvas');
            return;
          }
          if (!this.selectedTool && tile.data.building && tile.data.building.storedOutput > 0) {
            this.startHoldAction('harvest', 'canvas');
            return;
          }
          if (!this.selectedTool && tile.data.furniture?.type === 'bed') {
            this.startHoldAction('rest', 'canvas');
            return;
          }
        }
      }
    }

    if (e.pointerType === 'touch') {
      this.longPressTimer = window.setTimeout(() => {
        if (this.lastPointerDown.active && !this.lastPointerDown.dragged) {
          this.triggerLongPressAction(e.clientX, e.clientY);
        }
      }, 520);
    }
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (this.phase !== 'playing') return;

    if (this.lastPointerDown.active && this.lastPointerDown.pointerId === e.pointerId) {
      const dx = e.clientX - this.lastPointerDown.x;
      const dy = e.clientY - this.lastPointerDown.y;
      if (Math.hypot(dx, dy) > 8) {
        this.lastPointerDown.dragged = true;
        if (this.holdState?.source === 'canvas') {
          this.cancelHoldAction();
        }
        if (this.longPressTimer !== null) {
          window.clearTimeout(this.longPressTimer);
          this.longPressTimer = null;
        }
        const panScale = 0.016;
        this.cameraPanOffset.x = THREE.MathUtils.clamp(
          this.cameraPanOffset.x - dx * panScale,
          -4.5,
          4.5,
        );
        this.cameraPanOffset.y = THREE.MathUtils.clamp(
          this.cameraPanOffset.y - dy * panScale,
          -4.5,
          4.5,
        );
        this.lastPointerDown.x = e.clientX;
        this.lastPointerDown.y = e.clientY;
        return;
      }
    }

    if (this.selectedTool && e.pointerType !== 'touch') {
      const wp = this.getRayWaterPoint(e.clientX, e.clientY);
      if (wp) {
        this.previewToolAtWorld(wp.x, wp.z);
        this.emitHud();
      }
    }
  };

  private handlePointerUp = (e: PointerEvent): void => {
    if (this.longPressTimer !== null) {
      window.clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    if (this.holdState?.source === 'canvas') {
      this.cancelHoldAction();
    }

    if (!this.lastPointerDown.active || this.lastPointerDown.pointerId !== e.pointerId) {
      return;
    }
    const wasDragged = this.lastPointerDown.dragged;
    this.lastPointerDown.active = false;

    if (wasDragged || this.phase !== 'playing') return;

    const wp = this.getRayWaterPoint(e.clientX, e.clientY);
    if (!wp) return;

    // 1. If an action/build tool is active (e.g., placing Bed):
    //    Valid target performs/previews; clicking elsewhere automatically reverts to Hook (拖垃圾) mode!
    if (this.selectedTool) {
      if (this.selectedTool === 'repair') {
        const gx = Math.round(wp.x / TILE_SIZE);
        const gz = Math.round(wp.z / TILE_SIZE);
        const tile = this.tiles.get(tileKey(gx, gz));
        if (!tile || tile.data.status === 'intact') {
          this.setSelectedTool(null);
          this.pushToast('已切回打捞钩模式', 'info');
        } else {
          this.pushToast('请按住受损地板或右侧按钮完成维修', 'info');
        }
        return;
      }
      if (this.selectedTool === 'demolish') {
        const didDemolish = this.tryDemolishAtWorld(wp.x, wp.z, e.clientX, e.clientY);
        if (!didDemolish) {
          this.setSelectedTool(null);
          this.pushToast('已切回打捞钩模式', 'info');
        }
        return;
      }

      const prev = this.pendingTarget;
      this.previewToolAtWorld(wp.x, wp.z);
      if (!this.pendingTarget?.valid) {
        this.setSelectedTool(null);
        this.pushToast('已自动切回打捞钩模式', 'info');
        return;
      }
      if (
        prev &&
        prev.valid &&
        prev.gx === this.pendingTarget.gx &&
        prev.gz === this.pendingTarget.gz &&
        prev.axis === this.pendingTarget.axis
      ) {
        this.confirmPendingPlacement();
      } else {
        this.emitHud();
      }
      return;
    }

    // 2. Check if user clicked/tapped the 3D shark directly -> instant spear strike!
    const rect = this.renderer.domElement.getBoundingClientRect();
    _rayMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _rayMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(_rayMouse, this.camera);
    const sharkHits = this.raycaster.intersectObject(this.sharkVisual.group, true);
    if (
      sharkHits.length > 0 ||
      Math.hypot(wp.x - this.shark.x, wp.z - this.shark.z) < 2.6
    ) {
      this.triggerStrikeShark();
      return;
    }

    // 3. Default Hook / Salvage mode: click visible floating debris in camera sight to pull it back immediately!
    const clickedLoot = this.findClickedVisibleLoot(
      e.clientX,
      e.clientY,
      wp,
      e.pointerType === 'touch' ? 2.4 : 2.0,
    );
    if (clickedLoot) {
      this.throwHookAtItem(clickedLoot);
      return;
    }

    // 4. Hint when tapping a damaged plank quickly without holding
    const gx = Math.round(wp.x / TILE_SIZE);
    const gz = Math.round(wp.z / TILE_SIZE);
    const tile = this.tiles.get(tileKey(gx, gz));
    if (tile && tile.data.status !== 'intact') {
      this.pushToast('维修受损甲板需要按住不放（或按住 R 键）', 'info');
    }
  };

  private findClickedVisibleLoot(
    clientX: number,
    clientY: number,
    waterPoint: THREE.Vector3,
    fallbackRadius = 2.0,
  ): FloatingItemRuntime | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    _rayMouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _rayMouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(_rayMouse, this.camera);

    // Direct 3D mesh raycast first
    const visibleMeshes = this.floatingItems
      .filter((item) => !item.hooked)
      .map((item) => item.mesh);
    if (visibleMeshes.length > 0) {
      const hits = this.raycaster.intersectObjects(visibleMeshes, true);
      if (hits.length > 0) {
        let obj: THREE.Object3D | null = hits[0].object;
        while (obj && obj.parent !== this.floatingGroup) {
          obj = obj.parent;
        }
        const matched = this.floatingItems.find((item) => item.mesh === obj);
        if (matched && this.isItemInSightAndReach(matched)) {
          return matched;
        }
      }
    }

    // Fallback generous tap radius on water plane for mobile fingers
    let closestItem: FloatingItemRuntime | null = null;
    let minItemDist = fallbackRadius;
    for (const item of this.floatingItems) {
      if (item.hooked || !this.isItemInSightAndReach(item)) continue;
      const d = Math.hypot(waterPoint.x - item.x, waterPoint.z - item.z);
      if (d < minItemDist) {
        minItemDist = d;
        closestItem = item;
      }
    }
    return closestItem;
  }

  private isItemInSightAndReach(item: FloatingItemRuntime): boolean {
    const distToPlayer = Math.hypot(item.x - this.playerPos.x, item.z - this.playerPos.z);
    if (distToPlayer > 16.5) return false;
    _projPos.set(item.x, 0.1, item.z).project(this.camera);
    return (
      _projPos.z <= 1.0 &&
      Math.abs(_projPos.x) <= 1.02 &&
      Math.abs(_projPos.y) <= 1.02
    );
  }

  private handlePointerCancel = (): void => {
    if (this.longPressTimer !== null) {
      window.clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    if (this.holdState?.source === 'canvas') {
      this.cancelHoldAction();
    }
    this.lastPointerDown.active = false;
  };

  private triggerLongPressAction(clientX: number, clientY: number): void {
    const wp = this.getRayWaterPoint(clientX, clientY);
    if (!wp) return;
    const gx = Math.round(wp.x / TILE_SIZE);
    const gz = Math.round(wp.z / TILE_SIZE);
    const tile = this.tiles.get(tileKey(gx, gz));
    if (!tile) return;

    if (tile.data.building || tile.data.furniture) {
      this.tryDemolishAtWorld(wp.x, wp.z, clientX, clientY);
    }
  }

  private resetWorldToStarterRaft(): void {
    // Clear existing tiles & any leftover meshes inside raftGroup
    for (const t of this.tiles.values()) {
      this.raftGroup.remove(t.visual.group);
    }
    this.tiles.clear();

    for (const w of this.edgeWalls.values()) {
      this.raftGroup.remove(w.visual.group);
    }
    this.edgeWalls.clear();

    while (this.raftGroup.children.length > 0) {
      this.raftGroup.remove(this.raftGroup.children[0]);
    }

    // Clear floating items & hook projectiles
    for (const f of this.floatingItems) {
      this.floatingGroup.remove(f.mesh);
    }
    while (this.floatingGroup.children.length > 0) {
      this.floatingGroup.remove(this.floatingGroup.children[0]);
    }
    this.floatingItems = [];
    this.popups = [];
    this.callbacks.onPopupsUpdate([]);

    this.hookState = {
      active: false,
      returning: false,
      progress: 0,
      targetItem: null,
      targetPos: new THREE.Vector3(),
    };
    this.hookLine.visible = false;
    this.hookTip.visible = false;

    // Build 1x1 starter raft
    this.createRaftTile(0, 0);
    this.syncOceanFootprints();

    // Spawn 8 reachable initial floating supplies around the 1x1 raft
    const starterLoot: Array<{ type: ResourceType; x: number; z: number }> = [
      { type: 'wood', x: -3.6, z: -1.8 },
      { type: 'wood', x: 3.8, z: -2.4 },
      { type: 'wood', x: -4.8, z: 2.2 },
      { type: 'plastic', x: 4.2, z: 2.0 },
      { type: 'plastic', x: -2.4, z: 4.5 },
      { type: 'metal', x: 5.0, z: -0.6 },
      { type: 'food', x: -2.2, z: -4.4 },
      { type: 'wood', x: 2.6, z: 4.8 },
    ];
    for (const item of starterLoot) {
      this.spawnFloatingItem(item.type, item.x, item.z);
    }

    this.day = 1;
    this.dayTime = 20;
    this.weather = 'clear';
    this.nextWeather = 'overcast';
    this.stormFactor = 0;
    this.stage = 1;

    this.resources = { ...INITIAL_RESOURCES };
    this.survival = {
      health: 100,
      maxHealth: 100,
      hunger: 92,
      maxHunger: 100,
      thirst: 92,
      maxThirst: 100,
    };

    this.playerPos.set(0, 0.28, 0);
    this.playerYaw = 0;
    this.playerSpeed = 0;
    this.playerInWater = false;
    this.waterBiteCooldown = 0;
    this.lastStrikeMs = 0;
    this.spearHoldTimer = 0;
    this.bedRestCooldown = 0;
    this.autoRepairTimer = 0;
    this.spawnTimer = 1.0;
    this.keysPressed.clear();
    this.virtualMove = { x: 0, z: 0 };
    this.damageFlash = 0;
    this.cameraPanOffset.set(0, 0);
    this.selectedTool = null;
    this.rotation = 0;
    this.holdState = null;
    this.playerVisual.setHandMode('hook');
    this.pendingTarget = null;
    this.previewMesh.visible = false;
    this.sharkBeaconRing.visible = false;
    this.roofCutaway = false;

    this.shark = {
      behavior: 'circling',
      hp: 100,
      maxHp: 100,
      angle: 0.4,
      radius: 9.5,
      x: 9.5,
      z: 0,
      targetTileKey: null,
      cycleTimer: 22,
      warningTimer: 0,
      warningDuration: 6.5,
      biteCooldown: 0,
      repelledTimer: 0,
      hitFlash: 0,
      isFrenzy: false,
    };

    this.stats = {
      resourcesCollected: 0,
      tilesBuilt: 0,
      buildingsConstructed: 0,
      housePartsBuilt: 0,
      furniturePlaced: 0,
      sharksRepelled: 0,
      foodHarvested: 0,
      waterCollected: 0,
      daysSurvived: 0,
    };
    this.dailyCounters = {
      resourcesCollectedToday: 0,
      builtToday: 0,
      sharksRepelledToday: 0,
      damageTakenToday: 0,
    };
    this.dailyReport = null;
    this.gameOverReason = '';
  }

  private syncOceanFootprints(): void {
    const centers: Array<{ x: number; z: number }> = [];
    for (const tile of this.tiles.values()) {
      if (tile.data.status !== 'broken') {
        centers.push({
          x: tile.data.gx * TILE_SIZE,
          z: tile.data.gz * TILE_SIZE,
        });
      }
    }
    this.ocean.setRaftFootprints(centers, TILE_SIZE);
  }

  private createRaftTile(gx: number, gz: number): TileRuntime {
    const key = tileKey(gx, gz);
    const visual = createRaftTileVisual(this.mats, gx * 13 + gz * 7);
    visual.group.position.set(gx * TILE_SIZE, 0.14, gz * TILE_SIZE);
    this.raftGroup.add(visual.group);

    const data: RaftTile = {
      key,
      gx,
      gz,
      hp: 100,
      maxHp: 100,
      status: 'intact',
      reinforced: false,
      hasHouseFloor: false,
      hasRoof: false,
      building: null,
      furniture: null,
      rug: null,
    };

    const rt: TileRuntime = {
      data,
      visual,
      buildingVisual: null,
      houseFloorGroup: null,
      houseRoofVisual: null,
      furnitureVisual: null,
      rugVisual: null,
    };
    this.tiles.set(key, rt);
    return rt;
  }

  private spawnFloatingItem(type?: ResourceType, customX?: number, customZ?: number): void {
    const chosen: ResourceType =
      type ??
      (() => {
        const r = Math.random();
        if (r < 0.45) return 'wood';
        if (r < 0.72) return 'plastic';
        if (r < 0.87) return 'metal';
        return 'food';
      })();

    const angle = Math.random() * Math.PI * 2;
    const dist = 12 + Math.random() * 7;
    const x = customX ?? Math.cos(angle) * dist;
    const z = customZ ?? Math.sin(angle) * dist;

    const mesh = createFloatingItemVisual(chosen, this.mats);
    mesh.position.set(x, 0, z);
    this.floatingGroup.add(mesh);

    this.floatingItems.push({
      id: this.nextEntityId++,
      type: chosen,
      amount: chosen === 'wood' ? 2 : 1,
      mesh,
      x,
      z,
      vx: -x * 0.025 + (Math.random() - 0.5) * 0.25,
      vz: -z * 0.025 + (Math.random() - 0.5) * 0.25,
      bobOffset: Math.random() * Math.PI * 2,
      hooked: false,
    });
  }

  // ========== PUBLIC CONTROLS ==========

  public startNewGame(): void {
    soundEngine.startOceanAmbience();
    this.resetWorldToStarterRaft();
    this.phase = 'playing';
    this.pushToast('海上漂流开启！点击海面可见漂浮物资即可用抓钩拉回。', 'info');
    this.emitHud();
  }

  public continueNextDay(): void {
    if (this.phase !== 'day_summary') return;
    this.day += 1;
    this.dayTime = 6;
    this.weather = this.nextWeather;
    const roll = Math.random();
    this.nextWeather = roll < 0.46 ? 'clear' : roll < 0.78 ? 'overcast' : 'storm';
    this.dailyCounters = {
      resourcesCollectedToday: 0,
      builtToday: 0,
      sharksRepelledToday: 0,
      damageTakenToday: 0,
    };
    this.dailyReport = null;
    this.phase = 'playing';
    this.pushToast(`第 ${this.day} 天黎明到来，当前天气：${this.weather === 'storm' ? '暴风雨' : this.weather === 'overcast' ? '阴云' : '晴朗'}`, 'info');
    this.emitHud();
  }

  public togglePause(): void {
    this.cancelHoldAction();
    if (this.phase === 'playing') {
      this.phase = 'paused';
      this.emitHud();
    } else if (this.phase === 'paused') {
      this.phase = 'playing';
      this.emitHud();
    }
  }

  public setVirtualMove(mx: number, mz: number): void {
    this.virtualMove.x = THREE.MathUtils.clamp(mx, -1, 1);
    this.virtualMove.z = THREE.MathUtils.clamp(mz, -1, 1);
  }

  public adjustCameraZoom(delta: number): void {
    this.cameraDistance = THREE.MathUtils.clamp(this.cameraDistance + delta, 10, 26);
  }

  public rotatePlacement(): void {
    this.rotation = ((this.rotation + 1) % 4) as RotationDir;
    if (this.pendingTarget) {
      this.previewToolAtWorld(this.pendingTarget.worldX, this.pendingTarget.worldZ);
    }
    this.emitHud();
  }

  public toggleRoofCutaway(): void {
    this.roofCutaway = !this.roofCutaway;
    this.updateRoofVisibility();
    this.emitHud();
  }

  public toggleMute(): void {
    soundEngine.toggleMute();
    this.emitHud();
  }

  public setSelectedTool(tool: InteractionTool): void {
    this.selectedTool = tool;
    this.pendingTarget = null;
    this.previewMesh.visible = false;

    if (tool === 'repair') {
      this.playerVisual.setHandMode('repair');
    } else if (tool !== null) {
      this.playerVisual.setHandMode('build');
    } else {
      this.playerVisual.setHandMode('hook');
    }

    if (tool && tool !== 'repair' && tool !== 'demolish') {
      const def = BUILD_ITEMS[tool];
      if (def.placementKind === 'sea_floor') {
        const bestSea = this.findNearestSeaSlotToPlayer();
        if (bestSea) {
          this.previewToolAtWorld(bestSea.gx * TILE_SIZE, bestSea.gz * TILE_SIZE);
        } else {
          this.previewToolAtWorld(this.playerPos.x, this.playerPos.z);
        }
      } else {
        this.previewToolAtWorld(this.playerPos.x, this.playerPos.z);
      }
    }

    this.emitHud();
  }

  private findNearestSeaSlotToPlayer(): { gx: number; gz: number } | null {
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    let best: { gx: number; gz: number } | null = null;
    let bestDist = Infinity;

    for (const tile of this.tiles.values()) {
      if (tile.data.status === 'broken') continue;
      for (const [dx, dz] of dirs) {
        const nx = tile.data.gx + dx;
        const nz = tile.data.gz + dz;
        if (this.tiles.has(tileKey(nx, nz))) continue;
        const wx = nx * TILE_SIZE;
        const wz = nz * TILE_SIZE;
        const d = Math.hypot(wx - this.playerPos.x, wz - this.playerPos.z);
        if (d < bestDist) {
          bestDist = d;
          best = { gx: nx, gz: nz };
        }
      }
    }
    return best;
  }

  private previewToolAtWorld(wx: number, wz: number): void {
    if (!this.selectedTool || this.selectedTool === 'repair' || this.selectedTool === 'demolish') {
      this.pendingTarget = null;
      this.previewMesh.visible = false;
      return;
    }

    const def = BUILD_ITEMS[this.selectedTool];
    const gx = Math.round(wx / TILE_SIZE);
    const gz = Math.round(wz / TILE_SIZE);

    if (def.placementKind === 'sea_floor') {
      const key = tileKey(gx, gz);
      const existing = this.tiles.get(key);
      if (existing && existing.data.status !== 'broken') {
        this.setPending(false, '该位置已有木筏地板，请选择木筏边缘空白海面', gx, gz, undefined, gx * TILE_SIZE, gz * TILE_SIZE);
        return;
      }
      const hasNeighbor = [
        tileKey(gx + 1, gz),
        tileKey(gx - 1, gz),
        tileKey(gx, gz + 1),
        tileKey(gx, gz - 1),
      ].some((k) => {
        const n = this.tiles.get(k);
        return n && n.data.status !== 'broken';
      });
      if (!hasNeighbor) {
        this.setPending(false, '必须紧邻已有木筏地板的边缘扩建', gx, gz, undefined, gx * TILE_SIZE, gz * TILE_SIZE);
        return;
      }
      this.setPending(true, '可扩建木筏地板（确认后消耗材料）', gx, gz, undefined, gx * TILE_SIZE, gz * TILE_SIZE);
      return;
    }

    if (def.placementKind === 'edge_wall' || def.placementKind === 'wall_decor') {
      const targetEdge = this.findClosestEdgeNearWorld(wx, wz, def.placementKind === 'wall_decor');
      if (!targetEdge) {
        this.setPending(
          false,
          def.placementKind === 'wall_decor' ? '请靠近或点击已建造的木墙' : '请点击木筏地板边缘以放置墙体/门窗',
          gx,
          gz,
          undefined,
          wx,
          wz,
        );
        return;
      }

      const ewKey = edgeKey(targetEdge.axis, targetEdge.gx, targetEdge.gz);
      const existingWall = this.edgeWalls.get(ewKey);

      if (def.placementKind === 'wall_decor') {
        if (!existingWall || existingWall.data.type !== 'wall') {
          this.setPending(false, '墙面挂饰只能安装在【木墙】上', targetEdge.gx, targetEdge.gz, targetEdge.axis, targetEdge.wx, targetEdge.wz);
          return;
        }
        if (existingWall.data.hasDecor) {
          this.setPending(false, '这面墙已经安装过挂饰了', targetEdge.gx, targetEdge.gz, targetEdge.axis, targetEdge.wx, targetEdge.wz);
          return;
        }
        this.setPending(true, '可挂装墙面救生圈饰品', targetEdge.gx, targetEdge.gz, targetEdge.axis, targetEdge.wx, targetEdge.wz);
        return;
      }

      if (existingWall) {
        this.setPending(false, '该边缘已有墙体/门窗', targetEdge.gx, targetEdge.gz, targetEdge.axis, targetEdge.wx, targetEdge.wz);
        return;
      }
      this.setPending(true, `可在此边缘建造${def.name}`, targetEdge.gx, targetEdge.gz, targetEdge.axis, targetEdge.wx, targetEdge.wz);
      return;
    }

    // Tile-based placements
    const tile = this.tiles.get(tileKey(gx, gz));
    const centerX = gx * TILE_SIZE;
    const centerZ = gz * TILE_SIZE;

    if (!tile || tile.data.status === 'broken') {
      this.setPending(false, '请先扩建木筏地板再建造', gx, gz, undefined, centerX, centerZ);
      return;
    }
    if (tile.data.status === 'damaged') {
      this.setPending(false, '木筏受损严重，请先修复该地板', gx, gz, undefined, centerX, centerZ);
      return;
    }

    if (def.placementKind === 'tile_upgrade') {
      if (tile.data.reinforced) {
        this.setPending(false, '该地板已经加固过边缘', gx, gz, undefined, centerX, centerZ);
        return;
      }
      this.setPending(true, '可加固此木筏边缘', gx, gz, undefined, centerX, centerZ);
      return;
    }

    if (def.placementKind === 'house_floor') {
      if (tile.data.hasHouseFloor) {
        this.setPending(false, '这里已经铺设了室内地板', gx, gz, undefined, centerX, centerZ);
        return;
      }
      this.setPending(true, '可铺设室内木地板', gx, gz, undefined, centerX, centerZ);
      return;
    }

    if (def.placementKind === 'house_roof') {
      if (tile.data.hasRoof) {
        this.setPending(false, '这里已经有屋顶了', gx, gz, undefined, centerX, centerZ);
        return;
      }
      if (!tile.data.hasHouseFloor) {
        this.setPending(false, '需要先铺设【室内地板】才可搭建屋顶', gx, gz, undefined, centerX, centerZ);
        return;
      }
      this.setPending(true, '可在此上方搭建瓦片屋顶', gx, gz, undefined, centerX, centerZ);
      return;
    }

    if (def.placementKind === 'facility') {
      if (def.lateGameUnlock) {
        const gate = this.getCollectorUnlockState();
        if (!gate.unlocked) {
          this.setPending(false, gate.reason, gx, gz, undefined, centerX, centerZ);
          return;
        }
      }
      if (def.requiresWorkbench && !this.hasWorkbench()) {
        this.setPending(false, '需要先建造【工作台】才能解锁该设施', gx, gz, undefined, centerX, centerZ);
        return;
      }
      if (tile.data.building || tile.data.furniture) {
        this.setPending(false, '该地板已被设施或家具占用', gx, gz, undefined, centerX, centerZ);
        return;
      }
      this.setPending(true, `可建造${def.name}（确认后扣除材料）`, gx, gz, undefined, centerX, centerZ);
      return;
    }

    if (def.placementKind === 'furniture') {
      if (def.id === 'rug') {
        if (tile.data.rug !== null) {
          this.setPending(false, '这块地板已经铺过地毯了', gx, gz, undefined, centerX, centerZ);
          return;
        }
        this.setPending(true, '可铺设编织地毯（不阻碍行走）', gx, gz, undefined, centerX, centerZ);
        return;
      }
      if (tile.data.building || tile.data.furniture) {
        this.setPending(false, '该地板已被其他设施或家具占用', gx, gz, undefined, centerX, centerZ);
        return;
      }
      this.setPending(true, `可摆放${def.name}`, gx, gz, undefined, centerX, centerZ);
    }
  }

  private findClosestEdgeNearWorld(
    wx: number,
    wz: number,
    preferExistingWall: boolean,
  ): { axis: EdgeAxis; gx: number; gz: number; wx: number; wz: number } | null {
    const candidates: Array<{ axis: EdgeAxis; gx: number; gz: number; wx: number; wz: number }> = [];
    const seen = new Set<string>();

    for (const tile of this.tiles.values()) {
      if (tile.data.status === 'broken') continue;
      const { gx, gz } = tile.data;
      const edges: Array<{ axis: EdgeAxis; ex: number; ez: number }> = [
        { axis: 'H', ex: gx, ez: gz },
        { axis: 'H', ex: gx, ez: gz + 1 },
        { axis: 'V', ex: gx, ez: gz },
        { axis: 'V', ex: gx + 1, ez: gz },
      ];
      for (const e of edges) {
        const k = edgeKey(e.axis, e.ex, e.ez);
        if (seen.has(k)) continue;
        seen.add(k);
        const wc = edgeWorldCenter(e.axis, e.ex, e.ez);
        candidates.push({ axis: e.axis, gx: e.ex, gz: e.ez, wx: wc.x, wz: wc.z });
      }
    }

    let best: { axis: EdgeAxis; gx: number; gz: number; wx: number; wz: number } | null = null;
    let bestScore = Infinity;

    for (const c of candidates) {
      let d = Math.hypot(c.wx - wx, c.wz - wz);
      if (preferExistingWall) {
        const wall = this.edgeWalls.get(edgeKey(c.axis, c.gx, c.gz));
        if (!wall || wall.data.type !== 'wall') continue;
      } else {
        // Slightly prefer rotation orientation if distances are close
        if ((this.rotation % 2 === 0 && c.axis === 'H') || (this.rotation % 2 === 1 && c.axis === 'V')) {
          d *= 0.92;
        }
      }
      if (d < bestScore && d < TILE_SIZE * 1.45) {
        bestScore = d;
        best = c;
      }
    }
    return best;
  }

  private setPending(
    valid: boolean,
    reason: string,
    gx: number,
    gz: number,
    axis: EdgeAxis | undefined,
    worldX: number,
    worldZ: number,
  ): void {
    this.pendingTarget = { valid, reason, gx, gz, axis, worldX, worldZ };
    this.previewMesh.visible = true;
    const mat = this.previewMesh.material as THREE.MeshBasicMaterial;
    mat.color.setHex(valid ? 0x22c55e : 0xef4444);

    if (axis) {
      this.previewMesh.scale.set(axis === 'H' ? 0.95 : 0.14, 4.2, axis === 'H' ? 0.14 : 0.95);
      this.previewMesh.position.set(worldX, 0.72, worldZ);
    } else {
      this.previewMesh.scale.set(1, 1, 1);
      this.previewMesh.position.set(worldX, 0.25, worldZ);
    }
  }

  public confirmPendingPlacement(): void {
    if (this.phase !== 'playing') return;
    if (!this.selectedTool || this.selectedTool === 'repair' || this.selectedTool === 'demolish') {
      return;
    }
    const def = BUILD_ITEMS[this.selectedTool];
    if (!this.pendingTarget) {
      this.previewToolAtWorld(this.playerPos.x, this.playerPos.z);
    }
    if (!this.pendingTarget || !this.pendingTarget.valid) {
      this.pushToast(this.pendingTarget?.reason || '请选择有效建造位置', 'warning');
      return;
    }
    if (def.lateGameUnlock) {
      const gate = this.getCollectorUnlockState();
      if (!gate.unlocked) {
        this.pushToast(gate.reason, 'warning');
        return;
      }
    }
    if (def.requiresWorkbench && !this.hasWorkbench()) {
      this.pushToast('需要先行建造【工作台】才可解锁此设施', 'warning');
      return;
    }
    if (!this.hasEnoughResources(def.cost)) {
      this.pushToast('材料不足，请继续打捞海上资源', 'warning');
      return;
    }

    // Deduct materials strictly upon confirmation
    this.spendResources(def.cost);

    const { gx, gz, axis, worldX, worldZ } = this.pendingTarget;

    if (def.placementKind === 'sea_floor') {
      const existing = this.tiles.get(tileKey(gx, gz));
      if (existing) {
        existing.data.status = 'intact';
        existing.data.hp = existing.data.maxHp;
        existing.visual.setStatus('intact');
      } else {
        this.createRaftTile(gx, gz);
      }
      this.syncOceanFootprints();
      this.stats.tilesBuilt += 1;
      this.dailyCounters.builtToday += 1;
      this.addPopup3D('+木筏地板', 'wood', worldX, 0.8, worldZ);
    } else if (def.placementKind === 'edge_wall' && axis) {
      const ewKey = edgeKey(axis, gx, gz);
      const wallType = def.id as 'wall' | 'door' | 'window';
      const visual = createEdgeWallVisual(wallType, this.mats);
      visual.group.position.set(worldX, 0, worldZ);
      visual.group.rotation.y = axis === 'H' ? 0 : Math.PI / 2;
      this.raftGroup.add(visual.group);
      this.edgeWalls.set(ewKey, {
        data: { key: ewKey, axis, gx, gz, type: wallType, hasDecor: false, doorOpen: 0 },
        visual,
      });
      this.stats.housePartsBuilt += 1;
      this.dailyCounters.builtToday += 1;
      this.addPopup3D(`+${def.name}`, 'info', worldX, 1.3, worldZ);
    } else if (def.placementKind === 'wall_decor' && axis) {
      const ew = this.edgeWalls.get(edgeKey(axis, gx, gz));
      if (ew) {
        ew.data.hasDecor = true;
        ew.visual.setHasDecor(true);
        this.stats.furniturePlaced += 1;
        this.dailyCounters.builtToday += 1;
        this.addPopup3D('+墙面挂饰', 'info', worldX, 1.3, worldZ);
      }
    } else {
      const tile = this.tiles.get(tileKey(gx, gz));
      if (tile) {
        if (def.placementKind === 'tile_upgrade') {
          tile.data.reinforced = true;
          tile.data.maxHp = 180;
          tile.data.hp = 180;
          tile.visual.setReinforced(true);
          this.stats.tilesBuilt += 1;
          this.dailyCounters.builtToday += 1;
          this.addPopup3D('边缘已加固', 'metal', worldX, 0.9, worldZ);
        } else if (def.placementKind === 'house_floor') {
          tile.data.hasHouseFloor = true;
          const hf = createHouseFloorVisual(this.mats);
          hf.position.set(worldX, 0, worldZ);
          this.raftGroup.add(hf);
          tile.houseFloorGroup = hf;
          this.stats.housePartsBuilt += 1;
          this.dailyCounters.builtToday += 1;
          this.addPopup3D('+室内地板', 'wood', worldX, 0.8, worldZ);
        } else if (def.placementKind === 'house_roof') {
          tile.data.hasRoof = true;
          const roof = createHouseRoofVisual(this.mats);
          roof.group.position.set(worldX, 0, worldZ);
          this.raftGroup.add(roof.group);
          tile.houseRoofVisual = roof;
          this.stats.housePartsBuilt += 1;
          this.dailyCounters.builtToday += 1;
          this.updateRoofVisibility();
          this.addPopup3D('+木屋顶', 'info', worldX, 1.8, worldZ);
        } else if (def.placementKind === 'facility') {
          const fType = def.id as FacilityType;
          const bVisual = createBuildingVisual(fType, this.mats);
          bVisual.group.position.set(worldX, 0, worldZ);
          this.raftGroup.add(bVisual.group);
          tile.buildingVisual = bVisual;
          tile.data.building = {
            type: fType,
            hp: 100,
            maxHp: 100,
            progress: 0,
            storedOutput: 0,
            cooldown: 0,
          };
          this.stats.buildingsConstructed += 1;
          this.dailyCounters.builtToday += 1;
          this.addPopup3D(`+${def.name}`, 'info', worldX, 1.2, worldZ);
        } else if (def.placementKind === 'furniture') {
          if (def.id === 'rug') {
            tile.data.rug = this.rotation;
            const rv = createFurnitureVisual('rug', this.mats);
            rv.group.position.set(worldX, 0, worldZ);
            rv.group.rotation.y = this.rotation * (Math.PI / 2);
            this.raftGroup.add(rv.group);
            tile.rugVisual = rv;
          } else {
            const furnType = def.id as Exclude<FurnitureType, 'wall_decor'>;
            tile.data.furniture = { type: furnType, rotation: this.rotation };
            const fv = createFurnitureVisual(furnType, this.mats);
            fv.group.position.set(worldX, 0, worldZ);
            fv.group.rotation.y = this.rotation * (Math.PI / 2);
            this.raftGroup.add(fv.group);
            tile.furnitureVisual = fv;
          }
          this.stats.furniturePlaced += 1;
          this.dailyCounters.builtToday += 1;
          this.addPopup3D(`+${def.name}`, 'info', worldX, 1.1, worldZ);
        }
      }
    }

    soundEngine.playBuild();
    this.updateStageProgression();

    // Refresh preview at current spot
    if (def.placementKind === 'sea_floor') {
      const nextSea = this.findNearestSeaSlotToPlayer();
      if (nextSea) {
        this.previewToolAtWorld(nextSea.gx * TILE_SIZE, nextSea.gz * TILE_SIZE);
      } else {
        this.previewToolAtWorld(worldX, worldZ);
      }
    } else {
      this.previewToolAtWorld(worldX, worldZ);
    }
    this.emitHud();
  }

  private tryRepairAtWorld(wx: number, wz: number): void {
    const cost = this.hasRepairStation() ? 1 : 2;
    if (this.resources.wood < cost) {
      this.pushToast(`修复地板需要 ${cost} 木材`, 'warning');
      return;
    }

    const gx = Math.round(wx / TILE_SIZE);
    const gz = Math.round(wz / TILE_SIZE);
    const tile = this.tiles.get(tileKey(gx, gz));
    if (!tile || tile.data.status === 'intact') {
      this.triggerRepairNearby();
      return;
    }

    const wasBroken = tile.data.status === 'broken';
    this.resources.wood -= cost;
    tile.data.hp = tile.data.maxHp;
    tile.data.status = 'intact';
    tile.visual.setStatus('intact');
    if (wasBroken) {
      this.syncOceanFootprints();
    }
    soundEngine.playRepair();
    this.addPopup3D('已修复 +HP', 'heal', gx * TILE_SIZE, 0.8, gz * TILE_SIZE);
    this.emitHud();
  }

  private clearTileAttachments(tile: TileRuntime, refund: boolean): void {
    if (tile.furnitureVisual) {
      this.raftGroup.remove(tile.furnitureVisual.group);
      tile.furnitureVisual = null;
    }
    if (tile.data.furniture) {
      tile.data.furniture = null;
      if (refund) this.addResource('wood', 1);
    }

    if (tile.buildingVisual) {
      this.raftGroup.remove(tile.buildingVisual.group);
      tile.buildingVisual = null;
    }
    if (tile.data.building) {
      tile.data.building = null;
      if (refund) this.addResource('wood', 2);
    }

    if (tile.houseRoofVisual) {
      this.raftGroup.remove(tile.houseRoofVisual.group);
      tile.houseRoofVisual = null;
    }
    if (tile.data.hasRoof) {
      tile.data.hasRoof = false;
      if (refund) this.addResource('wood', 1);
    }

    if (tile.houseFloorGroup) {
      this.raftGroup.remove(tile.houseFloorGroup);
      tile.houseFloorGroup = null;
    }
    if (tile.data.hasHouseFloor) {
      tile.data.hasHouseFloor = false;
      if (refund) this.addResource('wood', 1);
    }

    if (tile.rugVisual) {
      this.raftGroup.remove(tile.rugVisual.group);
      tile.rugVisual = null;
    }
    if (tile.data.rug !== null) {
      tile.data.rug = null;
      if (refund) this.addResource('plastic', 1);
    }
  }

  private cleanupOrphanedEdgeWalls(refund: boolean): void {
    for (const [k, ew] of this.edgeWalls.entries()) {
      const { axis, gx, gz } = ew.data;
      const tA = this.tiles.get(tileKey(gx, gz));
      const tB =
        axis === 'H'
          ? this.tiles.get(tileKey(gx, gz - 1))
          : this.tiles.get(tileKey(gx - 1, gz));
      const hasSupport =
        (tA && tA.data.status !== 'broken') || (tB && tB.data.status !== 'broken');
      if (!hasSupport) {
        this.raftGroup.remove(ew.visual.group);
        this.edgeWalls.delete(k);
        if (refund) this.addResource('wood', 1);
      }
    }
  }

  private destroyTileAndAttachments(
    tile: TileRuntime,
    removeTileEntry: boolean,
    refund: boolean,
  ): void {
    this.clearTileAttachments(tile, refund);

    if (removeTileEntry) {
      this.raftGroup.remove(tile.visual.group);
      this.tiles.delete(tile.data.key);
      if (refund) this.addResource('wood', 2);
    } else {
      tile.data.status = 'broken';
      tile.data.reinforced = false;
      tile.visual.setReinforced(false);
      tile.visual.setStatus('broken');
    }

    this.cleanupOrphanedEdgeWalls(refund);
    this.syncOceanFootprints();
  }

  private isDescendantOf(obj: THREE.Object3D, ancestor: THREE.Object3D): boolean {
    let cur: THREE.Object3D | null = obj;
    while (cur) {
      if (cur === ancestor) return true;
      cur = cur.parent;
    }
    return false;
  }

  private tryDemolishAtWorld(
    wx: number,
    wz: number,
    clientX?: number,
    clientY?: number,
  ): boolean {
    // 1. Raycast 3D attachments first so clicking directly on a wall/roof/furniture/facility
    //    or directly on a plank behaves with true Raft precision
    if (clientX !== undefined && clientY !== undefined) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      _rayMouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _rayMouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(_rayMouse, this.camera);
      const hits = this.raycaster.intersectObject(this.raftGroup, true);
      if (hits.length > 0) {
        const hitObj = hits[0].object;

        for (const [k, ew] of this.edgeWalls.entries()) {
          if (this.isDescendantOf(hitObj, ew.visual.group)) {
            this.raftGroup.remove(ew.visual.group);
            this.edgeWalls.delete(k);
            this.addResource('wood', 1);
            soundEngine.playBuild();
            this.addPopup3D('已拆除墙体 +1木', 'wood', wx, 1.1, wz);
            this.emitHud();
            return true;
          }
        }

        for (const tile of this.tiles.values()) {
          if (tile.data.status === 'broken') continue;
          if (tile.houseRoofVisual && this.isDescendantOf(hitObj, tile.houseRoofVisual.group)) {
            this.raftGroup.remove(tile.houseRoofVisual.group);
            tile.houseRoofVisual = null;
            tile.data.hasRoof = false;
            this.addResource('wood', 1);
            soundEngine.playBuild();
            this.addPopup3D('已拆除屋顶 +1木', 'wood', wx, 1.3, wz);
            this.emitHud();
            return true;
          }
          if (tile.furnitureVisual && this.isDescendantOf(hitObj, tile.furnitureVisual.group)) {
            this.raftGroup.remove(tile.furnitureVisual.group);
            tile.furnitureVisual = null;
            tile.data.furniture = null;
            this.addResource('wood', 1);
            soundEngine.playBuild();
            this.addPopup3D('已拆除家具 +1木', 'wood', wx, 0.9, wz);
            this.emitHud();
            return true;
          }
          if (tile.buildingVisual && this.isDescendantOf(hitObj, tile.buildingVisual.group)) {
            this.raftGroup.remove(tile.buildingVisual.group);
            tile.buildingVisual = null;
            tile.data.building = null;
            this.addResource('wood', 2);
            soundEngine.playBuild();
            this.addPopup3D('已拆除设施 +2木', 'wood', wx, 0.9, wz);
            this.emitHud();
            return true;
          }
          if (
            this.isDescendantOf(hitObj, tile.visual.group) ||
            (tile.houseFloorGroup && this.isDescendantOf(hitObj, tile.houseFloorGroup))
          ) {
            if (this.countActiveTiles() <= 1) {
              this.pushToast('最后一块基础木板无法拆除', 'warning');
              return true;
            }
            const hadAttachments = Boolean(
              tile.data.furniture ||
                tile.data.building ||
                tile.data.hasRoof ||
                tile.data.hasHouseFloor ||
                tile.data.rug !== null,
            );
            this.destroyTileAndAttachments(tile, true, true);
            soundEngine.playBuild();
            this.addPopup3D(
              hadAttachments ? '木板及上方物件已拆除' : '已拆除木板 +2木',
              'wood',
              tile.data.gx * TILE_SIZE,
              0.9,
              tile.data.gz * TILE_SIZE,
            );
            this.emitHud();
            return true;
          }
        }
      }
    }

    // 2. Grid fallback
    const gx = Math.round(wx / TILE_SIZE);
    const gz = Math.round(wz / TILE_SIZE);
    const tile = this.tiles.get(tileKey(gx, gz));

    if (tile && tile.data.status !== 'broken') {
      if (this.countActiveTiles() <= 1) {
        if (tile.data.furniture || tile.data.building) {
          this.clearTileAttachments(tile, true);
          soundEngine.playBuild();
          this.addPopup3D('已清理上方家具设施', 'wood', gx * TILE_SIZE, 0.9, gz * TILE_SIZE);
          this.emitHud();
          return true;
        }
        this.pushToast('最后一块基础木板无法拆除', 'warning');
        return true;
      }
      const hadAttachments = Boolean(
        tile.data.furniture ||
          tile.data.building ||
          tile.data.hasRoof ||
          tile.data.hasHouseFloor ||
          tile.data.rug !== null,
      );
      this.destroyTileAndAttachments(tile, true, true);
      soundEngine.playBuild();
      this.addPopup3D(
        hadAttachments ? '木板及上方物件已拆除' : '已拆除木板 +2木',
        'wood',
        gx * TILE_SIZE,
        0.9,
        gz * TILE_SIZE,
      );
      this.emitHud();
      return true;
    }

    // 3. Closest edge wall fallback
    let closestWall: EdgeWallRuntime | null = null;
    let bestD = 1.1;
    for (const ew of this.edgeWalls.values()) {
      const wc = edgeWorldCenter(ew.data.axis, ew.data.gx, ew.data.gz);
      const d = Math.hypot(wc.x - wx, wc.z - wz);
      if (d < bestD) {
        bestD = d;
        closestWall = ew;
      }
    }
    if (closestWall) {
      this.raftGroup.remove(closestWall.visual.group);
      this.edgeWalls.delete(closestWall.data.key);
      this.addResource('wood', 1);
      soundEngine.playBuild();
      this.emitHud();
      return true;
    }
    return false;
  }

  public consumeFood(): void {
    if (this.phase !== 'playing') return;
    if (this.resources.food <= 0) {
      this.pushToast('没有食物了，请先打捞或收获菜园', 'warning');
      return;
    }
    this.resources.food -= 1;
    const bonus = this.hasTableBuff() ? 1.25 : 1;
    this.survival.hunger = Math.min(100, this.survival.hunger + Math.round(32 * bonus));
    this.survival.health = Math.min(100, this.survival.health + Math.round(6 * bonus));
    soundEngine.playConsume();
    this.addPopup3D(`+${Math.round(32 * bonus)} 饱食`, 'food', this.playerPos.x, 1.5, this.playerPos.z);
    this.emitHud();
  }

  public consumeWater(): void {
    if (this.phase !== 'playing') return;
    if (this.resources.water <= 0) {
      this.pushToast('没有饮水了，请建造净水器蒸馏海水', 'warning');
      return;
    }
    this.resources.water -= 1;
    const bonus = this.hasTableBuff() ? 1.25 : 1;
    this.survival.thirst = Math.min(100, this.survival.thirst + Math.round(36 * bonus));
    soundEngine.playConsume();
    this.addPopup3D(`+${Math.round(36 * bonus)} 水分`, 'water', this.playerPos.x, 1.5, this.playerPos.z);
    this.emitHud();
  }

  public restInBed(): void {
    if (this.phase !== 'playing') return;
    if (!this.isPlayerNearBed()) {
      this.pushToast('请靠近木床后再休息', 'warning');
      return;
    }
    const tod = this.getTimeOfDay();
    if (tod === 'evening' || tod === 'night') {
      this.survival.health = Math.min(100, this.survival.health + 28);
      soundEngine.playConsume();
      this.completeDaySummary();
      return;
    }
    if (this.bedRestCooldown > 0) {
      this.pushToast('刚休息过，稍后再小憩', 'info');
      return;
    }
    this.bedRestCooldown = 14;
    this.survival.health = Math.min(100, this.survival.health + 18);
    soundEngine.playConsume();
    this.addPopup3D('+18 生命值', 'heal', this.playerPos.x, 1.5, this.playerPos.z);
    this.emitHud();
  }

  public triggerHarvestNearby(): void {
    if (this.phase !== 'playing') return;
    let bestTile: TileRuntime | null = null;
    let bestDist = 4.2;
    for (const tile of this.tiles.values()) {
      if (!tile.data.building || tile.data.building.storedOutput <= 0) continue;
      const d = Math.hypot(
        tile.data.gx * TILE_SIZE - this.playerPos.x,
        tile.data.gz * TILE_SIZE - this.playerPos.z,
      );
      if (d < bestDist) {
        bestDist = d;
        bestTile = tile;
      }
    }
    if (bestTile) {
      this.harvestTileBuilding(bestTile);
    }
  }

  private harvestTileBuilding(tile: TileRuntime): void {
    const b = tile.data.building;
    if (!b || b.storedOutput <= 0) return;

    if (b.type === 'purifier') {
      const gained = this.addResource('water', b.storedOutput);
      b.storedOutput -= gained;
      if (gained > 0) {
        this.stats.waterCollected += gained;
        soundEngine.playCollect();
        this.addPopup3D(`+${gained} 净水`, 'water', tile.data.gx * TILE_SIZE, 1.2, tile.data.gz * TILE_SIZE);
      }
    } else if (b.type === 'garden') {
      const gained = this.addResource('food', b.storedOutput);
      b.storedOutput -= gained;
      if (gained > 0) {
        this.stats.foodHarvested += gained;
        soundEngine.playCollect();
        this.addPopup3D(`+${gained} 食物`, 'food', tile.data.gx * TILE_SIZE, 1.2, tile.data.gz * TILE_SIZE);
      }
    }
    this.updateStageProgression();
    this.emitHud();
  }

  public triggerStrikeShark(): void {
    if (this.phase !== 'playing') return;
    if (this.shark.behavior === 'repelled') {
      this.pushToast('鲨鱼已被驱离，暂时在远海恢复', 'info');
      return;
    }
    const now = performance.now();
    if (now - this.lastStrikeMs < 220) return;
    this.lastStrikeMs = now;

    const sharkDist = Math.hypot(this.shark.x - this.playerPos.x, this.shark.z - this.playerPos.z);
    if (
      this.shark.behavior !== 'warning' &&
      this.shark.behavior !== 'attacking' &&
      sharkDist > 10.5
    ) {
      this.pushToast('鲨鱼正在外海游弋，等它靠近木筏时点击驱赶', 'info');
      return;
    }

    this.playerYaw = Math.atan2(this.shark.x - this.playerPos.x, this.shark.z - this.playerPos.z);
    this.playerVisual.setHandMode('spear');
    this.spearHoldTimer = 0.55;
    this.playerVisual.triggerSpearThrust();
    this.damageShark(30);
  }

  public startHoldAction(kind: HoldActionKind, source: 'ui' | 'key' | 'canvas' = 'ui'): void {
    if (this.phase !== 'playing') return;

    const ctx = this.computeContextHints();
    if (kind === 'repair') {
      if (!ctx.canRepairNearby) {
        this.pushToast('当前没有受损木筏需要维修', 'info');
        return;
      }
      const cost = this.hasRepairStation() ? 1 : 2;
      if (this.resources.wood < cost) {
        this.pushToast(`维修需要 ${cost} 木材`, 'warning');
        return;
      }
    }
    if (kind === 'harvest' && !ctx.canHarvestNearby) return;
    if (kind === 'rest' && !ctx.canRestBed) return;

    this.holdState = {
      kind,
      elapsed: 0,
      duration: HOLD_DURATIONS[kind],
      source,
    };
    if (kind === 'repair') {
      this.playerVisual.setHandMode('repair');
    }
    this.emitHud();
  }

  public cancelHoldAction(kind?: HoldActionKind): void {
    if (!this.holdState) return;
    if (kind && this.holdState.kind !== kind) return;
    this.holdState = null;
    if (this.selectedTool === 'repair') {
      this.playerVisual.setHandMode('repair');
    } else if (this.selectedTool !== null) {
      this.playerVisual.setHandMode('build');
    } else {
      this.playerVisual.setHandMode('hook');
    }
    this.emitHud();
  }

  private completeHoldAction(kind: HoldActionKind): void {
    if (kind === 'repair') {
      this.triggerRepairNearby();
      this.cancelHoldAction();
      return;
    }
    if (kind === 'harvest') {
      this.triggerHarvestNearby();
      this.cancelHoldAction();
      return;
    }
    if (kind === 'rest') {
      this.restInBed();
      this.cancelHoldAction();
    }
  }

  public triggerRepairNearby(): void {
    if (this.phase !== 'playing') return;
    const cost = this.hasRepairStation() ? 1 : 2;
    if (this.resources.wood < cost) {
      this.pushToast(`需要 ${cost} 木材修复木筏`, 'warning');
      return;
    }
    let best: TileRuntime | null = null;
    let bestD = Infinity;
    for (const tile of this.tiles.values()) {
      if (tile.data.status === 'intact') continue;
      const d = Math.hypot(
        tile.data.gx * TILE_SIZE - this.playerPos.x,
        tile.data.gz * TILE_SIZE - this.playerPos.z,
      );
      if (d < bestD) {
        bestD = d;
        best = tile;
      }
    }
    if (!best) {
      this.pushToast('当前没有受损木筏需要修复', 'info');
      return;
    }
    const wasBroken = best.data.status === 'broken';
    this.resources.wood -= cost;
    best.data.hp = best.data.maxHp;
    best.data.status = 'intact';
    best.visual.setStatus('intact');
    if (wasBroken) {
      this.syncOceanFootprints();
    }
    soundEngine.playRepair();
    this.addPopup3D('修复成功', 'heal', best.data.gx * TILE_SIZE, 0.9, best.data.gz * TILE_SIZE);
    this.emitHud();
  }

  private throwHookAtItem(item: FloatingItemRuntime): void {
    const dist = Math.hypot(item.x - this.playerPos.x, item.z - this.playerPos.z);
    if (dist > 16.5) {
      this.pushToast('距离过远，请稍微走近一点再拉回', 'info');
      return;
    }
    this.hookState.active = true;
    this.hookState.returning = false;
    this.hookState.progress = 0;
    this.hookState.targetItem = item;
    this.hookState.targetPos.set(item.x, 0.1, item.z);
    item.hooked = true;
    this.playerYaw = Math.atan2(item.x - this.playerPos.x, item.z - this.playerPos.z);
    soundEngine.playHookThrow();
  }

  private damageShark(dmg: number): void {
    if (this.shark.behavior === 'repelled') return;
    this.shark.hp = Math.max(0, this.shark.hp - dmg);
    this.shark.hitFlash = 1;
    soundEngine.playSharkHit();
    this.addPopup3D(`-${dmg} 驱赶`, 'damage', this.shark.x, 1.1, this.shark.z);

    if (this.shark.hp <= 0) {
      this.shark.behavior = 'repelled';
      this.shark.repelledTimer = 18;
      this.shark.targetTileKey = null;
      this.stats.sharksRepelled += 1;
      this.dailyCounters.sharksRepelledToday += 1;
      const bonus = this.addResource('food', 1);
      if (bonus > 0) {
        this.addPopup3D('+1 食物战利品', 'food', this.shark.x, 1.6, this.shark.z);
      }
      this.pushToast('成功击退鲨鱼！获得食物战利品。', 'success');
      this.updateStageProgression();
    }
    this.emitHud();
  }

  // ========== SIMULATION LOOP ==========

  private stepSimulation(dt: number): void {
    this.simTime += dt;
    const targetStorm = this.weather === 'storm' ? 1 : this.weather === 'overcast' ? 0.35 : 0;
    this.stormFactor = THREE.MathUtils.lerp(this.stormFactor, targetStorm, dt * 0.8);

    this.ocean.update(
      this.simTime,
      dt,
      this.stormFactor,
      this.getTimeOfDay(),
      this.playerPos.x,
      this.playerPos.z,
    );
    this.updateLightingAndSky();

    if (this.phase === 'title') {
      // Gentle showcase orbit
      const camAng = this.simTime * 0.16;
      this.camera.position.set(
        Math.sin(camAng) * 14,
        10.5,
        Math.cos(camAng) * 14,
      );
      this.camera.lookAt(0, 0.5, 0);
      this.updateShark(dt, true);
      this.updateFloatingItems(dt);
      return;
    }

    if (this.phase !== 'playing') {
      this.updateCamera(dt);
      return;
    }

    this.bedRestCooldown = Math.max(0, this.bedRestCooldown - dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt * 2.2);
    if (this.spearHoldTimer > 0) {
      this.spearHoldTimer = Math.max(0, this.spearHoldTimer - dt);
      if (this.spearHoldTimer === 0 && !this.holdState) {
        if (this.selectedTool === 'repair') this.playerVisual.setHandMode('repair');
        else if (this.selectedTool !== null) this.playerVisual.setHandMode('build');
        else this.playerVisual.setHandMode('hook');
      }
    }

    // Day clock
    this.dayTime += dt;
    if (this.dayTime >= DAY_DURATION_SECONDS) {
      this.completeDaySummary();
      return;
    }

    // Hold action progression
    if (this.holdState) {
      this.holdState.elapsed += dt;
      if (this.holdState.elapsed >= this.holdState.duration) {
        this.completeHoldAction(this.holdState.kind);
      }
    }

    // Player movement & collision
    this.updatePlayerMovement(dt);

    // Hook animation
    this.updateHook(dt);

    // Floating loot spawning & drift
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.floatingItems.length < 18) {
      this.spawnTimer = this.weather === 'storm' ? 2.4 : 3.2;
      this.spawnFloatingItem();
    }
    this.updateFloatingItems(dt);

    // Facilities production & automatic repair
    this.updateBuildings(dt);

    // Shark AI
    this.updateShark(dt, false);

    // Survival decay & indoor shelter
    this.updateSurvival(dt);

    // Doors auto-swing & window/lamp glow
    this.updateDoorsAndLamps(dt);

    // Roof cutaway if player is indoors
    this.updateRoofVisibility();

    // Popups projection
    this.updatePopups(dt);

    // Camera follow
    this.updateCamera(dt);

    // Throttled HUD sync
    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.08) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }
  }

  private getActiveTileAtWorld(wx: number, wz: number): TileRuntime | null {
    const gx = Math.round(wx / TILE_SIZE);
    const gz = Math.round(wz / TILE_SIZE);
    const t = this.tiles.get(tileKey(gx, gz));
    return t && t.data.status !== 'broken' ? t : null;
  }

  private getPlayerTileKey(): string | null {
    const t = this.getActiveTileAtWorld(this.playerPos.x, this.playerPos.z);
    return t ? t.data.key : null;
  }

  private updatePlayerMovement(dt: number): void {
    let mx = this.virtualMove.x;
    let mz = this.virtualMove.z;

    if (this.keysPressed.has('KeyW') || this.keysPressed.has('ArrowUp')) mz -= 1;
    if (this.keysPressed.has('KeyS') || this.keysPressed.has('ArrowDown')) mz += 1;
    if (this.keysPressed.has('KeyA') || this.keysPressed.has('ArrowLeft')) mx -= 1;
    if (this.keysPressed.has('KeyD') || this.keysPressed.has('ArrowRight')) mx += 1;

    const len = Math.hypot(mx, mz);
    if (len > 0.05) {
      const nxDir = mx / Math.max(1, len);
      const nzDir = mz / Math.max(1, len);
      const moveSpeed = this.playerInWater ? 2.9 : 4.6;
      const stepX = nxDir * moveSpeed * dt;
      const stepZ = nzDir * moveSpeed * dt;

      const curX = this.playerPos.x;
      const curZ = this.playerPos.z;
      const tryX = curX + stepX;
      const tryZ = curZ + stepZ;

      if (this.canWalkTo(tryX, tryZ)) {
        this.playerPos.x = tryX;
        this.playerPos.z = tryZ;
      } else if (this.canWalkTo(tryX, curZ)) {
        this.playerPos.x = tryX;
      } else if (this.canWalkTo(curX, tryZ)) {
        this.playerPos.z = tryZ;
      }

      this.playerSpeed = moveSpeed * Math.min(1, len);
      this.playerYaw = Math.atan2(nxDir, nzDir);
      // Gently recenter camera pan while moving so mobile players never lose their raft
      this.cameraPanOffset.lerp(new THREE.Vector2(0, 0), Math.min(1, dt * 2.5));
    } else {
      this.playerSpeed = 0;
    }

    const waveY = this.ocean.getWaveHeight(
      this.playerPos.x,
      this.playerPos.z,
      this.simTime,
      this.stormFactor,
    );
    const standingTile = this.getActiveTileAtWorld(this.playerPos.x, this.playerPos.z);
    const nowInWater = standingTile === null;

    if (nowInWater && !this.playerInWater) {
      this.playerInWater = true;
      this.waterBiteCooldown = 1.6;
      this.addPopup3D('落入海中！快游回木筏', 'damage', this.playerPos.x, 1.3, this.playerPos.z);
      this.pushToast('你掉入海水中！快游回木筏甲板，小心鲨鱼靠近。', 'warning');
    } else if (!nowInWater && this.playerInWater) {
      this.playerInWater = false;
      this.addPopup3D('回到木筏', 'info', this.playerPos.x, 1.3, this.playerPos.z);
    }

    const floorBonus = standingTile?.data.hasHouseFloor ? 0.06 : 0;
    const targetY = this.playerInWater ? waveY - 0.36 : 0.28 + floorBonus + waveY * 0.2;
    this.playerPos.y = THREE.MathUtils.lerp(this.playerPos.y, targetY, Math.min(1, dt * 12));

    this.playerVisual.group.position.copy(this.playerPos);
    this.playerVisual.group.rotation.y = this.playerYaw;
    const holdProg = this.holdState ? this.holdState.elapsed / this.holdState.duration : 0;
    this.playerVisual.update(
      dt,
      this.playerSpeed,
      this.hookState.active,
      this.damageFlash,
      this.holdState?.kind ?? null,
      holdProg,
      this.playerInWater,
    );
  }

  private canWalkTo(nx: number, nz: number): boolean {
    // Generous swim perimeter around the raft so player can walk anywhere on raft or swim back
    let maxDist = 14;
    for (const t of this.tiles.values()) {
      if (t.data.status === 'broken') continue;
      const r = Math.hypot(t.data.gx * TILE_SIZE, t.data.gz * TILE_SIZE) + 8.5;
      if (r > maxDist) maxDist = r;
    }
    if (Math.hypot(nx, nz) > maxDist) {
      return false;
    }

    // Edge wall collision (doors never block)
    const wallPad = 0.28;
    for (const ew of this.edgeWalls.values()) {
      if (ew.data.type === 'door') continue;
      if (ew.data.axis === 'H') {
        const ez = (ew.data.gz - 0.5) * TILE_SIZE;
        const xMin = (ew.data.gx - 0.5) * TILE_SIZE - 0.1;
        const xMax = (ew.data.gx + 0.5) * TILE_SIZE + 0.1;
        if (nx >= xMin && nx <= xMax && Math.abs(nz - ez) < wallPad) {
          if (Math.abs(nz - ez) < Math.abs(this.playerPos.z - ez)) {
            return false;
          }
        }
      } else {
        const ex = (ew.data.gx - 0.5) * TILE_SIZE;
        const zMin = (ew.data.gz - 0.5) * TILE_SIZE - 0.1;
        const zMax = (ew.data.gz + 0.5) * TILE_SIZE + 0.1;
        if (nz >= zMin && nz <= zMax && Math.abs(nx - ex) < wallPad) {
          if (Math.abs(nx - ex) < Math.abs(this.playerPos.x - ex)) {
            return false;
          }
        }
      }
    }

    // Solid building/furniture obstacles (rug is walkable)
    const minDist = 0.56;
    for (const tile of this.tiles.values()) {
      if (tile.data.status === 'broken') continue;
      const hasSolid = Boolean(tile.data.building || tile.data.furniture);
      if (!hasSolid) continue;
      const tx = tile.data.gx * TILE_SIZE;
      const tz = tile.data.gz * TILE_SIZE;
      const newDist = Math.hypot(nx - tx, nz - tz);
      if (newDist < minDist) {
        const oldDist = Math.hypot(this.playerPos.x - tx, this.playerPos.z - tz);
        if (newDist < oldDist) {
          return false;
        }
      }
    }

    return true;
  }

  private updateHook(dt: number): void {
    if (!this.hookState.active) {
      this.hookLine.visible = false;
      this.hookTip.visible = false;
      return;
    }

    const startX = this.playerPos.x;
    const startY = this.playerPos.y + 0.95;
    const startZ = this.playerPos.z;

    if (!this.hookState.returning) {
      this.hookState.progress += dt * 3.4;
      if (this.hookState.targetItem) {
        this.hookState.targetPos.set(
          this.hookState.targetItem.x,
          0.12,
          this.hookState.targetItem.z,
        );
      }
      if (this.hookState.progress >= 1) {
        this.hookState.progress = 1;
        this.hookState.returning = true;
      }
    } else {
      this.hookState.progress -= dt * 2.7;
      if (this.hookState.progress <= 0) {
        if (this.hookState.targetItem) {
          this.collectFloatingItem(this.hookState.targetItem);
        }
        this.hookState.active = false;
        this.hookState.targetItem = null;
        this.hookLine.visible = false;
        this.hookTip.visible = false;
        return;
      }
    }

    const t = this.hookState.progress;
    const tipX = THREE.MathUtils.lerp(startX, this.hookState.targetPos.x, t);
    const tipY = THREE.MathUtils.lerp(startY, this.hookState.targetPos.y, t) + Math.sin(t * Math.PI) * 0.7;
    const tipZ = THREE.MathUtils.lerp(startZ, this.hookState.targetPos.z, t);

    if (this.hookState.returning && this.hookState.targetItem) {
      this.hookState.targetItem.x = tipX;
      this.hookState.targetItem.z = tipZ;
      this.hookState.targetItem.mesh.position.set(tipX, tipY - 0.1, tipZ);
    }

    const posAttr = this.hookLine.geometry.attributes.position as THREE.BufferAttribute;
    posAttr.setXYZ(0, startX, startY, startZ);
    posAttr.setXYZ(1, tipX, tipY, tipZ);
    posAttr.needsUpdate = true;
    this.hookLine.visible = true;

    this.hookTip.position.set(tipX, tipY, tipZ);
    this.hookTip.lookAt(this.hookState.targetPos);
    this.hookTip.visible = true;
  }

  private collectFloatingItem(item: FloatingItemRuntime, popupX?: number, popupZ?: number): void {
    const gained = this.addResource(item.type, item.amount);
    this.floatingGroup.remove(item.mesh);
    this.floatingItems = this.floatingItems.filter((f) => f.id !== item.id);

    if (gained > 0) {
      this.stats.resourcesCollected += gained;
      this.dailyCounters.resourcesCollectedToday += gained;
      soundEngine.playCollect();
      const labels: Record<ResourceType, string> = {
        wood: '木材',
        plastic: '塑料',
        metal: '金属',
        food: '食物',
      };
      this.addPopup3D(
        `${labels[item.type]} ×${gained}`,
        item.type,
        popupX ?? this.playerPos.x,
        popupX !== undefined ? 1.45 : 1.75,
        popupZ ?? this.playerPos.z,
        true,
      );
      this.updateStageProgression();
    } else if (popupX === undefined) {
      this.pushToast('仓库库存已满，请建造【储物箱】扩容！', 'warning');
    }
    this.emitHud();
  }

  private updateFloatingItems(dt: number): void {
    for (let i = this.floatingItems.length - 1; i >= 0; i--) {
      const item = this.floatingItems[i];
      if (item.hooked) continue;

      item.x += item.vx * dt;
      item.z += item.vz * dt;
      const wy = this.ocean.getWaveHeight(item.x, item.z, this.simTime, this.stormFactor);
      item.mesh.position.set(
        item.x,
        wy + Math.sin(this.simTime * 2.4 + item.bobOffset) * 0.05,
        item.z,
      );
      item.mesh.rotation.y += dt * 0.45;

      // Auto-collect if drifting directly into player within 1.15m
      if (
        this.phase === 'playing' &&
        Math.hypot(item.x - this.playerPos.x, item.z - this.playerPos.z) < 1.15
      ) {
        this.collectFloatingItem(item);
        continue;
      }

      if (Math.hypot(item.x, item.z) > 25) {
        this.floatingGroup.remove(item.mesh);
        this.floatingItems.splice(i, 1);
      }
    }
  }

  private updateBuildings(dt: number): void {
    let hasRepairStation = false;

    for (const tile of this.tiles.values()) {
      if (tile.data.status === 'broken') continue;
      const waveY = this.ocean.getWaveHeight(
        tile.data.gx * TILE_SIZE,
        tile.data.gz * TILE_SIZE,
        this.simTime,
        this.stormFactor,
      );
      const deckY = 0.14 + waveY * 0.2;
      tile.visual.group.position.y = deckY;

      const b = tile.data.building;
      if (b) {
        if (b.type === 'purifier' && b.storedOutput < 3) {
          b.progress += dt / 13;
          if (b.progress >= 1) {
            b.progress -= 1;
            b.storedOutput += 1;
          }
        } else if (b.type === 'garden' && b.storedOutput < 4) {
          b.progress += dt / 16;
          if (b.progress >= 1) {
            b.progress -= 1;
            b.storedOutput += 2;
          }
        } else if (b.type === 'repair_station') {
          hasRepairStation = true;
        } else if (b.type === 'collector') {
          b.cooldown = Math.max(0, b.cooldown - dt);
          b.progress = 1 - Math.min(1, b.cooldown / 2.5);
          if (b.cooldown <= 0 && this.getStorageUsed() < this.getStorageMax()) {
            const tx = tile.data.gx * TILE_SIZE;
            const tz = tile.data.gz * TILE_SIZE;
            let nearest: FloatingItemRuntime | null = null;
            let bestDist = 4.6;
            for (const item of this.floatingItems) {
              if (item.hooked) continue;
              const d = Math.hypot(item.x - tx, item.z - tz);
              if (d <= bestDist) {
                bestDist = d;
                nearest = item;
              }
            }
            if (nearest) {
              b.cooldown = 2.5;
              this.collectFloatingItem(nearest, tx, tz);
            } else {
              b.cooldown = 0.45;
            }
          }
        }
        tile.buildingVisual?.update(dt, b.progress, b.storedOutput);
      }

      if (tile.buildingVisual) {
        tile.buildingVisual.group.position.y = deckY - 0.04;
      }
      if (tile.houseFloorGroup) {
        tile.houseFloorGroup.position.y = deckY - 0.04;
      }
      if (tile.houseRoofVisual) {
        tile.houseRoofVisual.group.position.y = deckY - 0.04;
      }
      if (tile.furnitureVisual) {
        tile.furnitureVisual.group.position.y = deckY - 0.04;
      }
      if (tile.rugVisual) {
        tile.rugVisual.group.position.y = deckY - 0.04;
      }
    }

    if (hasRepairStation) {
      this.autoRepairTimer += dt;
      if (this.autoRepairTimer >= 10) {
        this.autoRepairTimer = 0;
        for (const tile of this.tiles.values()) {
          if (tile.data.status === 'damaged' || tile.data.hp < tile.data.maxHp) {
            tile.data.hp = Math.min(tile.data.maxHp, tile.data.hp + 25);
            if (tile.data.hp > 50 && tile.data.status === 'damaged') {
              tile.data.status = 'intact';
              tile.visual.setStatus('intact');
            }
            break;
          }
        }
      }
    }
  }

  private updateShark(dt: number, idleOrbitOnly: boolean): void {
    this.shark.hitFlash = Math.max(0, this.shark.hitFlash - dt * 3);

    if (idleOrbitOnly) {
      this.shark.angle += dt * 0.35;
      this.shark.x = Math.cos(this.shark.angle) * 10.5;
      this.shark.z = Math.sin(this.shark.angle) * 10.5;
      const wy = this.ocean.getWaveHeight(this.shark.x, this.shark.z, this.simTime, this.stormFactor);
      this.sharkVisual.group.position.set(this.shark.x, wy - 0.1, this.shark.z);
      this.sharkVisual.group.rotation.y = -this.shark.angle;
      this.sharkVisual.update(dt, 0, 0);
      this.sharkBeaconRing.visible = false;
      return;
    }

    const tod = this.getTimeOfDay();
    this.shark.isFrenzy = tod === 'night' || this.weather === 'storm';
    const playerTileKey = this.getPlayerTileKey();

    if (this.playerInWater && this.shark.behavior !== 'repelled') {
      const pAngle = Math.atan2(this.playerPos.z, this.playerPos.x);
      const pRadius = Math.max(2.2, Math.hypot(this.playerPos.x, this.playerPos.z) + 0.9);
      this.shark.angle = THREE.MathUtils.lerp(this.shark.angle, pAngle, dt * 3.8);
      this.shark.radius = THREE.MathUtils.lerp(this.shark.radius, pRadius, dt * 3.2);
      this.sharkBeaconRing.visible = false;

      this.waterBiteCooldown -= dt;
      if (
        this.waterBiteCooldown <= 0 &&
        Math.hypot(this.shark.x - this.playerPos.x, this.shark.z - this.playerPos.z) < 2.4
      ) {
        this.waterBiteCooldown = 2.2;
        soundEngine.playSharkBite();
        this.damageFlash = 0.75;
        this.survival.health = Math.max(0, this.survival.health - 16);
        this.addPopup3D('-16 水中咬击', 'damage', this.playerPos.x, 1.35, this.playerPos.z);
        if (this.survival.health <= 0) {
          this.triggerGameOver('落水后遭到鲨鱼袭击，体力耗尽');
        }
      }
    } else if (this.shark.behavior === 'repelled') {
      this.shark.repelledTimer -= dt;
      this.shark.radius = THREE.MathUtils.lerp(this.shark.radius, 18, dt * 1.4);
      this.shark.angle += dt * 0.55;
      this.sharkBeaconRing.visible = false;
      if (this.shark.repelledTimer <= 0) {
        this.shark.behavior = 'circling';
        this.shark.hp = this.shark.maxHp;
        this.shark.cycleTimer = this.shark.isFrenzy ? 9 : 14;
      }
    } else if (this.shark.behavior === 'circling') {
      this.shark.radius = THREE.MathUtils.lerp(this.shark.radius, 10.2, dt * 1.2);
      this.shark.angle += dt * (this.shark.isFrenzy ? 0.58 : 0.42);
      this.shark.cycleTimer -= dt;
      this.sharkBeaconRing.visible = false;

      if (this.shark.cycleTimer <= 0) {
        const target = this.pickPerimeterRaftTile(playerTileKey ?? undefined);
        if (target) {
          this.shark.behavior = 'warning';
          this.shark.targetTileKey = target.data.key;
          this.shark.warningDuration = this.shark.isFrenzy ? 5.0 : 6.5;
          this.shark.warningTimer = this.shark.warningDuration;
          soundEngine.playSharkWarn();
          this.pushToast('警报！鲨鱼锁定了木筏边缘，点击驱赶或按 F 键！', 'danger');
        } else {
          this.shark.cycleTimer = 6;
        }
      }
    } else if (this.shark.behavior === 'warning') {
      this.shark.warningTimer -= dt;
      let target = this.shark.targetTileKey ? this.tiles.get(this.shark.targetTileKey) : null;
      if (target && playerTileKey && target.data.key === playerTileKey) {
        const alt = this.pickPerimeterRaftTile(playerTileKey);
        if (alt && alt.data.key !== target.data.key) {
          target = alt;
          this.shark.targetTileKey = alt.data.key;
        }
      }
      if (!target || target.data.status === 'broken') {
        this.shark.behavior = 'circling';
        this.shark.cycleTimer = 6;
        return;
      }
      const tx = target.data.gx * TILE_SIZE;
      const tz = target.data.gz * TILE_SIZE;
      const dirAngle = Math.atan2(tz, tx);
      this.shark.angle = THREE.MathUtils.lerp(this.shark.angle, dirAngle, dt * 2.5);
      this.shark.radius = THREE.MathUtils.lerp(
        this.shark.radius,
        Math.hypot(tx, tz) + 2.4,
        dt * 2.2,
      );

      this.sharkBeaconRing.visible = true;
      this.sharkBeaconRing.position.set(tx, 0.25, tz);
      const s = 1 + Math.sin(this.simTime * 10) * 0.14;
      this.sharkBeaconRing.scale.set(s, s, 1);

      if (this.shark.warningTimer <= 0) {
        this.shark.behavior = 'attacking';
        this.shark.biteCooldown = 0.2;
      }
    } else if (this.shark.behavior === 'attacking') {
      let target = this.shark.targetTileKey ? this.tiles.get(this.shark.targetTileKey) : null;
      if (target && playerTileKey && target.data.key === playerTileKey) {
        const alt = this.pickPerimeterRaftTile(playerTileKey);
        if (alt && alt.data.key !== target.data.key) {
          target = alt;
          this.shark.targetTileKey = alt.data.key;
        }
      }
      if (!target || target.data.status === 'broken') {
        this.shark.behavior = 'circling';
        this.shark.cycleTimer = 8;
        this.sharkBeaconRing.visible = false;
        return;
      }

      const tx = target.data.gx * TILE_SIZE;
      const tz = target.data.gz * TILE_SIZE;
      this.sharkBeaconRing.visible = true;
      this.sharkBeaconRing.position.set(tx, 0.25, tz);

      const dirAngle = Math.atan2(tz, tx);
      this.shark.angle = dirAngle;
      this.shark.radius = THREE.MathUtils.lerp(
        this.shark.radius,
        Math.hypot(tx, tz) + 1.15,
        dt * 4,
      );

      this.shark.biteCooldown -= dt;
      if (this.shark.biteCooldown <= 0) {
        this.shark.biteCooldown = 1.9;
        if (playerTileKey && target.data.key === playerTileKey) {
          const alt = this.pickPerimeterRaftTile(playerTileKey);
          if (alt) {
            target = alt;
            this.shark.targetTileKey = alt.data.key;
          }
        }
        this.applySharkBite(target);
      }
    }

    this.shark.x = Math.cos(this.shark.angle) * this.shark.radius;
    this.shark.z = Math.sin(this.shark.angle) * this.shark.radius;
    const wy = this.ocean.getWaveHeight(this.shark.x, this.shark.z, this.simTime, this.stormFactor);
    this.sharkVisual.group.position.set(this.shark.x, wy - 0.1, this.shark.z);

    if (this.playerInWater && this.shark.behavior !== 'repelled') {
      this.sharkVisual.group.lookAt(this.playerPos.x, wy - 0.1, this.playerPos.z);
    } else if (this.shark.behavior === 'warning' || this.shark.behavior === 'attacking') {
      const target = this.shark.targetTileKey ? this.tiles.get(this.shark.targetTileKey) : null;
      if (target) {
        this.sharkVisual.group.lookAt(
          target.data.gx * TILE_SIZE,
          wy - 0.1,
          target.data.gz * TILE_SIZE,
        );
      }
    } else {
      this.sharkVisual.group.rotation.y = -this.shark.angle;
    }

    this.sharkVisual.update(
      dt,
      this.shark.behavior === 'attacking' || this.playerInWater ? 1 : 0,
      this.shark.hitFlash,
    );
  }

  private pickPerimeterRaftTile(excludeKey?: string): TileRuntime | null {
    const perimeter: TileRuntime[] = [];
    for (const tile of this.tiles.values()) {
      if (tile.data.status === 'broken') continue;
      const { gx, gz } = tile.data;
      const exposed = [
        tileKey(gx + 1, gz),
        tileKey(gx - 1, gz),
        tileKey(gx, gz + 1),
        tileKey(gx, gz - 1),
      ].some((k) => {
        const n = this.tiles.get(k);
        return !n || n.data.status === 'broken';
      });
      if (exposed) perimeter.push(tile);
    }
    if (perimeter.length === 0) return null;
    const nonStanding = excludeKey ? perimeter.filter((t) => t.data.key !== excludeKey) : perimeter;
    const pool = nonStanding.length > 0 ? nonStanding : perimeter;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private applySharkBite(tile: TileRuntime): void {
    const defCount = this.getDefenseCount();
    let dmg = this.shark.isFrenzy ? 34 : 26;
    if (tile.data.reinforced) dmg *= 0.5;
    if (defCount > 0) {
      dmg *= Math.max(0.45, 1 - defCount * 0.2);
    }
    dmg = Math.round(dmg);

    tile.data.hp = Math.max(0, tile.data.hp - dmg);
    soundEngine.playSharkBite();
    this.damageFlash = 0.65;
    this.addPopup3D(
      `-${dmg} 耐久`,
      'damage',
      tile.data.gx * TILE_SIZE,
      0.9,
      tile.data.gz * TILE_SIZE,
    );

    if (tile.data.hp <= 0) {
      this.destroyTileAndAttachments(tile, false, false);
      this.pushToast('一块木筏被鲨鱼咬碎了！上方物品也随之落海，请及时修补！', 'danger');
    } else if (tile.data.hp <= 55 && tile.data.status !== 'damaged') {
      tile.data.status = 'damaged';
      tile.visual.setStatus('damaged');
    }

    // Defense counter-damage to shark
    if (defCount > 0) {
      this.damageShark(16 * defCount);
    }

    // Check if raft collapsed completely
    const activeTiles = this.countActiveTiles();
    if (activeTiles === 0) {
      this.triggerGameOver('木筏已被鲨鱼彻底摧毁，沉入大海');
    }
  }

  private updateSurvival(dt: number): void {
    const tod = this.getTimeOfDay();
    const indoors = this.isPlayerIndoors();
    const lamps = this.getLampCount();

    const hungerRate = 0.36;
    const thirstRate = 0.46;
    this.survival.hunger = Math.max(0, this.survival.hunger - hungerRate * dt);
    this.survival.thirst = Math.max(0, this.survival.thirst - thirstRate * dt);

    let hpDelta = 0;
    if (this.survival.hunger <= 0) hpDelta -= 3.2;
    if (this.survival.thirst <= 0) hpDelta -= 4.0;

    // Storm & night exposure if outdoors without shelter
    if (this.weather === 'storm' && !indoors) {
      hpDelta -= 1.25;
    } else if (tod === 'night' && !indoors && lamps === 0) {
      hpDelta -= 0.45;
    }

    // Warm indoor comfort healing
    if (indoors && lamps > 0 && this.survival.hunger > 30 && this.survival.thirst > 30) {
      hpDelta += 0.9;
    }

    if (hpDelta !== 0) {
      if (hpDelta < 0) {
        this.dailyCounters.damageTakenToday += Math.abs(hpDelta) * dt;
      }
      this.survival.health = THREE.MathUtils.clamp(
        this.survival.health + hpDelta * dt,
        0,
        this.survival.maxHealth,
      );
      if (this.survival.health <= 0) {
        const reason =
          this.survival.thirst <= 0
            ? '严重脱水导致体力耗尽'
            : this.survival.hunger <= 0
              ? '长期饥饿导致生命终结'
              : '恶劣海况消耗了全部生命值';
        this.triggerGameOver(reason);
      }
    }
  }

  private updateDoorsAndLamps(dt: number): void {
    const tod = this.getTimeOfDay();
    const nightFactor = tod === 'night' ? 1 : tod === 'evening' ? 0.55 : 0;

    for (const ew of this.edgeWalls.values()) {
      ew.visual.setNightGlow(nightFactor);
      if (ew.data.type === 'door') {
        const wc = edgeWorldCenter(ew.data.axis, ew.data.gx, ew.data.gz);
        const near = Math.hypot(wc.x - this.playerPos.x, wc.z - this.playerPos.z) < 1.85;
        ew.data.doorOpen = THREE.MathUtils.lerp(ew.data.doorOpen, near ? 1 : 0, dt * 8);
        ew.visual.setDoorOpen(ew.data.doorOpen);
      }
    }

    for (const tile of this.tiles.values()) {
      if (tile.data.furniture?.type === 'lamp' && tile.furnitureVisual) {
        tile.furnitureVisual.setNightIntensity(nightFactor);
      }
    }
  }

  private updateRoofVisibility(): void {
    const hideRoofs = this.roofCutaway || this.isPlayerIndoors();
    for (const tile of this.tiles.values()) {
      tile.houseRoofVisual?.setCutaway(hideRoofs);
    }
  }

  private updateLightingAndSky(): void {
    const tod = this.getTimeOfDay();
    let skyHex = 0x6ac5df;
    let sunHex = 0xfff1d6;
    let sunInt = 1.85;
    let hemiInt = 0.88;

    if (tod === 'morning') {
      skyHex = 0x74cbe3;
      sunHex = 0xffebc6;
      sunInt = 1.75;
    } else if (tod === 'afternoon') {
      skyHex = 0x62bfe0;
      sunHex = 0xfff5e0;
      sunInt = 1.95;
    } else if (tod === 'evening') {
      skyHex = 0xd98f6c;
      sunHex = 0xffa66b;
      sunInt = 1.35;
      hemiInt = 0.68;
    } else {
      skyHex = 0x10283d;
      sunHex = 0x7da9d9;
      sunInt = 0.65;
      hemiInt = 0.46;
    }

    if (this.stormFactor > 0.25) {
      skyHex = tod === 'night' ? 0x0b1c2c : 0x3f5e70;
      sunInt *= 0.65;
    }

    (this.scene.background as THREE.Color).lerp(new THREE.Color(skyHex), 0.04);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(this.scene.background as THREE.Color);
      this.scene.fog.density = 0.011 + this.stormFactor * 0.01;
    }

    this.sunLight.color.lerp(new THREE.Color(sunHex), 0.05);
    this.sunLight.intensity = THREE.MathUtils.lerp(this.sunLight.intensity, sunInt, 0.05);
    this.hemiLight.intensity = THREE.MathUtils.lerp(this.hemiLight.intensity, hemiInt, 0.05);
    soundEngine.updateAmbience(this.stormFactor);
  }

  private updateCamera(dt: number): void {
    _camTarget.set(
      this.playerPos.x + this.cameraPanOffset.x,
      0.55,
      this.playerPos.z + this.cameraPanOffset.y,
    );
    const pitch = this.cameraDistance * 0.78;
    const dist = this.cameraDistance * 0.78;
    _camDesired.set(_camTarget.x, pitch, _camTarget.z + dist);
    this.camera.position.lerp(_camDesired, Math.min(1, dt * 6.5));
    this.camera.lookAt(_camTarget);
  }

  private updatePopups(dt: number): void {
    const width = Math.max(320, this.mountEl.clientWidth || window.innerWidth);
    const height = Math.max(320, this.mountEl.clientHeight || window.innerHeight);

    const projected: FloatingPopup[] = [];
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.age += dt;
      if (p.age >= p.maxAge) {
        this.popups.splice(i, 1);
        continue;
      }
      _projPos.set(p.wx, p.wy + p.age * 1.1, p.wz);
      _projPos.project(this.camera);
      const sx = (_projPos.x * 0.5 + 0.5) * width;
      const sy = (-_projPos.y * 0.5 + 0.5) * height;
      projected.push({
        id: p.id,
        text: p.text,
        tone: p.tone,
        x: sx,
        y: sy,
        isClaim: p.isClaim,
      });
    }
    this.callbacks.onPopupsUpdate(projected);
  }

  private completeDaySummary(): void {
    this.stats.daysSurvived = this.day;
    this.dailyReport = {
      dayCompleted: this.day,
      resourcesCollectedToday: this.dailyCounters.resourcesCollectedToday,
      builtToday: this.dailyCounters.builtToday,
      sharksRepelledToday: this.dailyCounters.sharksRepelledToday,
      damageTakenToday: Math.round(this.dailyCounters.damageTakenToday),
      nextWeather: this.nextWeather,
    };
    this.phase = 'day_summary';
    soundEngine.playVictory();
    this.emitHud();
  }

  private triggerGameOver(reason: string): void {
    this.gameOverReason = reason;
    this.phase = 'gameover';
    soundEngine.playGameOver();
    this.emitHud();
  }

  // ========== HELPERS & HUD SNAPSHOT ==========

  private getTimeOfDay(): TimeOfDay {
    const p = this.dayTime / DAY_DURATION_SECONDS;
    if (p < 0.3) return 'morning';
    if (p < 0.62) return 'afternoon';
    if (p < 0.8) return 'evening';
    return 'night';
  }

  private getClockLabel(): string {
    const p = this.dayTime / DAY_DURATION_SECONDS;
    const totalHours = (6 + p * 24) % 24;
    const h = Math.floor(totalHours);
    const m = Math.floor((totalHours - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private getStorageMax(): number {
    let chests = 0;
    for (const tile of this.tiles.values()) {
      if (tile.data.status !== 'broken' && tile.data.furniture?.type === 'chest') {
        chests += 1;
      }
    }
    return BASE_STORAGE_CAPACITY + chests * CHEST_STORAGE_BONUS;
  }

  private getStorageUsed(): number {
    return (
      this.resources.wood +
      this.resources.plastic +
      this.resources.metal +
      this.resources.food +
      this.resources.water
    );
  }

  private addResource(type: ResourceType | 'water', amount: number): number {
    const space = Math.max(0, this.getStorageMax() - this.getStorageUsed());
    const added = Math.min(amount, space);
    if (added > 0) {
      this.resources[type] += added;
    }
    return added;
  }

  private hasEnoughResources(cost: Partial<Record<ResourceType, number>>): boolean {
    for (const [k, req] of Object.entries(cost)) {
      if ((this.resources[k as ResourceType] ?? 0) < (req ?? 0)) return false;
    }
    return true;
  }

  private spendResources(cost: Partial<Record<ResourceType, number>>): void {
    for (const [k, req] of Object.entries(cost)) {
      this.resources[k as ResourceType] -= req ?? 0;
    }
  }

  private hasWorkbench(): boolean {
    for (const t of this.tiles.values()) {
      if (t.data.status !== 'broken' && t.data.building?.type === 'workbench') return true;
    }
    return false;
  }

  private hasRepairStation(): boolean {
    for (const t of this.tiles.values()) {
      if (t.data.status !== 'broken' && t.data.building?.type === 'repair_station') return true;
    }
    return false;
  }

  private getCollectorUnlockState(): { unlocked: boolean; reason: string } {
    const missing: string[] = [];
    if (!this.hasWorkbench()) missing.push('建造工作台');
    if (this.countActiveTiles() < 6) missing.push('木筏扩至6块');
    if (this.stage < 3 && this.day < 3) missing.push('第3天或阶段三');

    if (missing.length === 0) {
      return { unlocked: true, reason: '已解锁后期自动化收集设施' };
    }
    return {
      unlocked: false,
      reason: `后期解锁（还需：${missing.join(' · ')}）`,
    };
  }

  private hasTableBuff(): boolean {
    for (const t of this.tiles.values()) {
      if (t.data.status !== 'broken' && t.data.furniture?.type === 'table_chair') return true;
    }
    return false;
  }

  private getLampCount(): number {
    let count = 0;
    for (const t of this.tiles.values()) {
      if (t.data.status !== 'broken' && t.data.furniture?.type === 'lamp') count += 1;
    }
    return count;
  }

  private getDefenseCount(): number {
    let count = 0;
    for (const t of this.tiles.values()) {
      if (t.data.status !== 'broken' && t.data.building?.type === 'defense') count += 1;
    }
    return count;
  }

  private countActiveTiles(): number {
    let c = 0;
    for (const t of this.tiles.values()) {
      if (t.data.status !== 'broken') c += 1;
    }
    return c;
  }

  private isPlayerIndoors(): boolean {
    const gx = Math.round(this.playerPos.x / TILE_SIZE);
    const gz = Math.round(this.playerPos.z / TILE_SIZE);
    const tile = this.tiles.get(tileKey(gx, gz));
    return Boolean(tile && tile.data.hasHouseFloor && tile.data.hasRoof);
  }

  private isPlayerNearBed(): boolean {
    for (const t of this.tiles.values()) {
      if (t.data.status !== 'broken' && t.data.furniture?.type === 'bed') {
        const d = Math.hypot(
          t.data.gx * TILE_SIZE - this.playerPos.x,
          t.data.gz * TILE_SIZE - this.playerPos.z,
        );
        if (d < 3.4) return true;
      }
    }
    return false;
  }

  private computeStageGoals(): StageGoalItem[] {
    const activeTiles = this.countActiveTiles();
    let purifiers = 0;
    let gardens = 0;
    let defenses = 0;
    let reinforced = 0;
    let houseFloors = 0;
    let roofs = 0;
    let furniture = 0;
    for (const t of this.tiles.values()) {
      if (t.data.status === 'broken') continue;
      if (t.data.building?.type === 'purifier') purifiers += 1;
      if (t.data.building?.type === 'garden') gardens += 1;
      if (t.data.building?.type === 'defense') defenses += 1;
      if (t.data.reinforced) reinforced += 1;
      if (t.data.hasHouseFloor) houseFloors += 1;
      if (t.data.hasRoof) roofs += 1;
      if (t.data.furniture) furniture += 1;
      if (t.data.rug !== null) furniture += 1;
    }
    const walls = this.edgeWalls.size;

    if (this.stage === 1) {
      return [
        {
          id: 'collect',
          label: '收集物资',
          current: Math.min(8, this.stats.resourcesCollected),
          target: 8,
          done: this.stats.resourcesCollected >= 8,
        },
        {
          id: 'expand',
          label: '扩建木筏至4块',
          current: Math.min(4, activeTiles),
          target: 4,
          done: activeTiles >= 4,
        },
        {
          id: 'shark1',
          label: '击退鲨鱼',
          current: Math.min(1, this.stats.sharksRepelled),
          target: 1,
          done: this.stats.sharksRepelled >= 1,
        },
      ];
    }

    if (this.stage === 2) {
      return [
        {
          id: 'purifier',
          label: '建造净水器',
          current: Math.min(1, purifiers),
          target: 1,
          done: purifiers >= 1,
        },
        {
          id: 'garden',
          label: '建造菜园',
          current: Math.min(1, gardens),
          target: 1,
          done: gardens >= 1,
        },
        {
          id: 'workbench',
          label: '建造工作台',
          current: this.hasWorkbench() ? 1 : 0,
          target: 1,
          done: this.hasWorkbench(),
        },
      ];
    }

    if (this.stage === 3) {
      return [
        {
          id: 'defense',
          label: '部署防御拒马',
          current: Math.min(1, defenses),
          target: 1,
          done: defenses >= 1,
        },
        {
          id: 'reinforce',
          label: '加固2块边缘',
          current: Math.min(2, reinforced),
          target: 2,
          done: reinforced >= 2,
        },
        {
          id: 'repair_st',
          label: '建造维修站',
          current: this.hasRepairStation() ? 1 : 0,
          target: 1,
          done: this.hasRepairStation(),
        },
      ];
    }

    return [
      {
        id: 'house_floor',
        label: '铺设4块室内地板',
        current: Math.min(4, houseFloors),
        target: 4,
        done: houseFloors >= 4,
      },
      {
        id: 'walls',
        label: '搭建6面墙门窗',
        current: Math.min(6, walls),
        target: 6,
        done: walls >= 6,
      },
      {
        id: 'roofs',
        label: '搭建2块屋顶',
        current: Math.min(2, roofs),
        target: 2,
        done: roofs >= 2,
      },
      {
        id: 'furn',
        label: '布置3件家具/饰品',
        current: Math.min(3, furniture),
        target: 3,
        done: furniture >= 3,
      },
    ];
  }

  private updateStageProgression(): void {
    const goals = this.computeStageGoals();
    if (this.stage < 4 && goals.every((g) => g.done)) {
      this.stage = (this.stage + 1) as StageId;
      soundEngine.playVictory();
      this.pushToast(`阶段推进！解锁 ${STAGE_META[this.stage].title}`, 'success');
    }
  }

  private computeContextHints(): ContextualHints {
    let nearestFloating: FloatingItemRuntime | null = null;
    let minFDist = 9.5;
    for (const item of this.floatingItems) {
      if (item.hooked) continue;
      const d = Math.hypot(item.x - this.playerPos.x, item.z - this.playerPos.z);
      if (d < minFDist) {
        minFDist = d;
        nearestFloating = item;
      }
    }

    const sharkDist = Math.hypot(this.shark.x - this.playerPos.x, this.shark.z - this.playerPos.z);
    const canFightShark =
      this.shark.behavior !== 'repelled' &&
      (this.shark.behavior === 'warning' ||
        this.shark.behavior === 'attacking' ||
        sharkDist <= 9.5);

    let canRepairNearby = false;
    for (const t of this.tiles.values()) {
      if (t.data.status !== 'intact') {
        canRepairNearby = true;
        break;
      }
    }

    let nearestHarvestKind: 'water' | 'food' | null = null;
    let minHDist = 4.2;
    for (const t of this.tiles.values()) {
      if (!t.data.building || t.data.building.storedOutput <= 0) continue;
      const d = Math.hypot(
        t.data.gx * TILE_SIZE - this.playerPos.x,
        t.data.gz * TILE_SIZE - this.playerPos.z,
      );
      if (d < minHDist) {
        minHDist = d;
        nearestHarvestKind = t.data.building.type === 'purifier' ? 'water' : 'food';
      }
    }

    const canRestBed = this.isPlayerNearBed();
    const tod = this.getTimeOfDay();

    return {
      canSalvage: nearestFloating !== null,
      nearestFloatingType: nearestFloating ? nearestFloating.type : null,
      canFightShark,
      canRepairNearby,
      canHarvestNearby: nearestHarvestKind !== null,
      nearestHarvestKind,
      canRestBed,
      bedSkipNight: tod === 'evening' || tod === 'night',
    };
  }

  private addPopup3D(
    text: string,
    tone: FloatingPopup['tone'],
    wx: number,
    wy: number,
    wz: number,
    isClaim = false,
  ): void {
    this.popups.push({
      id: this.nextEntityId++,
      text,
      tone,
      wx,
      wy,
      wz,
      age: 0,
      maxAge: isClaim ? 1.5 : 1.2,
      isClaim,
    });
  }

  private pushToast(text: string, tone: ToastMessage['tone']): void {
    this.callbacks.onToast({
      id: this.nextEntityId++,
      text,
      tone,
    });
  }

  private emitHud(): void {
    let intact = 0;
    let damaged = 0;
    let broken = 0;
    let reinforcedCount = 0;
    let houseFloorCount = 0;
    let roofCount = 0;
    let furnitureCount = 0;
    let chestCount = 0;
    let readyPickups = 0;

    for (const t of this.tiles.values()) {
      if (t.data.status === 'intact') intact += 1;
      else if (t.data.status === 'damaged') damaged += 1;
      else broken += 1;

      if (t.data.status !== 'broken') {
        if (t.data.reinforced) reinforcedCount += 1;
        if (t.data.hasHouseFloor) houseFloorCount += 1;
        if (t.data.hasRoof) roofCount += 1;
        if (t.data.furniture) furnitureCount += 1;
        if (t.data.rug !== null) furnitureCount += 1;
        if (t.data.furniture?.type === 'chest') chestCount += 1;
        if (t.data.building && t.data.building.storedOutput > 0) readyPickups += 1;
      }
    }

    let wallDecorCount = 0;
    for (const w of this.edgeWalls.values()) {
      if (w.data.hasDecor) wallDecorCount += 1;
    }

    const pendingPlacement: PendingPlacementInfo | null =
      this.selectedTool &&
      this.selectedTool !== 'repair' &&
      this.selectedTool !== 'demolish' &&
      this.pendingTarget
        ? {
            tool: this.selectedTool as BuildItemId,
            valid: this.pendingTarget.valid,
            reason: this.pendingTarget.reason,
          }
        : null;

    const activeModeLabel =
      this.selectedTool === null
        ? '打捞钩（点击海面物资拉回）'
        : this.selectedTool === 'repair'
          ? '维修锤（按住受损地板修复）'
          : this.selectedTool === 'demolish'
            ? '拆除工具（点击目标拆除）'
            : `安放：${BUILD_ITEMS[this.selectedTool].name}`;

    const holdAction: HoldProgressState | null = this.holdState
      ? {
          kind: this.holdState.kind,
          label: HOLD_LABELS[this.holdState.kind],
          progress: Math.min(1, this.holdState.elapsed / this.holdState.duration),
          duration: this.holdState.duration,
        }
      : null;

    this.callbacks.onHudUpdate({
      phase: this.phase,
      day: this.day,
      dayProgress: Math.min(1, this.dayTime / DAY_DURATION_SECONDS),
      clockLabel: this.getClockLabel(),
      timeOfDay: this.getTimeOfDay(),
      weather: this.weather,
      nextWeather: this.nextWeather,
      stage: this.stage,
      stageTitle: STAGE_META[this.stage].title,
      stageSubtitle: STAGE_META[this.stage].subtitle,
      stageGoals: this.computeStageGoals(),
      resources: { ...this.resources },
      storageUsed: this.getStorageUsed(),
      storageMax: this.getStorageMax(),
      survival: { ...this.survival },
      selectedTool: this.selectedTool,
      activeModeLabel,
      pendingPlacement,
      holdAction,
      playerInWater: this.playerInWater,
      rotation: this.rotation,
      roofCutaway: this.roofCutaway,
      playerIndoors: this.isPlayerIndoors(),
      nearBed: this.isPlayerNearBed(),
      hasWorkbench: this.hasWorkbench(),
      hasRepairStation: this.hasRepairStation(),
      hasTableBuff: this.hasTableBuff(),
      collectorUnlocked: this.getCollectorUnlockState().unlocked,
      collectorUnlockReason: this.getCollectorUnlockState().reason,
      lampCount: this.getLampCount(),
      chestCount,
      defenseCount: this.getDefenseCount(),
      reinforcedCount,
      houseFloorCount,
      wallCount: this.edgeWalls.size,
      roofCount,
      furnitureCount: furnitureCount + wallDecorCount,
      intactTileCount: intact,
      damagedTileCount: damaged,
      brokenTileCount: broken,
      totalTiles: this.tiles.size,
      shark: {
        behavior: this.shark.behavior,
        hp: this.shark.hp,
        maxHp: this.shark.maxHp,
        targetTileKey: this.shark.targetTileKey,
        warningTimer: Math.max(0, this.shark.warningTimer),
        warningDuration: this.shark.warningDuration,
        isFrenzy: this.shark.isFrenzy,
      },
      context: this.computeContextHints(),
      stats: { ...this.stats },
      dailyReport: this.dailyReport,
      damageFlash: this.damageFlash,
      gameOverReason: this.gameOverReason,
      muted: soundEngine.isMuted(),
      readyPickups,
    });
  }

  public dispose(): void {
    this.disposed = true;
    window.cancelAnimationFrame(this.rafId);
    window.clearTimeout(this.timeoutId);
    if (this.longPressTimer !== null) {
      window.clearTimeout(this.longPressTimer);
    }
    this.unbindEvents();

    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
    });

    this.mats.dispose();
    this.ocean.dispose();
    this.pmremTarget.dispose();
    soundEngine.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.mountEl) {
      this.mountEl.removeChild(this.renderer.domElement);
    }
  }
}
