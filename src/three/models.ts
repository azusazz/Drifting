import * as THREE from 'three';
import { TILE_SIZE } from '../constants/buildings';
import { FacilityType, FurnitureType, ResourceType, TileStatus, WallType } from '../types/game';
import {
  createFabricTexture,
  createHousePlankTexture,
  createRoofShingleTexture,
  createRugTexture,
  createWoodPlankTexture,
} from './textures';

export interface MaterialLibrary {
  raftWood: THREE.MeshStandardMaterial;
  raftWoodDark: THREE.MeshStandardMaterial;
  raftWoodDamaged: THREE.MeshStandardMaterial;
  rope: THREE.MeshStandardMaterial;
  iron: THREE.MeshStandardMaterial;
  copper: THREE.MeshStandardMaterial;
  plasticBlue: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  waterTint: THREE.MeshStandardMaterial;
  foliage: THREE.MeshStandardMaterial;
  soil: THREE.MeshStandardMaterial;
  houseFloor: THREE.MeshStandardMaterial;
  houseWall: THREE.MeshStandardMaterial;
  roofShingle: THREE.MeshStandardMaterial;
  rugMat: THREE.MeshStandardMaterial;
  bedBlanket: THREE.MeshStandardMaterial;
  pillow: THREE.MeshStandardMaterial;
  lampGlow: THREE.MeshStandardMaterial;
  windowGlow: THREE.MeshStandardMaterial;
  skin: THREE.MeshStandardMaterial;
  shirt: THREE.MeshStandardMaterial;
  pants: THREE.MeshStandardMaterial;
  hair: THREE.MeshStandardMaterial;
  sharkBody: THREE.MeshStandardMaterial;
  sharkBelly: THREE.MeshStandardMaterial;
  sharkWhite: THREE.MeshStandardMaterial;
  redAccent: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export function createMaterials(maxAniso: number): MaterialLibrary {
  const textures: THREE.Texture[] = [];
  const woodTex = createWoodPlankTexture(maxAniso, 0);
  const darkWoodTex = createWoodPlankTexture(maxAniso, -28);
  const housePlankTex = createHousePlankTexture(maxAniso);
  const roofTex = createRoofShingleTexture(maxAniso);
  const rugTex = createRugTexture(maxAniso);
  const blanketTex = createFabricTexture(maxAniso, '#c85a43');
  textures.push(woodTex, darkWoodTex, housePlankTex, roofTex, rugTex, blanketTex);

  const mats: Omit<MaterialLibrary, 'dispose'> = {
    raftWood: new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.78, metalness: 0.04 }),
    raftWoodDark: new THREE.MeshStandardMaterial({ map: darkWoodTex, roughness: 0.82, metalness: 0.04 }),
    raftWoodDamaged: new THREE.MeshStandardMaterial({
      map: darkWoodTex,
      color: '#a36b55',
      roughness: 0.9,
      metalness: 0.02,
    }),
    rope: new THREE.MeshStandardMaterial({ color: '#d7be93', roughness: 0.92, metalness: 0.0 }),
    iron: new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.35, metalness: 0.75 }),
    copper: new THREE.MeshStandardMaterial({ color: '#d27a45', roughness: 0.36, metalness: 0.72 }),
    plasticBlue: new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.35, metalness: 0.12 }),
    glass: new THREE.MeshStandardMaterial({
      color: '#bae6fd',
      roughness: 0.14,
      metalness: 0.1,
      transparent: true,
      opacity: 0.56,
    }),
    waterTint: new THREE.MeshStandardMaterial({
      color: '#22d3ee',
      emissive: '#0891b2',
      emissiveIntensity: 0.35,
      roughness: 0.18,
      metalness: 0.08,
    }),
    foliage: new THREE.MeshStandardMaterial({ color: '#38b764', roughness: 0.72, metalness: 0.0 }),
    soil: new THREE.MeshStandardMaterial({ color: '#5c3c24', roughness: 0.95, metalness: 0.0 }),
    houseFloor: new THREE.MeshStandardMaterial({ map: housePlankTex, roughness: 0.68, metalness: 0.04 }),
    houseWall: new THREE.MeshStandardMaterial({ map: housePlankTex, color: '#f3dec2', roughness: 0.72, metalness: 0.02 }),
    roofShingle: new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.8, metalness: 0.05 }),
    rugMat: new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.9, metalness: 0.0 }),
    bedBlanket: new THREE.MeshStandardMaterial({ map: blanketTex, roughness: 0.85, metalness: 0.0 }),
    pillow: new THREE.MeshStandardMaterial({ color: '#f8f2e6', roughness: 0.88, metalness: 0.0 }),
    lampGlow: new THREE.MeshStandardMaterial({
      color: '#fde68a',
      emissive: '#f59e0b',
      emissiveIntensity: 0.9,
      roughness: 0.3,
    }),
    windowGlow: new THREE.MeshStandardMaterial({
      color: '#bae6fd',
      emissive: '#fbbf24',
      emissiveIntensity: 0.15,
      roughness: 0.2,
      transparent: true,
      opacity: 0.72,
    }),
    skin: new THREE.MeshStandardMaterial({ color: '#f2be96', roughness: 0.72, metalness: 0.0 }),
    shirt: new THREE.MeshStandardMaterial({ color: '#2b7a94', roughness: 0.78, metalness: 0.04 }),
    pants: new THREE.MeshStandardMaterial({ color: '#2b3d52', roughness: 0.84, metalness: 0.04 }),
    hair: new THREE.MeshStandardMaterial({ color: '#3b2416', roughness: 0.85, metalness: 0.02 }),
    sharkBody: new THREE.MeshStandardMaterial({ color: '#475c70', roughness: 0.42, metalness: 0.12 }),
    sharkBelly: new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.55, metalness: 0.05 }),
    sharkWhite: new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.4, metalness: 0.0 }),
    redAccent: new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.55, metalness: 0.1 }),
  };

  return {
    ...mats,
    dispose: () => {
      textures.forEach((t) => t.dispose());
      Object.values(mats).forEach((m) => m.dispose());
    },
  };
}

