import { z } from "zod";
import type {
  AdaptationPlan,
  Character,
  CharacterContinuityBeat,
  ContinuitySceneState,
  CostumeVariant,
  ExtractionResult,
  Location,
  Prop,
  Scene,
  SceneProduction,
} from "../schema";
import { buildBangruProfile } from "../culture/bangru";
import { chatJson } from "../ai/client";
import { parseScreenplay, type ParsedScreenplay } from "../parse/screenplay";
import {
  detectContinuityIssues,
  ensureIdentityLocks,
  mergeCharacters,
  mergeCostumes,
  mergeLocations,
  mergeProps,
} from "./dedupe";
import type { CultureSelection } from "../schema";

const emptyProduction = (): SceneProduction => ({
  set: "",
  costumes: [],
  grooming: [],
  jewelry: [],
  props: [],
  food: [],
  vehicles: [],
  animals: [],
  extras: [],
  rituals: [],
  gestures: [],
  soundMusic: [],
  culturalCues: [],
});

const emptyBeat = (characterId: string): CharacterContinuityBeat => ({
  characterId,
  wearing: [],
  carrying: [],
  knows: [],
  injuries: [],
  gained: [],
  lost: [],
  notes: "",
});

const CharacterSchema = z.object({
  canonicalId: z.string(),
  names: z.array(z.string()).default([]),
  aliases: z.array(z.string()).default([]),
  age: z.string().default(""),
  role: z.string().default(""),
  relationships: z.array(z.string()).default([]),
  personality: z.array(z.string()).default([]),
  dialect: z.string().default(""),
  physicalDescription: z.string().default(""),
  grooming: z.string().default(""),
  emotionalArc: z.string().default(""),
  identityLockPrompt: z.string().default(""),
  important: z.boolean().default(false),
});

const LocationSchema = z.object({
  canonicalId: z.string(),
  name: z.string(),
  aliases: z.array(z.string()).default([]),
  description: z.string().default(""),
  architectureCues: z.string().default(""),
});

const SceneSkeletonSchema = z.object({
  number: z.number(),
  slugline: z.string().default(""),
  intExt: z.enum(["INT", "EXT", "INT/EXT", "OTHER"]).default("OTHER"),
  locationId: z.string().default(""),
  subLocation: z.string().default(""),
  time: z.string().default(""),
  dayDate: z.string().default(""),
  weather: z.string().default(""),
  mood: z.string().default(""),
  summary: z.string().default(""),
  dramaticPurpose: z.string().default(""),
  characterIds: z.array(z.string()).default([]),
  entrances: z.array(z.string()).default([]),
  exits: z.array(z.string()).default([]),
});

const Pass1Schema = z.object({
  characters: z.array(CharacterSchema).default([]),
  locations: z.array(LocationSchema).default([]),
  scenes: z.array(SceneSkeletonSchema).default([]),
});

const PropSchema = z.object({
  canonicalId: z.string(),
  name: z.string(),
  aliases: z.array(z.string()).default([]),
  description: z.string().default(""),
  ownerCharacterId: z.string().optional(),
});

const CostumeSchema = z.object({
  canonicalId: z.string(),
  characterId: z.string(),
  label: z.string(),
  garments: z.array(z.string()).default([]),
  fabrics: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  footwear: z.string().default(""),
  jewelry: z.array(z.string()).default([]),
  headwear: z.string().default(""),
  grooming: z.string().default(""),
  sceneNumbers: z.array(z.number()).default([]),
  changeReason: z.string().optional(),
});

const BeatSchema = z.object({
  characterId: z.string(),
  wearing: z.array(z.string()).default([]),
  carrying: z.array(z.string()).default([]),
  knows: z.array(z.string()).default([]),
  injuries: z.array(z.string()).default([]),
  gained: z.array(z.string()).default([]),
  lost: z.array(z.string()).default([]),
  notes: z.string().default(""),
});

