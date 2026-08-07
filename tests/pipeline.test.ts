import { describe, expect, it, vi } from "vitest";
import {
  detectContinuityIssues,
  mergeCharacters,
  mergeCostumes,
  propsMatch,
} from "../src/lib/pipeline/dedupe";
import { parserExtract } from "../src/lib/pipeline/extract";
import { parseScreenplay } from "../src/lib/parse/screenplay";
import type { Character, CostumeVariant, ContinuitySceneState, Scene } from "../src/lib/schema";

function emptyProduction(): Scene["production"] {
  return {
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
  };
}

function scene(number: number, characterIds: string[]): Scene {
  return {
    number,
    slugline: `INT. ROOM ${number} - DAY`,
    intExt: "INT",
    locationId: `loc_${number}`,
    subLocation: "",
    time: "DAY",
    dayDate: "",
    weather: "",
    mood: "",
    summary: "",
    dramaticPurpose: "",
    characterIds,
    entrances: [],
    exits: [],
    production: emptyProduction(),
  };
}

describe("dedupe", () => {
  it("merges aliases into one canonical character", () => {
    const merged = mergeCharacters([
      {
        canonicalId: "char_convict",
        names: ["The Convict"],
        aliases: ["613"],
        age: "young",
        role: "lead",
        relationships: [],
        personality: [],
        dialect: "x",
        physicalDescription: "a",
        grooming: "",
        emotionalArc: "",
        identityLockPrompt: "",
        important: true,
      },
      {
        canonicalId: "char_new",
        names: ["Convict"],
        aliases: ["The Convict", "naya wala"],
        age: "young",
        role: "lead",
        relationships: [],
        personality: ["silent"],
        dialect: "x",
        physicalDescription: "b",
        grooming: "",
        emotionalArc: "",
        identityLockPrompt: "",
        important: true,
      },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].aliases.join(" ")).toMatch(/613|naya/i);
  });

  it("reuses costume IDs for the same character look", () => {
    const base: CostumeVariant = {
      canonicalId: "cos_a",
      characterId: "char_convict",
      label: "Grey uniform",
      garments: ["grey shirt"],
      fabrics: ["cotton"],
      colors: ["grey"],
      footwear: "chappals",
      jewelry: [],
      headwear: "none",
      grooming: "",
      sceneNumbers: [3],
    };
    const merged = mergeCostumes([
      base,
      { ...base, canonicalId: "cos_b", sceneNumbers: [4, 5], garments: ["grey trousers"] },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].sceneNumbers).toEqual([3, 4, 5]);
    expect(merged[0].garments).toContain("grey trousers");
  });

  it("flags duplicate character name collisions", () => {
    const chars: Character[] = [
      {
        canonicalId: "a",
        names: ["Havaldar"],
        aliases: [],
        age: "45",
        role: "g",
        relationships: [],
        personality: [],
        dialect: "",
        physicalDescription: "",
        grooming: "",
        emotionalArc: "",
        identityLockPrompt: "",
        important: true,
      },
      {
        canonicalId: "b",
        names: ["Guard"],
        aliases: ["Havaldar"],
        age: "45",
        role: "g",
        relationships: [],
        personality: [],
        dialect: "",
        physicalDescription: "",
        grooming: "",
        emotionalArc: "",
        identityLockPrompt: "",
        important: true,
      },
    ];
    const issues = detectContinuityIssues(chars, [], [], []);
    expect(issues.some((i) => i.id.startsWith("dup_char_"))).toBe(true);
  });
});

describe("generic screenplay parser", () => {
  const englishScript = `
INT. MARKET STALL - DAY

MAYA
We close at dusk.

RAVI
Not today.

EXT. RIVERBANK - NIGHT

MAYA
Keep the lantern low.
`.trim();

  it("parses scenes and cues from format alone", () => {
    const parsed = parseScreenplay(englishScript);
    expect(parsed.scenes).toHaveLength(2);
    expect(parsed.scenes[0].intExt).toBe("INT");
    expect(parsed.scenes[0].locationName.toUpperCase()).toContain("MARKET");
    expect(parsed.scenes[0].time).toBe("DAY");
    expect(parsed.characterCues).toEqual(expect.arrayContaining(["MAYA", "RAVI"]));
    expect(parsed.scenes[0].dialogue[0]?.text).toMatch(/dusk/i);
  });

  it("builds offline extraction without story-specific ids", () => {
    const result = parserExtract(englishScript);
    expect(result.scenes).toHaveLength(2);
    expect(result.characters.length).toBeGreaterThanOrEqual(2);
    expect(result.characters.every((c) => c.canonicalId.startsWith("char_"))).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/char_convict|prop_collar_lump|cos_havaldar/);
  });
});