function enableShadows(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
}

export interface RaftTileVisual {
  group: THREE.Group;
  setStatus: (status: TileStatus) => void;
  setReinforced: (reinforced: boolean) => void;
}

export function createRaftTileVisual(mats: MaterialLibrary, seed = 0): RaftTileVisual {
  const group = new THREE.Group();
  const s = TILE_SIZE;
  const planks: THREE.Mesh[] = [];
  const plankGeo = new THREE.BoxGeometry(s * 0.96, 0.16, s * 0.22);

  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(plankGeo, mats.raftWood);
    m.position.set(0, 0.08, (i - 1.5) * (s * 0.24));
    m.rotation.y = (((seed + i * 7) % 5) - 2) * 0.008;
    group.add(m);
    planks.push(m);
  }

  // Under-beams + rope lashes
  const beamGeo = new THREE.BoxGeometry(0.16, 0.12, s * 0.94);
  for (const bx of [-s * 0.34, s * 0.34]) {
    const beam = new THREE.Mesh(beamGeo, mats.raftWoodDark);
    beam.position.set(bx, -0.02, 0);
    group.add(beam);

    const rope = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, s * 0.96), mats.rope);
    rope.position.set(bx, 0.08, 0);
    rope.scale.set(0.85, 0.95, 0.14);
    group.add(rope);
  }

  // Iron-edged reinforcement frame
  const reinforceGroup = new THREE.Group();
  const edgeLong = new THREE.BoxGeometry(s * 0.98, 0.19, 0.09);
  const edgeSide = new THREE.BoxGeometry(0.09, 0.19, s * 0.98);
  const nRim = new THREE.Mesh(edgeLong, mats.iron);
  nRim.position.set(0, 0.09, -s * 0.46);
  const sRim = new THREE.Mesh(edgeLong, mats.iron);
  sRim.position.set(0, 0.09, s * 0.46);
  const wRim = new THREE.Mesh(edgeSide, mats.iron);
  wRim.position.set(-s * 0.46, 0.09, 0);
  const eRim = new THREE.Mesh(edgeSide, mats.iron);
  eRim.position.set(s * 0.46, 0.09, 0);
  reinforceGroup.add(nRim, sRim, wRim, eRim);
  reinforceGroup.visible = false;
  group.add(reinforceGroup);

  enableShadows(group);

  return {
    group,
    setStatus: (status) => {
      if (status === 'broken') {
        group.visible = false;
      } else {
        group.visible = true;
        const mat = status === 'damaged' ? mats.raftWoodDamaged : mats.raftWood;
        planks.forEach((p, idx) => {
          p.material = mat;
          p.rotation.z = status === 'damaged' ? (idx % 2 === 0 ? 0.06 : -0.05) : 0;
        });
      }
    },
    setReinforced: (reinforced) => {
      reinforceGroup.visible = reinforced;
    },
  };
}

