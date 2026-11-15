export type ResourceType = 'wood' | 'plastic' | 'metal' | 'food';

export interface Resources {
  wood: number;
  plastic: number;
  metal: number;
  food: number;
  water: number; // Clean water collected from Water Purifier
}

export type FacilityType =
  | 'purifier'
  | 'garden'
  | 'workbench'
  | 'defense'
  | 'repair_station'
  | 'collector';

export type HouseStructureType =
  | 'house_floor'
  | 'wall'
  | 'door'
  | 'window'
  | 'roof';

export type FurnitureType =
  | 'bed'
  | 'chest'
  | 'table_chair'
  | 'lamp'
  | 'rug'
  | 'wall_decor';

export type BuildItemId =
  | 'floor'
  | 'reinforce'
  | FacilityType
  | HouseStructureType
  | FurnitureType;

export type BuildCategory =
  | 'structure'
  | 'survival'
  | 'production'
  | 'defense'
  | 'house'
  | 'decor';

export type InteractionTool = BuildItemId | 'repair' | 'demolish' | null;

export type RotationDir = 0 | 1 | 2 | 3; // 0, 90, 180, 270 degrees
export type EdgeAxis = 'H' | 'V'; // H = north/south boundary (along X), V = east/west boundary (along Z)
export type WallType = 'wall' | 'door' | 'window';

export interface BuildingCost {
  wood?: number;
  plastic?: number;
  metal?: number;
  food?: number;
}

export interface BuildItemDef {
  id: BuildItemId;
  category: BuildCategory;
  name: string;
  shortDesc: string;
  detailDesc: string;
  cost: BuildingCost;
  requiresWorkbench: boolean;
  lateGameUnlock?: boolean;
  placementKind:
    | 'sea_floor'
    | 'tile_upgrade'
    | 'facility'
    | 'house_floor'
    | 'house_roof'
    | 'edge_wall'
    | 'furniture'
    | 'wall_decor';
  rotatable?: boolean;
  hotkey?: string;
}

export type TileStatus = 'intact' | 'damaged' | 'broken';

export interface TileBuildingState {
  type: FacilityType;
  hp: number;
  maxHp: number;
  progress: number;
  storedOutput: number;
  cooldown: number;
}

export interface FurnitureState {
  type: Exclude<FurnitureType, 'wall_decor'>;
  rotation: RotationDir;
}

export interface RaftTile {
  key: string;
  gx: number;
  gz: number;
  hp: number;
  maxHp: number;
  status: TileStatus;
  reinforced: boolean;
  hasHouseFloor: boolean;
  hasRoof: boolean;
  building: TileBuildingState | null;
  furniture: FurnitureState | null;
  rug: RotationDir | null;
}

export interface EdgeWallState {
  key: string;
  axis: EdgeAxis;
  gx: number;
  gz: number;
  type: WallType;
  hasDecor: boolean;
  doorOpen: number;
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';
export type WeatherType = 'clear' | 'overcast' | 'storm';
export type StageId = 1 | 2 | 3 | 4;

export type SharkBehavior = 'circling' | 'warning' | 'attacking' | 'repelled';

export interface SharkHudState {
  behavior: SharkBehavior;
  hp: number;
  maxHp: number;
  targetTileKey: string | null;
  warningTimer: number;
  warningDuration: number;
  isFrenzy: boolean;
}

export interface SurvivalStats {
  health: number;
  maxHealth: number;
  hunger: number;
  maxHunger: number;
  thirst: number;
  maxThirst: number;
}

export interface StageGoalItem {
  id: string;
  label: string;
  current: number;
  target: number;
  done: boolean;
}

export type GamePhase = 'title' | 'playing' | 'paused' | 'day_summary' | 'gameover';

export interface GameStats {
  resourcesCollected: number;
  tilesBuilt: number;
  buildingsConstructed: number;
  housePartsBuilt: number;
  furniturePlaced: number;
  sharksRepelled: number;
  foodHarvested: number;
  waterCollected: number;
  daysSurvived: number;
}

export interface DailyReportStats {
  dayCompleted: number;
  resourcesCollectedToday: number;
  builtToday: number;
  sharksRepelledToday: number;
  damageTakenToday: number;
  nextWeather: WeatherType;
}

export interface FloatingPopup {
  id: number;
  text: string;
  x: number;
  y: number;
  tone: 'wood' | 'plastic' | 'metal' | 'food' | 'water' | 'heal' | 'damage' | 'info';
  isClaim?: boolean;
}

export interface ToastMessage {
  id: number;
  text: string;
  tone: 'info' | 'success' | 'warning' | 'danger';
}

export type HoldActionKind = 'repair' | 'harvest' | 'rest';

export interface HoldProgressState {
  kind: HoldActionKind;
  label: string;
  progress: number; // 0..1
  duration: number;
}

export interface ContextualHints {
  canSalvage: boolean;
  nearestFloatingType: ResourceType | null;
  canFightShark: boolean;
  canRepairNearby: boolean;
  canHarvestNearby: boolean;
  nearestHarvestKind: 'water' | 'food' | null;
  canRestBed: boolean;
  bedSkipNight: boolean;
}

export interface PendingPlacementInfo {
  tool: BuildItemId;
  valid: boolean;
  reason: string;
}

export interface GameHudSnapshot {
  phase: GamePhase;
  day: number;
  dayProgress: number;
  clockLabel: string;
  timeOfDay: TimeOfDay;
  weather: WeatherType;
  nextWeather: WeatherType;
  stage: StageId;
  stageTitle: string;
  stageSubtitle: string;
  stageGoals: StageGoalItem[];
  resources: Resources;
  storageUsed: number;
  storageMax: number;
  survival: SurvivalStats;
  selectedTool: InteractionTool;
  activeModeLabel: string;
  pendingPlacement: PendingPlacementInfo | null;
  holdAction: HoldProgressState | null;
  playerInWater: boolean;
  rotation: RotationDir;
  roofCutaway: boolean;
  playerIndoors: boolean;
  nearBed: boolean;
  hasWorkbench: boolean;
  hasRepairStation: boolean;
  hasTableBuff: boolean;
  collectorUnlocked: boolean;
  collectorUnlockReason: string;
  lampCount: number;
  chestCount: number;
  defenseCount: number;
  reinforcedCount: number;
  houseFloorCount: number;
  wallCount: number;
  roofCount: number;
  furnitureCount: number;
  intactTileCount: number;
  damagedTileCount: number;
  brokenTileCount: number;
  totalTiles: number;
  shark: SharkHudState;
  context: ContextualHints;
  stats: GameStats;
  dailyReport: DailyReportStats | null;
  damageFlash: number;
  gameOverReason: string;
  muted: boolean;
  readyPickups: number;
}

export interface JournalEntry {
  id: string;
  day: number;
  clockLabel: string;
  weatherLabel: string;
  mood: string;
  text: string;
  createdAt: number;
}
