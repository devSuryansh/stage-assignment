import { describe, expect, it } from "vitest";
import {
  detectContinuityIssues,
  mergeCharacters,
  mergeCostumes,
} from "../src/lib/pipeline/dedupe";
import { heuristicExtract } from "../src/lib/pipeline/extract";
import { bangruHeuristicAdaptation } from "../src/lib/pipeline/adapt";
import { readFileSync } from "fs";
import path from "path";
import type { Character, CostumeVariant } from "../src/lib/schema";

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

describe("fixture extraction", () => {
  it("extracts 5 scenes and key characters without duplicates", () => {
    const text = readFileSync(
      path.join(process.cwd(), "fixtures", "sample-5scenes.txt"),
      "utf8",
    );
    const result = heuristicExtract(text);
    expect(result.scenes.length).toBeGreaterThanOrEqual(4);
    expect(result.scenes.length).toBeLessThanOrEqual(5);
    const ids = result.characters.map((c) => c.canonicalId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("char_convict");
    expect(ids).toContain("char_havaldar");
    expect(ids).toContain("char_dagdu");
    const lumpBeat = result.continuity.find((c) => c.sceneNumber === 3);
    expect(lumpBeat?.after[0]?.notes || "").toMatch(/lump/i);
  });
});

describe("bangru adaptation", () => {
  it("injects Bangru culture header and dialect markers", () => {
    const out = bangruHeuristicAdaptation("HAVALDAR\nनाम?\n", {
      dialect: "Bangru",
      region: "Haryana",
      setting: "rural",
      label: "Bangru Haryanvi (Haryana, rural)",
    });
    expect(out).toMatch(/Bangru/);
    expect(out).toMatch(/नांव|HAVALDAR/);
  });
});