export interface BuildingVisual {
  group: THREE.Group;
  update: (dt: number, progress: number, storedOutput: number) => void;
}

export function createBuildingVisual(type: FacilityType, mats: MaterialLibrary): BuildingVisual {
  const group = new THREE.Group();
  let indicatorMesh: THREE.Mesh | null = null;
  let animatedPart: THREE.Object3D | null = null;

  if (type === 'purifier') {
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.22, 0.95), mats.raftWoodDark);
    stand.position.y = 0.26;
    const kettle = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.42, 10), mats.copper);
    kettle.position.y = 0.56;
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
      mats.glass,
    );
    dome.position.y = 0.78;
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.48, 8), mats.copper);
    pipe.position.set(0.32, 0.92, 0);
    pipe.rotation.z = -0.6;
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.48, 10), mats.plasticBlue);
    tank.position.set(0.42, 0.58, 0);
    const waterCore = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.36, 10), mats.waterTint);
    waterCore.position.set(0.42, 0.55, 0);
    waterCore.scale.y = 0.05;
    indicatorMesh = waterCore;
    group.add(stand, kettle, dome, pipe, tank, waterCore);
  } else if (type === 'garden') {
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.28, 1.38), mats.raftWoodDark);
    box.position.y = 0.3;
    const soil = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.12, 1.22), mats.soil);
    soil.position.y = 0.42;
    const plants = new THREE.Group();
    const positions = [
      [-0.32, -0.32],
      [0.32, -0.32],
      [-0.32, 0.32],
      [0.32, 0.32],
    ];
    for (const [px, pz] of positions) {
      const leaf = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), mats.foliage);
      leaf.position.set(px, 0.56, pz);
      plants.add(leaf);
    }
    const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), mats.redAccent);
    fruit.position.set(0, 0.74, 0);
    fruit.visible = false;
    indicatorMesh = fruit;
    animatedPart = plants;
    group.add(box, soil, plants, fruit);
  } else if (type === 'workbench') {
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.12, 0.9), mats.raftWood);
    top.position.y = 0.78;
    const legGeo = new THREE.BoxGeometry(0.14, 0.62, 0.14);
    for (const lx of [-0.56, 0.56]) {
      for (const lz of [-0.32, 0.32]) {
        const leg = new THREE.Mesh(legGeo, mats.raftWoodDark);
        leg.position.set(lx, 0.46, lz);
        group.add(leg);
      }
    }
    const blueprint = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.03, 0.42), mats.plasticBlue);
    blueprint.position.set(-0.24, 0.85, 0.05);
    const vice = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.22), mats.iron);
    vice.position.set(0.45, 0.92, -0.18);
    const hammer = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.36, 6), mats.copper);
    hammer.position.set(0.15, 0.88, 0.15);
    hammer.rotation.z = Math.PI / 2;
    group.add(top, blueprint, vice, hammer);
  } else if (type === 'defense') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.2, 1.24), mats.raftWoodDark);
    base.position.y = 0.25;
    group.add(base);
    const spearGeo = new THREE.ConeGeometry(0.09, 0.95, 6);
    const angles = [
      [-0.36, -0.36, 0.35, -0.35],
      [0.36, -0.36, -0.35, -0.35],
      [-0.36, 0.36, 0.35, 0.35],
      [0.36, 0.36, -0.35, 0.35],
    ];
    for (const [x, z, rz, rx] of angles) {
      const spear = new THREE.Mesh(spearGeo, mats.iron);
      spear.position.set(x, 0.62, z);
      spear.rotation.set(rx, 0, rz);
      group.add(spear);
    }
    const banner = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), mats.copper);
    banner.position.y = 0.65;
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.04), mats.redAccent);
    flag.position.set(0.18, 0.98, 0);
    group.add(banner, flag);
  } else if (type === 'collector') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.16, 1.36), mats.raftWoodDark);
    base.position.y = 0.24;
    const postGeo = new THREE.BoxGeometry(0.12, 1.05, 0.12);
    const postL = new THREE.Mesh(postGeo, mats.raftWood);
    postL.position.set(-0.52, 0.72, -0.35);
    const postR = new THREE.Mesh(postGeo, mats.raftWood);
    postR.position.set(0.52, 0.72, -0.35);
    const crossBar = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.11, 0.12), mats.raftWoodDark);
    crossBar.position.set(0, 1.2, -0.35);

    const netFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.16, 0.08, 0.85),
      new THREE.MeshStandardMaterial({ color: 0xc2a981, roughness: 0.9, wireframe: true }),
    );
    netFrame.position.set(0, 0.36, 0.22);
    netFrame.rotation.x = 0.28;

    const reelGroup = new THREE.Group();
    reelGroup.position.set(0, 1.2, -0.35);
    const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.42, 10), mats.copper);
    spool.rotation.z = Math.PI / 2;
    const spokes = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.36, 0.06), mats.rope);
    reelGroup.add(spool, spokes);
    animatedPart = reelGroup;

    group.add(base, postL, postR, crossBar, netFrame, reelGroup);
  } else {
    // repair_station
    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.68, 0.85), mats.raftWoodDark);
    cabinet.position.y = 0.5;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.12, 0.92), mats.iron);
    cap.position.y = 0.88;
    const gear = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.06, 6, 12), mats.copper);
    gear.position.set(0, 1.15, 0);
    animatedPart = gear;
    group.add(cabinet, cap, gear);
  }

  enableShadows(group);

  return {
    group,
    update: (dt, progress, storedOutput) => {
      if (type === 'purifier' && indicatorMesh) {
        const fill = Math.min(1, storedOutput / 3 + progress * 0.25);
        indicatorMesh.scale.y = Math.max(0.08, fill);
        indicatorMesh.position.y = 0.39 + indicatorMesh.scale.y * 0.18;
      }
      if (type === 'garden') {
        if (animatedPart) {
          const s = 0.55 + Math.min(1, progress + storedOutput * 0.5) * 0.55;
          animatedPart.scale.setScalar(s);
        }
        if (indicatorMesh) {
          indicatorMesh.visible = storedOutput > 0;
        }
      }
      if (type === 'repair_station' && animatedPart) {
        animatedPart.rotation.y += dt * 1.4;
      }
      if (type === 'collector' && animatedPart) {
        animatedPart.rotation.x += dt * 1.8;
      }
    },
  };
}