const Pass2Schema = z.object({
  production: z
    .object({
      set: z.string().default(""),
      costumes: z.array(z.string()).default([]),
      grooming: z.array(z.string()).default([]),
      jewelry: z.array(z.string()).default([]),
      props: z.array(z.string()).default([]),
      food: z.array(z.string()).default([]),
      vehicles: z.array(z.string()).default([]),
      animals: z.array(z.string()).default([]),
      extras: z.array(z.string()).default([]),
      rituals: z.array(z.string()).default([]),
      gestures: z.array(z.string()).default([]),
      soundMusic: z.array(z.string()).default([]),
      culturalCues: z.array(z.string()).default([]),
    })
    .default(emptyProduction()),
  props: z.array(PropSchema).default([]),
  costumes: z.array(CostumeSchema).default([]),
  before: z.array(BeatSchema).default([]),
  after: z.array(BeatSchema).default([]),
});

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

/**
 * Offline / parser-only extraction. Structure comes from format conventions
 * alone — no story-specific fixtures.
 */
export function parserExtract(text: string): ExtractionResult {
  const parsed = parseScreenplay(text);
  return buildFromParsed(parsed);
}

function buildFromParsed(parsed: ParsedScreenplay): ExtractionResult {
  const characters: Character[] = parsed.characterCues.map((name) => ({
    canonicalId: `char_${slugify(name)}`,
    names: [name],
    aliases: [],
    age: "",
    role: "speaking role",
    relationships: [],
    personality: [],
    dialect: "",
    physicalDescription: "",
    grooming: "",
    emotionalArc: "",
    identityLockPrompt: `same person always: ${name}, consistent face and body across all shots`,
    important: true,
  }));

  const locMap = new Map<string, Location>();
  for (const scene of parsed.scenes) {
    const key = slugify(scene.locationName || scene.slugline || `scene_${scene.number}`);
    if (!locMap.has(key)) {
      locMap.set(key, {
        canonicalId: `loc_${key}`,
        name: scene.locationName || scene.slugline,
        aliases: [scene.slugline],
        description: "",
        architectureCues: "",
      });
    }
  }
  const locations = [...locMap.values()];

  const nameToId = new Map(
    characters.flatMap((c) => c.names.map((n) => [n.toUpperCase(), c.canonicalId] as const)),
  );

  const scenes: Scene[] = parsed.scenes.map((scene) => {
    const locKey = slugify(scene.locationName || scene.slugline || `scene_${scene.number}`);
    const characterIds = scene.characterCues
      .map((cue) => nameToId.get(cue.toUpperCase()))
      .filter((id): id is string => Boolean(id));
    return {
      number: scene.number,
      slugline: scene.slugline,
      intExt: scene.intExt,
      locationId: `loc_${locKey}`,
      subLocation: scene.subLocation,
      time: scene.time,
      dayDate: "",
      weather: "",
      mood: "",
      summary: scene.action.slice(0, 280).replace(/\s+/g, " ").trim(),
      dramaticPurpose: "",
      characterIds,
      entrances: [],
      exits: [],
      production: {
        ...emptyProduction(),
        set: scene.slugline,
      },
    };
  });

  const continuity: ContinuitySceneState[] = scenes.map((scene) => ({
    sceneNumber: scene.number,
    before: scene.characterIds.map((id) => emptyBeat(id)),
    after: scene.characterIds.map((id) => emptyBeat(id)),
  }));

  const charactersLocked = ensureIdentityLocks(characters);
  return {
    characters: charactersLocked,
    locations,
    props: [],
    costumes: [],
    scenes,
    continuity,
    issues: detectContinuityIssues(charactersLocked, [], scenes, continuity),
  };
}

function fillMissingAfterStates(
  characters: Character[],
  scenes: Scene[],
  continuity: ContinuitySceneState[],
): ContinuitySceneState[] {
  return scenes.map((scene) => {
    const existing = continuity.find((c) => c.sceneNumber === scene.number) || {
      sceneNumber: scene.number,
      before: [],
      after: [],
    };
    const after = [...existing.after];
    const before = [...existing.before];
    for (const cid of scene.characterIds) {
      const char = characters.find((c) => c.canonicalId === cid);
      if (!char?.important) continue;
      if (!after.some((b) => b.characterId === cid)) {
        const prev = before.find((b) => b.characterId === cid);
        after.push(prev ? { ...prev, gained: [], lost: [], notes: prev.notes || "" } : emptyBeat(cid));
      }
      if (!before.some((b) => b.characterId === cid)) {
        before.push(emptyBeat(cid));
      }
    }
    return { sceneNumber: scene.number, before, after };
  });
}

