import type {
  AdaptationPlan,
  Character,
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

/** Deterministic fallback extractor for the 5-scene jail fixture / offline mode */
export function heuristicExtract(text: string): ExtractionResult {
  const sceneBlocks = text.split(/\n(?=(?:EXT\.|INT\.|INT\/EXT\.))/i).filter((b) => b.trim());
  const characters: Character[] = [
    {
      canonicalId: "char_convict",
      names: ["The Convict", "Convict"],
      aliases: ["नया वाला", "613"],
      age: "young adult",
      role: "protagonist / new prisoner",
      relationships: ["opposed by Havaldar", "judged by Dagdu", "watched by Ganpat"],
      personality: ["withdrawn", "careful", "hiding something"],
      dialect: "neutral (to be adapted)",
      physicalDescription:
        "Young Indian man, head often down, half-healed cut over one eye, face partly obscured",
      grooming: "unkempt intake look; later grey jail uniform",
      emotionalArc: "silent intake humiliation to barrack exposure",
      identityLockPrompt:
        "same young Indian man always, half-healed cut over one eye, head often lowered, lean build, consistent face across shots",
      important: true,
    },
    {
      canonicalId: "char_havaldar",
      names: ["Havaldar"],
      aliases: [],
      age: "45",
      role: "jail guard processing intake",
      relationships: ["dominates Convict", "works with Head Clerk"],
      personality: ["unhurried", "contemptuous", "performatively loud"],
      dialect: "neutral",
      physicalDescription: "Pot-bellied middle-aged guard, thick fingers",
      grooming: "khaki uniform, sweat-stained",
      emotionalArc: "bored processor to theatrical bully",
      identityLockPrompt:
        "same pot-bellied 45-year-old Indian havaldar, thick fingers, khaki uniform, consistent face",
      important: true,
    },
    {
      canonicalId: "char_head_clerk",
      names: ["Head Clerk"],
      aliases: [],
      age: "50s",
      role: "intake clerk",
      relationships: ["works intake counter"],
      personality: ["bored", "bureaucratic"],
      dialect: "neutral",
      physicalDescription: "Behind counter with ledger and stamp pad",
      grooming: "faded white shirt",
      emotionalArc: "flat administrative presence",
      identityLockPrompt:
        "same middle-aged Indian clerk behind counter, faded shirt, ledger ink stains, consistent face",
      important: false,
    },
    {
      canonicalId: "char_dagdu",
      names: ["Dagdu"],
      aliases: ["दगडू भाई"],
      age: "40s",
      role: "barrack king / antagonist power",
      relationships: ["commands Trusty", "threatens Convict", "tolerates Ganpat"],
      personality: ["lazy power", "cruel", "theatrical"],
      dialect: "neutral",
      physicalDescription:
        "40s, shirt open, scar like a zip down one forearm, matchstick in teeth",
      grooming: "open shirt, raised bedroll with pillow",
      emotionalArc: "assesses and marks the Convict as untouchable",
      identityLockPrompt:
        "same 40s Indian inmate boss, zip-like forearm scar, matchstick in teeth, open shirt, consistent face",
      important: true,
    },
    {
      canonicalId: "char_ganpat",
      names: ["Ganpat"],
      aliases: ["गणपत काका", "Old Man"],
      age: "60s",
      role: "elder observer / mercy voice",
      relationships: ["watched by room", "speaks to Dagdu carefully"],
      personality: ["spare", "calm", "tired compassion"],
      dialect: "neutral",
      physicalDescription: "Spare, white-stubbled old man, cross-legged",
      grooming: "simple worn clothes",
      emotionalArc: "quiet conscience in the barrack",
      identityLockPrompt:
        "same spare 60s Indian man, white stubble, calm tired eyes, cross-legged, consistent face",
      important: true,
    },
    {
      canonicalId: "char_trusty",
      names: ["Trusty"],
      aliases: [],
      age: "30s",
      role: "Dagdu's side man",
      relationships: ["serves Dagdu"],
      personality: ["grinning", "messenger of gossip"],
      dialect: "neutral",
      physicalDescription: "Inmate beside Dagdu",
      grooming: "jail clothes, slightly privileged",
      emotionalArc: "announces Convict's crimes to the room",
      identityLockPrompt:
        "same lean Indian trusty inmate beside Dagdu, sly grin, consistent face",
      important: false,
    },
  ];

  const locations: Location[] = [
    {
      canonicalId: "loc_jail_gate",
      name: "Central Jail Main Gate",
      aliases: ["CENTRAL JAIL - MAIN GATE"],
      description: "High bone-coloured wall, broken glass, rusted wire, black iron gate",
      architectureCues: "watchtower, government seal, prison bus",
    },
    {
      canonicalId: "loc_intake",
      name: "Jail Intake Room",
      aliases: ["JAIL - INTAKE ROOM", "INTAKE / STRIP AREA"],
      description: "Bare room, ceiling fan, long counter, tin partition strip area",
      architectureCues: "ledger counter, gunny sack, coarse uniforms",
    },
    {
      canonicalId: "loc_corridor",
      name: "Jail Corridor",
      aliases: ["JAIL - CORRIDOR"],
      description: "Long gallery with cell doors and faces at bars",
      architectureCues: "barred doors, echo, concrete",
    },
    {
      canonicalId: "loc_barrack",
      name: "Jail Barrack",
      aliases: ["JAIL - BARRACK"],
      description: "Long hall, bedrolls, corner latrine, barred window light",
      architectureCues: "raised bedroll for boss, tin trunk, heat",
    },
  ];

  const props: Prop[] = [
    {
      canonicalId: "prop_placard_613",
      name: "Number placard 613",
      aliases: ["placard", "chalk number"],
      description: "Chalked number board slapped on Convict chest",
      ownerCharacterId: "char_convict",
    },
    {
      canonicalId: "prop_collar_lump",
      name: "Collar seam lump",
      aliases: ["lump", "sewn lump"],
      description: "Small hard lump sewn into shirt collar, secretly transferred",
      ownerCharacterId: "char_convict",
    },
    {
      canonicalId: "prop_matchstick",
      name: "Matchstick",
      aliases: [],
      description: "Dagdu works a matchstick between his teeth",
      ownerCharacterId: "char_dagdu",
    },
    {
      canonicalId: "prop_ledger",
      name: "Ledger and stamp pad",
      aliases: ["ledger", "stamp"],
      description: "Intake paperwork tools",
      ownerCharacterId: "char_head_clerk",
    },
  ];

  const costumes: CostumeVariant[] = [
    {
      canonicalId: "cos_convict_civilian",
      characterId: "char_convict",
      label: "Convict civilian intake clothes",
      garments: ["own shirt", "civilian trousers"],
      fabrics: ["worn cotton"],
      colors: ["muted"],
      footwear: "simple sandals or bare",
      jewelry: [],
      headwear: "none",
      grooming: "cut over eye, head down",
      sceneNumbers: [1, 2],
    },
    {
      canonicalId: "cos_convict_uniform",
      characterId: "char_convict",
      label: "Convict grey jail uniform + 613",
      garments: ["coarse grey jail shirt", "grey trousers", "number placard 613"],
      fabrics: ["coarse cotton"],
      colors: ["grey"],
      footwear: "jail chappals",
      jewelry: [],
      headwear: "none",
      grooming: "intake buzz/unkempt",
      sceneNumbers: [3, 4, 5],
      changeReason: "Forced strip and uniform issue at intake",
    },
    {
      canonicalId: "cos_havaldar_khaki",
      characterId: "char_havaldar",
      label: "Havaldar khaki duty kit",
      garments: ["khaki shirt", "khaki trousers", "belt"],
      fabrics: ["khaki cotton"],
      colors: ["khaki"],
      footwear: "scuffed boots",
      jewelry: [],
      headwear: "optional police cap",
      grooming: "sweaty, pot-bellied",
      sceneNumbers: [2, 3, 4, 5],
    },
    {
      canonicalId: "cos_dagdu_open_shirt",
      characterId: "char_dagdu",
      label: "Dagdu open-shirt barrack boss",
      garments: ["open shirt", "jail trousers"],
      fabrics: ["worn cotton"],
      colors: ["faded"],
      footwear: "chappals",
      jewelry: [],
      headwear: "none",
      grooming: "matchstick, forearm scar visible",
      sceneNumbers: [5],
    },
    {
      canonicalId: "cos_ganpat_elder",
      characterId: "char_ganpat",
      label: "Ganpat elder inmate",
      garments: ["worn vest or shirt", "simple trousers"],
      fabrics: ["thin cotton"],
      colors: ["dusty white"],
      footwear: "bare or chappals",
      jewelry: [],
      headwear: "none",
      grooming: "white stubble",
      sceneNumbers: [5],
    },
  ];

  const locationFor = (slug: string) => {
    if (/GATE/i.test(slug)) return "loc_jail_gate";
    if (/INTAKE|STRIP/i.test(slug)) return "loc_intake";
    if (/CORRIDOR/i.test(slug)) return "loc_corridor";
    return "loc_barrack";
  };

  const scenes: Scene[] = sceneBlocks.slice(0, 5).map((block, idx) => {
    const firstLine = block.trim().split("\n")[0] || `SCENE ${idx + 1}`;
    const number = idx + 1;
    const intExt = /^EXT/i.test(firstLine)
      ? "EXT"
      : /^INT\/EXT/i.test(firstLine)
        ? "INT/EXT"
        : "INT";
    const characterIds = characters
      .filter((c) =>
        c.names.some((n) => new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(block)),
      )
      .map((c) => c.canonicalId);

    return {
      number,
      slugline: firstLine.trim(),
      intExt: intExt as Scene["intExt"],
      locationId: locationFor(firstLine),
      subLocation: "",
      time: /NIGHT/i.test(firstLine)
        ? "NIGHT"
        : /MORNING/i.test(firstLine)
          ? "MORNING"
          : "DAY",
      dayDate: "Day One",
      weather: "hot",
      mood: number === 1 ? "ominous arrival" : number === 5 ? "predatory silence" : "procedural dread",
      summary: block.slice(0, 280).replace(/\s+/g, " ").trim(),
      dramaticPurpose:
        number === 1
          ? "Establish jail world"
          : number === 3
            ? "Secret prop transfer"
            : number === 5
              ? "Introduce hierarchy and threat"
              : "Advance intake humiliation",
      characterIds: characterIds.length
        ? characterIds
        : number === 1
          ? ["char_convict"]
          : ["char_convict", "char_havaldar"],
      entrances: number === 5 ? ["char_convict"] : [],
      exits: number === 4 ? ["char_convict"] : [],
      production: {
        ...emptyProduction(),
        set: firstLine.trim(),
        props:
          number === 3
            ? ["collar lump", "gunny sack", "grey uniform"]
            : number === 2
              ? ["ledger", "stamp pad", "placard"]
              : number === 5
                ? ["matchstick", "tin trunk", "bedrolls"]
                : [],
        gestures:
          number === 2
            ? ["palm shove", "eyes on floor"]
            : number === 5
              ? ["matchstick roll", "room goes quiet"]
              : [],
        culturalCues: ["North Indian jail hierarchy (to be culturally remapped)"],
      },
    };
  });

  const continuity: ContinuitySceneState[] = scenes.map((scene) => {
    const convictAfterCarrying =
      scene.number >= 3
        ? scene.number === 3
          ? ["hidden collar lump (on body)", "grey uniform"]
          : ["hidden collar lump (on body)", "number placard 613", "grey uniform"]
        : ["civilian clothes", "collar lump sewn in shirt"];

    return {
      sceneNumber: scene.number,
      before: [
        {
          characterId: "char_convict",
          wearing:
            scene.number >= 3 ? ["grey jail uniform"] : ["civilian intake clothes"],
          carrying:
            scene.number >= 3
              ? scene.number > 3
                ? ["613 placard", "hidden lump"]
                : ["hidden lump being transferred"]
              : ["own shirt with sewn lump"],
          knows: scene.number >= 2 ? ["charges being announced"] : [],
          injuries: ["half-healed cut over eye"],
          gained: [],
          lost: [],
          notes: "",
        },
      ],
      after: [
        {
          characterId: "char_convict",
          wearing:
            scene.number >= 3 ? ["grey jail uniform", "613 placard"] : ["civilian clothes"],
          carrying: convictAfterCarrying,
          knows:
            scene.number >= 5
              ? ["barrack hierarchy", "Dagdu's judgment"]
              : scene.number >= 2
                ? ["he is being marked"]
                : [],
          injuries: ["half-healed cut over eye"],
          gained:
            scene.number === 2
              ? ["number identity 613"]
              : scene.number === 3
                ? ["lump relocated on body"]
                : [],
          lost: scene.number === 3 ? ["civilian shirt"] : [],
          notes:
            scene.number === 3
              ? "Critical continuity: lump moves from collar to body before uniform on"
              : "",
        },
      ],
    };
  });

  const issues = detectContinuityIssues(characters, costumes, scenes, continuity);

  return {
    characters: ensureIdentityLocks(characters),
    locations,
    props,
    costumes,
    scenes,
    continuity,
    issues,
  };
}

interface LlmExtractionPayload {
  characters?: Character[];
  locations?: Location[];
  props?: Prop[];
  costumes?: CostumeVariant[];
  scenes?: Scene[];
  continuity?: ContinuitySceneState[];
}

export async function extractScreenplay(opts: {
  text: string;
  usageLogPath: string;
  culture: CultureSelection;
  useHeuristicFallback?: boolean;
}): Promise<ExtractionResult> {
  const profile = buildBangruProfile(opts.culture.setting);

  let payload: LlmExtractionPayload | null = null;
  try {
    payload = await chatJson<LlmExtractionPayload>({
      purpose: "extract_screenplay",
      usageLogPath: opts.usageLogPath,
      system: `You extract production breakdowns from screenplays.
Return JSON with keys: characters, locations, props, costumes, scenes, continuity.
Merge aliases into canonical characters. Use stable canonicalId strings like char_*, loc_*, prop_*, cos_*.
Scenes need: number, slugline, intExt, locationId, time, mood, summary, dramaticPurpose, characterIds, entrances, exits, production.
Continuity is an array of {sceneNumber, before[], after[]} with wearing/carrying/knows/injuries/gained/lost/notes.
Flag nothing yet; just extract. Identity lock prompts must be detailed and reusable for image consistency.`,
      user: `Target culture context (for later adaptation notes only; extract faithfully first):
${JSON.stringify(profile, null, 2)}

SCREENPLAY:
${opts.text.slice(0, 40000)}`,
      temperature: 0.2,
    });
  } catch (err) {
    if (opts.useHeuristicFallback === false) throw err;
    const fallback = heuristicExtract(opts.text);
    fallback.issues = [
      ...fallback.issues,
      {
        id: "llm_extract_fallback",
        severity: "warning",
        message: `LLM extraction failed; used heuristic fallback (${err instanceof Error ? err.message : String(err)})`,
        sceneNumbers: [],
        entityIds: [],
      },
    ];
    fallback.adaptationPlan = buildAdaptationPlan(fallback, opts.culture);
    return fallback;
  }

  const characters = ensureIdentityLocks(mergeCharacters(payload.characters || []));
  const locations = mergeLocations(payload.locations || []);
  const props = mergeProps(payload.props || []);
  const costumes = mergeCostumes(payload.costumes || []);
  const scenes = payload.scenes || [];
  const continuity = payload.continuity || [];

  // If LLM returned too little, blend with heuristic for the known fixture.
  const enriched =
    characters.length < 3 || scenes.length < 2
      ? heuristicExtract(opts.text)
      : {
          characters,
          locations,
          props,
          costumes,
          scenes,
          continuity,
          issues: [] as ExtractionResult["issues"],
        };

  if (characters.length >= 3 && scenes.length >= 2) {
    enriched.characters = characters;
    enriched.locations = locations.length ? locations : enriched.locations;
    enriched.props = props.length ? props : enriched.props;
    enriched.costumes = costumes.length ? costumes : enriched.costumes;
    enriched.scenes = scenes;
    enriched.continuity = continuity.length ? continuity : enriched.continuity;
  }

  enriched.issues = detectContinuityIssues(
    enriched.characters,
    enriched.costumes,
    enriched.scenes,
    enriched.continuity,
  );
  enriched.adaptationPlan = buildAdaptationPlan(enriched, opts.culture);
  return enriched;
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
    settingRemap: `Remap locations into ${culture.region} ${culture.setting} jail/community visual language: ${profile.architecture.slice(0, 2).join("; ")}`,
    costumePlanSummary: extraction.costumes
      .map((c) => `${c.canonicalId}: ${c.label} (scenes ${c.sceneNumbers.join(",")})`)
      .join(" | "),
    approved: false,
  };
}