export function createHouseFloorVisual(mats: MaterialLibrary): THREE.Group {
  const group = new THREE.Group();
  const s = TILE_SIZE;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(s * 0.98, 0.08, s * 0.98), mats.houseFloor);
  floor.position.y = 0.19;
  group.add(floor);
  enableShadows(group);
  return group;
}

export interface HouseRoofVisual {
  group: THREE.Group;
  setCutaway: (hidden: boolean) => void;
}

export function createHouseRoofVisual(mats: MaterialLibrary): HouseRoofVisual {
  const group = new THREE.Group();
  const s = TILE_SIZE;
  const beam = new THREE.Mesh(new THREE.BoxGeometry(s * 1.02, 0.12, s * 1.02), mats.raftWoodDark);
  beam.position.y = 2.04;
  const shingle = new THREE.Mesh(new THREE.BoxGeometry(s * 1.06, 0.14, s * 1.06), mats.roofShingle);
  shingle.position.y = 2.16;
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(s * 1.06, 0.16, 0.32), mats.roofShingle);
  ridge.position.y = 2.28;
  group.add(beam, shingle, ridge);
  enableShadows(group);
  return {
    group,
    setCutaway: (hidden) => {
      group.visible = !hidden;
    },
  };
}

export interface EdgeWallVisual {
  group: THREE.Group;
  setDoorOpen: (open: number) => void;
  setHasDecor: (hasDecor: boolean) => void;
  setNightGlow: (factor: number) => void;
}