async function llmPass1(opts: {
  text: string;
  parsed: ParsedScreenplay;
  usageLogPath: string;
}): Promise<z.infer<typeof Pass1Schema>> {
  const skeleton = opts.parsed.scenes.map((s) => ({
    number: s.number,
    slugline: s.slugline,
    intExt: s.intExt,
    locationName: s.locationName,
    subLocation: s.subLocation,
    time: s.time,
    characterCues: s.characterCues,
  }));

  const raw = await chatJson<unknown>({
    purpose: "extract_pass1_skeleton",
    usageLogPath: opts.usageLogPath,
    temperature: 0.15,
    system: `You extract a global screenplay skeleton for production breakdown.
Return JSON: { characters, locations, scenes }.
Merge aliases into one canonical character. Use stable ids: char_*, loc_*.
Scenes must keep the provided scene numbers and sluglines. Map characterIds to canonical ids.
identityLockPrompt must be a reusable visual lock (face, age, scars, build).
Mark speaking leads important:true.`,
    user: `PARSER SKELETON (ground truth for scene cuts / cues):
${JSON.stringify(skeleton, null, 2)}

FULL SCREENPLAY:
${opts.text.slice(0, 45000)}`,
  });

  return Pass1Schema.parse(raw);
}

async function llmPass2Scene(opts: {
  text: string;
  sceneNumber: number;
  sceneRaw: string;
  characters: Character[];
  previousAfter?: CharacterContinuityBeat[];
  usageLogPath: string;
}): Promise<z.infer<typeof Pass2Schema>> {
  const raw = await chatJson<unknown>({
    purpose: `extract_pass2_scene_${opts.sceneNumber}`,
    usageLogPath: opts.usageLogPath,
    temperature: 0.2,
    system: `You extract production detail and continuity deltas for ONE scene.
Return JSON: { production, props, costumes, before, after }.
before/after arrays need beats for every important character present.
Use the same characterIds provided. Prop/costume ids: prop_*, cos_*.
If a costume changes from prior scenes, set changeReason.
Carry forward items from previous after-state unless explicitly lost.`,
    user: `CANONICAL CHARACTERS:
${JSON.stringify(
  opts.characters.map((c) => ({
    id: c.canonicalId,
    names: c.names,
    important: c.important,
  })),
  null,
  2,
)}

PREVIOUS SCENE AFTER-STATE:
${JSON.stringify(opts.previousAfter || [], null, 2)}

SCENE ${opts.sceneNumber} TEXT:
${opts.sceneRaw.slice(0, 12000)}`,
  });

  return Pass2Schema.parse(raw);
}