describe("continuity normalization", () => {
  it("matches paraphrased prop phrases", () => {
    expect(propsMatch("collar lump sewn in shirt", "own shirt with sewn lump")).toBe(true);
    expect(propsMatch("number placard 613", "613 placard")).toBe(true);
    expect(propsMatch("matchstick", "ledger book")).toBe(false);
  });

  it("does not false-positive when paraphrased props carry across scenes", () => {
    const characters: Character[] = [
      {
        canonicalId: "char_a",
        names: ["Lead"],
        aliases: [],
        age: "",
        role: "",
        relationships: [],
        personality: [],
        dialect: "",
        physicalDescription: "",
        grooming: "",
        emotionalArc: "",
        identityLockPrompt: "",
        important: true,
      },
    ];
    const continuity: ContinuitySceneState[] = [
      {
        sceneNumber: 1,
        before: [],
        after: [
          {
            characterId: "char_a",
            wearing: ["civilian clothes"],
            carrying: ["collar lump sewn in shirt"],
            knows: [],
            injuries: [],
            gained: [],
            lost: [],
            notes: "",
          },
        ],
      },
      {
        sceneNumber: 2,
        before: [
          {
            characterId: "char_a",
            wearing: ["civilian clothes"],
            carrying: ["own shirt with sewn lump"],
            knows: [],
            injuries: [],
            gained: [],
            lost: [],
            notes: "",
          },
        ],
        after: [
          {
            characterId: "char_a",
            wearing: ["civilian clothes"],
            carrying: ["own shirt with sewn lump"],
            knows: [],
            injuries: [],
            gained: [],
            lost: [],
            notes: "",
          },
        ],
      },
    ];
    const issues = detectContinuityIssues(
      characters,
      [],
      [scene(1, ["char_a"]), scene(2, ["char_a"])],
      continuity,
    );
    expect(issues.some((i) => i.id.startsWith("prop_gap_"))).toBe(false);
  });
});

describe("approval gate", () => {
  it("rejects when approved flag is missing", async () => {
    vi.resetModules();
    vi.doMock("../src/lib/store", () => ({
      loadJob: vi.fn(async () => ({
        id: "job1",
        status: "awaiting_approval",
        extraction: {
          characters: [],
          locations: [],
          props: [],
          costumes: [],
          scenes: [],
          continuity: [],
          issues: [],
        },
        primaryCulture: {
          dialect: "Bangru",
          region: "Haryana",
          setting: "rural",
          label: "Bangru",
        },
        usageLogPath: "/tmp/usage.jsonl",
        originalText: "x",
        cultures: [],
        createdAt: "",
        updatedAt: "",
      })),
      saveJob: vi.fn(),
      updateJobStatus: vi.fn(),
    }));
    const { approveAndGenerate } = await import("../src/lib/pipeline/run");
    await expect(approveAndGenerate("job1", {})).rejects.toThrow(/approved:true/i);
    vi.doUnmock("../src/lib/store");
  });

  it("rejects when job is already ready", async () => {
    vi.resetModules();
    vi.doMock("../src/lib/store", () => ({
      loadJob: vi.fn(async () => ({
        id: "job2",
        status: "ready",
        extraction: {
          characters: [],
          locations: [],
          props: [],
          costumes: [],
          scenes: [],
          continuity: [],
          issues: [],
        },
        primaryCulture: {
          dialect: "Bangru",
          region: "Haryana",
          setting: "rural",
          label: "Bangru",
        },
        usageLogPath: "/tmp/usage.jsonl",
        originalText: "x",
        cultures: [],
        createdAt: "",
        updatedAt: "",
      })),
      saveJob: vi.fn(),
      updateJobStatus: vi.fn(),
    }));
    const { approveAndGenerate } = await import("../src/lib/pipeline/run");
    await expect(approveAndGenerate("job2", { approved: true })).rejects.toThrow(
      /already generated/i,
    );
    vi.doUnmock("../src/lib/store");
  });
});