export function createEdgeWallVisual(type: WallType, mats: MaterialLibrary): EdgeWallVisual {
  const group = new THREE.Group();
  const s = TILE_SIZE;
  const h = 1.85;
  let doorPivot: THREE.Group | null = null;
  let windowGlass: THREE.Mesh | null = null;

  // Base sill
  const sill = new THREE.Mesh(new THREE.BoxGeometry(s, 0.12, 0.18), mats.raftWoodDark);
  sill.position.y = 0.22;
  group.add(sill);

  if (type === 'wall') {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(s * 0.96, h, 0.14), mats.houseWall);
    panel.position.y = 0.22 + h / 2;
    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(s, 0.14, 0.2), mats.raftWoodDark);
    topBeam.position.y = 0.22 + h;
    group.add(panel, topBeam);
  } else if (type === 'window') {
    const bottom = new THREE.Mesh(new THREE.BoxGeometry(s * 0.96, 0.72, 0.14), mats.houseWall);
    bottom.position.y = 0.58;
    const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.78, 0.14), mats.houseWall);
    leftPost.position.set(-s * 0.3, 1.33, 0);
    const rightPost = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.78, 0.14), mats.houseWall);
    rightPost.position.set(s * 0.3, 1.33, 0);
    const top = new THREE.Mesh(new THREE.BoxGeometry(s, 0.35, 0.18), mats.raftWoodDark);
    top.position.y = 1.9;
    windowGlass = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.72, 0.06), mats.windowGlow.clone());
    windowGlass.position.set(0, 1.33, 0);
    group.add(bottom, leftPost, rightPost, top, windowGlass);
  } else {
    // door
    const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.45, h, 0.16), mats.houseWall);
    leftPillar.position.set(-s * 0.38, 0.22 + h / 2, 0);
    const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(0.45, h, 0.16), mats.houseWall);
    rightPillar.position.set(s * 0.38, 0.22 + h / 2, 0);
    const header = new THREE.Mesh(new THREE.BoxGeometry(s, 0.36, 0.18), mats.raftWoodDark);
    header.position.y = 1.9;

    doorPivot = new THREE.Group();
    doorPivot.position.set(-0.46, 0.24, 0);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.48, 0.1), mats.raftWoodDark);
    leaf.position.set(0.46, 0.74, 0);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), mats.copper);
    knob.position.set(0.82, 0.72, 0.08);
    doorPivot.add(leaf, knob);
    group.add(leftPillar, rightPillar, header, doorPivot);
  }

  // Optional lifebuoy wall decoration
  const decorGroup = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.075, 8, 16), mats.redAccent);
  ring.position.set(0, 1.25, 0.12);
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.08), mats.pillow);
  badge.position.set(0, 1.25, 0.16);
  decorGroup.add(ring, badge);
  decorGroup.visible = false;
  group.add(decorGroup);

  enableShadows(group);

  return {
    group,
    setDoorOpen: (open) => {
      if (doorPivot) {
        doorPivot.rotation.y = open * 1.35;
      }
    },
    setHasDecor: (hasDecor) => {
      decorGroup.visible = hasDecor;
    },
    setNightGlow: (factor) => {
      if (windowGlass) {
        const mat = windowGlass.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.12 + factor * 1.1;
      }
    },
  };
}

export interface FurnitureVisual {
  group: THREE.Group;
  setNightIntensity: (factor: number) => void;
}

