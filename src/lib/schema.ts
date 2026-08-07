export type JobStatus =
  | "uploaded"
  | "extracting"
  | "extracted"
  | "awaiting_approval"
  | "adapting"
  | "generating"
  | "ready"
  | "failed";

export type SettingType = "rural" | "urban" | "semi-urban";

export interface CultureSelection {
  dialect: string;
  region: string;
  setting: SettingType;
  label: string;
}

export interface Character {
  canonicalId: string;
  names: string[];
  aliases: string[];
  age: string;
  role: string;
  relationships: string[];
  personality: string[];
  dialect: string;
  physicalDescription: string;
  grooming: string;
  emotionalArc: string;
  identityLockPrompt: string;
  important: boolean;
  imagePath?: string;
}

export interface Location {
  canonicalId: string;
  name: string;
  aliases: string[];
  description: string;
  architectureCues: string;
}

export interface Prop {
  canonicalId: string;
  name: string;
  aliases: string[];
  description: string;
  ownerCharacterId?: string;
}

export interface CostumeVariant {
  canonicalId: string;
  characterId: string;
  label: string;
  garments: string[];
  fabrics: string[];
  colors: string[];
  footwear: string;
  jewelry: string[];
  headwear: string;
  grooming: string;
  sceneNumbers: number[];
  changeReason?: string;
  imagePath?: string;
}

export interface SceneProduction {
  set: string;
  costumes: string[];
  grooming: string[];
  jewelry: string[];
  props: string[];
  food: string[];
  vehicles: string[];
  animals: string[];
  extras: string[];
  rituals: string[];
  gestures: string[];
  soundMusic: string[];
  culturalCues: string[];
}

export interface Scene {
  number: number;
  slugline: string;
  intExt: "INT" | "EXT" | "INT/EXT" | "OTHER";
  locationId: string;
  subLocation: string;
  time: string;
  dayDate: string;
  weather: string;
  mood: string;
  summary: string;
  dramaticPurpose: string;
  characterIds: string[];
  entrances: string[];
  exits: string[];
  production: SceneProduction;
  imagePath?: string;
}

export interface CharacterContinuityBeat {
  characterId: string;
  wearing: string[];
  carrying: string[];
  knows: string[];
  injuries: string[];
  gained: string[];
  lost: string[];
  notes: string;
}

export interface ContinuitySceneState {
  sceneNumber: number;
  before: CharacterContinuityBeat[];
  after: CharacterContinuityBeat[];
}

export interface ContinuityIssue {
  id: string;
  severity: "warning" | "error";
  message: string;
  sceneNumbers: number[];
  entityIds: string[];
}

export interface CultureProfile {
  dialect: string;
  region: string;
  setting: SettingType;
  verbal: string[];
  nonverbal: string[];
  wardrobe: string[];
  architecture: string[];
  food: string[];
  socialRules: string[];
  humor: string[];
  adaptationNotes: string;
}

export interface AdaptationPlan {
  culture: CultureProfile;
  characterAdaptations: Array<{
    characterId: string;
    nameChanges: string;
    dialectNotes: string;
    personalityShift: string;
    wardrobeShift: string;
  }>;
  settingRemap: string;
  costumePlanSummary: string;
  approved: boolean;
}

export interface ExtractionResult {
  characters: Character[];
  locations: Location[];
  props: Prop[];
  costumes: CostumeVariant[];
  scenes: Scene[];
  continuity: ContinuitySceneState[];
  issues: ContinuityIssue[];
  adaptationPlan?: AdaptationPlan;
}

export interface VisualPack {
  characterImages: Record<string, string>;
  costumeImages: Record<string, string>;
  sceneImages: Record<string, string>;
  stylePrefix: string;
}

export interface Job {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: JobStatus;
  error?: string;
  originalText: string;
  sourceFilename?: string;
  cultures: CultureSelection[];
  primaryCulture: CultureSelection;
  extraction?: ExtractionResult;
  adaptedScreenplay?: string;
  visualPack?: VisualPack;
  approvedAt?: string;
  usageLogPath: string;
}

export const BANGRU_DEFAULT: CultureSelection = {
  dialect: "Bangru",
  region: "Haryana",
  setting: "rural",
  label: "Bangru Haryanvi (Haryana, rural)",
};

export const STYLE_PREFIX =
  "cinematic production still, naturalistic lighting, photorealistic, consistent character design, Indian film still, no text overlay, no watermark";