export async function extractScreenplay(opts: {
  text: string;
  usageLogPath: string;
  culture: CultureSelection;
  useHeuristicFallback?: boolean;
}): Promise<ExtractionResult> {
  const parsed = parseScreenplay(opts.text);

  try {
    const pass1 = await llmPass1({
      text: opts.text,
      parsed,
      usageLogPath: opts.usageLogPath,
    });

    const characters = ensureIdentityLocks(mergeCharacters(pass1.characters as Character[]));
    let locations = mergeLocations(pass1.locations as Location[]);

    // Prefer parser scene count/order when LLM drifts.
    const sceneShells: Scene[] = parsed.scenes.map((ps) => {
      const llm = pass1.scenes.find((s) => s.number === ps.number);
      const locationId =
        llm?.locationId ||
        locations.find((l) =>
          [l.name, ...l.aliases].some((n) =>
            n.toLowerCase().includes(ps.locationName.toLowerCase()),
          ),
        )?.canonicalId ||
        `loc_${slugify(ps.locationName || `scene_${ps.number}`)}`;

      if (!locations.some((l) => l.canonicalId === locationId)) {
        locations = mergeLocations([
          ...locations,
          {
            canonicalId: locationId,
            name: ps.locationName || ps.slugline,
            aliases: [ps.slugline],
            description: "",
            architectureCues: "",
          },
        ]);
      }

      const cueIds = ps.characterCues
        .map((cue) => {
          const upper = cue.toUpperCase();
          return characters.find((c) =>
            [...c.names, ...c.aliases].some((n) => n.toUpperCase() === upper),
          )?.canonicalId;
        })
        .filter((id): id is string => Boolean(id));

      return {
        number: ps.number,
        slugline: ps.slugline,
        intExt: (llm?.intExt || ps.intExt) as Scene["intExt"],
        locationId,
        subLocation: llm?.subLocation || ps.subLocation,
        time: llm?.time || ps.time,
        dayDate: llm?.dayDate || "",
        weather: llm?.weather || "",
        mood: llm?.mood || "",
        summary: llm?.summary || ps.action.slice(0, 280).replace(/\s+/g, " ").trim(),
        dramaticPurpose: llm?.dramaticPurpose || "",
        characterIds: [...new Set([...(llm?.characterIds || []), ...cueIds])],
        entrances: llm?.entrances || [],
        exits: llm?.exits || [],
        production: emptyProduction(),
      };
    });

    const props: Prop[] = [];
    const costumes: CostumeVariant[] = [];
    const continuity: ContinuitySceneState[] = [];
    let previousAfter: CharacterContinuityBeat[] = [];

    for (const shell of sceneShells) {
      const parsedScene = parsed.scenes.find((s) => s.number === shell.number);
      const detail = await llmPass2Scene({
        text: opts.text,
        sceneNumber: shell.number,
        sceneRaw: parsedScene?.rawText || shell.slugline,
        characters,
        previousAfter,
        usageLogPath: opts.usageLogPath,
      });

      shell.production = { ...emptyProduction(), ...detail.production };
      props.push(...(detail.props as Prop[]));
      costumes.push(
        ...(detail.costumes.map((c) => ({
          ...c,
          sceneNumbers: c.sceneNumbers.length ? c.sceneNumbers : [shell.number],
        })) as CostumeVariant[]),
      );

      const state: ContinuitySceneState = {
        sceneNumber: shell.number,
        before: detail.before as CharacterContinuityBeat[],
        after: detail.after as CharacterContinuityBeat[],
      };
      continuity.push(state);
      previousAfter = state.after;
    }

    const mergedProps = mergeProps(props);
    const mergedCostumes = mergeCostumes(costumes);
    const filledContinuity = fillMissingAfterStates(characters, sceneShells, continuity);

    const result: ExtractionResult = {
      characters,
      locations,
      props: mergedProps,
      costumes: mergedCostumes,
      scenes: sceneShells,
      continuity: filledContinuity,
      issues: detectContinuityIssues(
        characters,
        mergedCostumes,
        sceneShells,
        filledContinuity,
      ),
    };
    result.adaptationPlan = buildAdaptationPlan(result, opts.culture);
    return result;
  } catch (err) {
    if (opts.useHeuristicFallback === false) throw err;
    const fallback = parserExtract(opts.text);
    fallback.issues = [
      ...fallback.issues,
      {
        id: "llm_extract_fallback",
        severity: "warning",
        message: `LLM extraction failed; used generic parser fallback (${err instanceof Error ? err.message : String(err)})`,
        sceneNumbers: [],
        entityIds: [],
      },
    ];
    fallback.adaptationPlan = buildAdaptationPlan(fallback, opts.culture);
    return fallback;
  }
}

export function buildAdaptationPlan(
  extraction: ExtractionResult,
  culture: CultureSelection,
): AdaptationPlan {
  const profile = culture.dialect.toLowerCase().includes("bangru")
    ? buildBangruProfile(culture.setting)
    : {
        ...buildBangruProfile(culture.setting),
        dialect: culture.dialect,
        region: culture.region,
        setting: culture.setting,
        adaptationNotes: `Adapt fully into ${culture.label}. Exact dialect/region only; no cultural mixing.`,
      };

  return {
    culture: profile,
    characterAdaptations: extraction.characters.map((c) => ({
      characterId: c.canonicalId,
      nameChanges: `Keep recognizable role; localize address forms into ${culture.dialect}`,
      dialectNotes: `${culture.dialect} speech rhythm for ${c.names[0]}`,
      personalityShift: "Preserve core traits; express through local social codes",
      wardrobeShift: profile.wardrobe.slice(0, 2).join("; "),
    })),
    settingRemap: `Remap locations into ${culture.region} ${culture.setting} visual language: ${profile.architecture.slice(0, 2).join("; ")}`,
    costumePlanSummary: extraction.costumes
      .map((c) => `${c.canonicalId}: ${c.label} (scenes ${c.sceneNumbers.join(",")})`)
      .join(" | "),
    approved: false,
  };
}