export function createFurnitureVisual(
  type: Exclude<FurnitureType, 'wall_decor'>,
  mats: MaterialLibrary,
): FurnitureVisual {
  const group = new THREE.Group();
  let pointLight: THREE.PointLight | null = null;
  let bulbMesh: THREE.Mesh | null = null;

  if (type === 'bed') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.24, 1.56), mats.raftWoodDark);
    frame.position.y = 0.34;
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.56, 0.12), mats.raftWoodDark);
    headboard.position.set(0, 0.58, -0.72);
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.18, 1.42), mats.pillow);
    mattress.position.set(0, 0.48, 0.02);
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.2, 0.95), mats.bedBlanket);
    blanket.position.set(0, 0.5, 0.24);
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.12, 0.32), mats.pillow);
    pillow.position.set(0, 0.6, -0.46);
    group.add(frame, headboard, mattress, blanket, pillow);
  } else if (type === 'chest') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.52, 0.66), mats.raftWoodDark);
    body.position.y = 0.46;
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.99, 0.16, 0.7), mats.raftWood);
    lid.position.y = 0.76;
    const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.66, 0.72), mats.iron);
    strapL.position.set(-0.28, 0.54, 0);
    const strapR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.66, 0.72), mats.iron);
    strapR.position.set(0.28, 0.54, 0);
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.08), mats.copper);
    lock.position.set(0, 0.68, 0.36);
    group.add(body, lid, strapL, strapR, lock);
  } else if (type === 'table_chair') {
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.1, 0.76), mats.raftWood);
    tableTop.position.set(-0.1, 0.76, 0);
    const legGeo = new THREE.BoxGeometry(0.1, 0.54, 0.1);
    for (const lx of [-0.48, 0.28]) {
      for (const lz of [-0.28, 0.28]) {
        const leg = new THREE.Mesh(legGeo, mats.raftWoodDark);
        leg.position.set(lx, 0.46, lz);
        group.add(leg);
      }
    }
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.14, 8), mats.copper);
    mug.position.set(-0.18, 0.88, 0.05);
    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.42), mats.raftWoodDark);
    chairSeat.position.set(0.55, 0.52, 0);
    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.48, 0.42), mats.raftWoodDark);
    chairBack.position.set(0.72, 0.78, 0);
    group.add(tableTop, mug, chairSeat, chairBack);
  } else if (type === 'lamp') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.12, 10), mats.iron);
    base.position.y = 0.28;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.15, 8), mats.iron);
    pole.position.y = 0.86;
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.28, 8, 1, true), mats.copper);
    shade.position.set(0.14, 1.44, 0);
    bulbMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), mats.lampGlow.clone());
    bulbMesh.position.set(0.14, 1.32, 0);
    pointLight = new THREE.PointLight('#ffb74d', 1.2, 8.5, 1.6);
    pointLight.position.set(0.14, 1.3, 0);
    group.add(base, pole, shade, bulbMesh, pointLight);
  } else {
    // rug
    const rug = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.03, 1.24), mats.rugMat);
    rug.position.y = 0.245;
    group.add(rug);
  }

  enableShadows(group);
  if (pointLight) {
    pointLight.castShadow = false;
  }

  return {
    group,
    setNightIntensity: (factor) => {
      if (pointLight) {
        pointLight.intensity = 0.4 + factor * 2.6;
      }
      if (bulbMesh) {
        const m = bulbMesh.material as THREE.MeshStandardMaterial;
        m.emissiveIntensity = 0.5 + factor * 1.4;
      }
    },
  };
}

export function createFloatingItemVisual(type: ResourceType, mats: MaterialLibrary): THREE.Group {
  const group = new THREE.Group();
  if (type === 'wood') {
    const log1 = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.95, 7), mats.raftWood);
    log1.rotation.z = Math.PI / 2;
    const log2 = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.82, 7), mats.raftWoodDark);
    log2.rotation.z = Math.PI / 2;
    log2.rotation.y = 0.35;
    log2.position.set(0.05, 0.1, 0.18);
    group.add(log1, log2);
  } else if (type === 'plastic') {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.56, 10), mats.plasticBlue);
    barrel.rotation.z = 1.25;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.1, 10), mats.copper);
    band.rotation.z = 1.25;
    group.add(barrel, band);
  } else if (type === 'metal') {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.42), mats.iron);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.65, 8), mats.copper);
    pipe.position.set(0.1, 0.2, 0);
    pipe.rotation.z = 0.7;
    group.add(crate, pipe);
  } else {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.32, 0.42), mats.raftWood);
    const apple = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), mats.redAccent);
    apple.position.set(-0.08, 0.22, 0.04);
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.14, 5), mats.foliage);
    leaf.position.set(0.1, 0.24, -0.05);
    group.add(crate, apple, leaf);
  }
  enableShadows(group);
  return group;
}

export type PlayerHandMode = 'hook' | 'build' | 'repair' | 'spear';

export interface PlayerVisual {
  group: THREE.Group;
  setHandMode: (mode: PlayerHandMode) => void;
  triggerSpearThrust: () => void;
  update: (
    dt: number,
    speed: number,
    hookActive: boolean,
    hitFlash: number,
    holdKind?: string | null,
    holdProgress?: number,
    inWater?: boolean,
  ) => void;
}

export function createPlayerVisual(mats: MaterialLibrary): PlayerVisual {
  const group = new THREE.Group();

  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.46, 0.2), mats.pants);
  leftLeg.position.set(-0.12, 0.23, 0);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.46, 0.2), mats.pants);
  rightLeg.position.set(0.12, 0.23, 0);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.54, 0.28), mats.shirt);
  torso.position.y = 0.7;

  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.4, 0.16), mats.raftWoodDark);
  pack.position.set(0, 0.72, -0.2);

  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.46, 0.16), mats.skin);
  leftArm.position.set(-0.33, 0.68, 0);
  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.46, 0.16), mats.skin);
  rightArm.position.set(0.33, 0.68, 0);

  // Hand tools attached to rightArm
  const hookProp = new THREE.Group();
  const hookHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 6), mats.rope);
  hookHandle.rotation.x = Math.PI / 2;
  hookHandle.position.set(0, -0.18, 0.18);
  const hookClaw = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 6, 10, Math.PI * 1.3), mats.iron);
  hookClaw.position.set(0, -0.18, 0.36);
  hookProp.add(hookHandle, hookClaw);

  const hammerProp = new THREE.Group();
  const hammerShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.03, 0.44, 6), mats.raftWoodDark);
  hammerShaft.rotation.x = Math.PI / 2;
  hammerShaft.position.set(0, -0.18, 0.22);
  const hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.1), mats.iron);
  hammerHead.position.set(0, -0.18, 0.42);
  hammerProp.add(hammerShaft, hammerHead);
  hammerProp.visible = false;

  const spearProp = new THREE.Group();
  const spearShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.028, 1.2, 6), mats.raftWood);
  spearShaft.rotation.x = Math.PI / 2;
  spearShaft.position.set(0, -0.18, 0.34);
  const spearTip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.24, 6), mats.iron);
  spearTip.rotation.x = Math.PI / 2;
  spearTip.position.set(0, -0.18, 1.0);
  spearProp.add(spearShaft, spearTip);
  spearProp.visible = false;

  rightArm.add(hookProp, hammerProp, spearProp);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.34), mats.skin);
  head.position.y = 1.18;
  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.05, 10), mats.rope);
  hatBrim.position.y = 1.36;
  const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.16, 10), mats.raftWood);
  hatCrown.position.y = 1.44;

  // Water ripple ring shown only while swimming
  const swimRing = new THREE.Mesh(
    new THREE.RingGeometry(0.38, 0.56, 20),
    new THREE.MeshBasicMaterial({
      color: '#bae6fd',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.52,
    }),
  );
  swimRing.rotation.x = -Math.PI / 2;
  swimRing.position.y = 0.56;
  swimRing.visible = false;

  group.add(leftLeg, rightLeg, torso, pack, leftArm, rightArm, head, hatBrim, hatCrown, swimRing);
  enableShadows(group);
  swimRing.castShadow = false;

  let walkPhase = 0;
  let spearThrustTimer = 0;

  return {
    group,
    setHandMode: (mode) => {
      hookProp.visible = mode === 'hook';
      hammerProp.visible = mode === 'build' || mode === 'repair';
      spearProp.visible = mode === 'spear';
    },
    triggerSpearThrust: () => {
      spearThrustTimer = 0.24;
    },
    update: (
      dt,
      speed,
      hookActive,
      hitFlash,
      holdKind = null,
      holdProgress = 0,
      inWater = false,
    ) => {
      if (spearThrustTimer > 0) {
        spearThrustTimer = Math.max(0, spearThrustTimer - dt);
      }

      if (inWater) {
        swimRing.visible = true;
        walkPhase += dt * (speed > 0.15 ? 9.5 : 3.2);
        const s = 1 + Math.sin(walkPhase * 1.3) * 0.12;
        swimRing.scale.set(s, s, 1);
        leftArm.rotation.x = -1.1 + Math.sin(walkPhase) * 0.55;
        rightArm.rotation.x = hookActive ? -1.2 : -1.1 - Math.sin(walkPhase) * 0.55;
        leftLeg.rotation.x = Math.sin(walkPhase * 1.4) * 0.35;
        rightLeg.rotation.x = -Math.sin(walkPhase * 1.4) * 0.35;
        torso.position.y = 0.7;
      } else {
        swimRing.visible = false;
        if (speed > 0.15) {
          walkPhase += dt * 11;
          const swing = Math.sin(walkPhase) * 0.55;
          leftLeg.rotation.x = swing;
          rightLeg.rotation.x = -swing;
          leftArm.rotation.x = -swing * 0.8;
          rightArm.rotation.x = hookActive ? -1.2 : swing * 0.8;
          torso.position.y = 0.7 + Math.abs(Math.cos(walkPhase)) * 0.04;
        } else {
          leftLeg.rotation.x *= 0.8;
          rightLeg.rotation.x *= 0.8;
          leftArm.rotation.x *= 0.8;
          rightArm.rotation.x = hookActive ? -1.2 : rightArm.rotation.x * 0.8;
          torso.position.y = 0.7;
        }
      }

      if (spearThrustTimer > 0) {
        const thrust = Math.sin((spearThrustTimer / 0.24) * Math.PI);
        rightArm.rotation.x = -1.45;
        rightArm.position.z = thrust * 0.28;
      } else {
        rightArm.position.z = 0;
        if (holdKind === 'repair') {
          rightArm.rotation.x = -0.9 + Math.sin(holdProgress * Math.PI * 6) * 0.65;
        } else if (holdKind === 'harvest' || holdKind === 'rest') {
          rightArm.rotation.x = -0.6 + Math.sin(holdProgress * Math.PI * 4) * 0.3;
        }
      }

      if (hitFlash > 0) {
        group.position.y += Math.sin(hitFlash * 35) * 0.03;
      }
    },
  };
}

export interface SharkVisual {
  group: THREE.Group;
  update: (dt: number, lungeFactor: number, hitFlash: number) => void;
}

export function createSharkVisual(mats: MaterialLibrary): SharkVisual {
  const group = new THREE.Group();

  const bodyMat = mats.sharkBody.clone();

  // Streamlined mid-fuselage + tapered snout + tapered tail stalk
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.44, 1.45, 10), bodyMat);
  torso.rotation.x = Math.PI / 2;
  torso.scale.set(0.92, 1, 0.78);
  torso.position.set(0, 0.02, 0.15);

  const head = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.92, 10), bodyMat);
  head.rotation.x = Math.PI / 2;
  head.scale.set(0.96, 1, 0.72);
  head.position.set(0, 0.01, 1.32);

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.56), mats.sharkBelly);
  jaw.position.set(0, -0.1, 1.18);

  const belly = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 1.35, 8), mats.sharkBelly);
  belly.rotation.x = Math.PI / 2;
  belly.scale.set(0.9, 1, 0.48);
  belly.position.set(0, -0.14, 0.2);

  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.88, 5), bodyMat);
  dorsal.position.set(0, 0.52, 0.22);
  dorsal.rotation.x = -0.38;
  dorsal.scale.set(0.36, 1, 1.25);

  // Swept pectoral fins
  const pecGeo = new THREE.ConeGeometry(0.18, 0.72, 4);
  const pecL = new THREE.Mesh(pecGeo, bodyMat);
  pecL.position.set(-0.46, -0.12, 0.46);
  pecL.rotation.set(0.25, 0.25, 1.32);
  pecL.scale.set(0.32, 1, 0.9);

  const pecR = new THREE.Mesh(pecGeo, bodyMat);
  pecR.position.set(0.46, -0.12, 0.46);
  pecR.rotation.set(0.25, -0.25, -1.32);
  pecR.scale.set(0.32, 1, 0.9);

  // Tail stalk + twin-lobed crescent caudal fin
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.02, -0.56);
  const tailStalk = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.95, 8), bodyMat);
  tailStalk.rotation.x = -Math.PI / 2;
  tailStalk.scale.set(0.7, 1, 0.75);
  tailStalk.position.z = -0.45;

  const upperTail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.72, 4), bodyMat);
  upperTail.position.set(0, 0.26, -1.04);
  upperTail.rotation.x = -0.68;
  upperTail.scale.set(0.26, 1, 0.95);

  const lowerTail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.48, 4), bodyMat);
  lowerTail.position.set(0, -0.18, -0.98);
  lowerTail.rotation.x = 2.38;
  lowerTail.scale.set(0.24, 1, 0.85);

  tailPivot.add(tailStalk, upperTail, lowerTail);

  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), mats.sharkWhite);
  eyeL.position.set(-0.22, 0.08, 1.18);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), mats.sharkWhite);
  eyeR.position.set(0.22, 0.08, 1.18);

  group.add(torso, head, jaw, belly, dorsal, pecL, pecR, tailPivot, eyeL, eyeR);
  enableShadows(group);

  let swimPhase = 0;

  return {
    group,
    update: (dt, lungeFactor, hitFlash) => {
      swimPhase += dt * (4.5 + lungeFactor * 5.0);
      tailPivot.rotation.y = Math.sin(swimPhase) * 0.45;
      group.rotation.z = Math.sin(swimPhase * 0.5) * 0.06;
      if (hitFlash > 0) {
        bodyMat.emissive.setHex(0xef4444);
        bodyMat.emissiveIntensity = hitFlash * 1.4;
      } else {
        bodyMat.emissiveIntensity = 0;
      }
    },
  };
}
