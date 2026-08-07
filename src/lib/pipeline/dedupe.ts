import type {
  Character,
  ContinuityIssue,
  ContinuitySceneState,
  CostumeVariant,
  Location,
  Prop,
  Scene,
} from "../schema";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

function uniqStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
  }
  return out;
}

export function mergeCharacters(raw: Character[]): Character[] {
  const byKey = new Map<string, Character>();

  for (const c of raw) {
    const keys = uniqStrings([c.canonicalId, ...c.names, ...c.aliases]).map((k) =>
      k.toLowerCase(),
    );
    let existing: Character | undefined;
    for (const key of keys) {
      for (const [mapKey, char] of byKey) {
        const charKeys = uniqStrings([
          char.canonicalId,
          ...char.names,
          ...char.aliases,
        ]).map((k) => k.toLowerCase());
        if (charKeys.includes(key) || mapKey === key) {
          existing = char;
          break;
        }
      }
      if (existing) break;
    }

    if (!existing) {
      const id = c.canonicalId || `char_${slugify(c.names[0] || "unknown")}`;
      const next: Character = {
        ...c,
        canonicalId: id,
        names: uniqStrings(c.names),
        aliases: uniqStrings(c.aliases),
        personality: uniqStrings(c.personality || []),
        relationships: uniqStrings(c.relationships || []),
      };
      byKey.set(id.toLowerCase(), next);
      continue;
    }

    existing.names = uniqStrings([...existing.names, ...c.names]);
    existing.aliases = uniqStrings([
      ...existing.aliases,
      ...c.aliases,
      ...c.names.filter((n) => !existing!.names.includes(n)),
    ]);
    existing.personality = uniqStrings([
      ...(existing.personality || []),
      ...(c.personality || []),
    ]);
    existing.relationships = uniqStrings([
      ...(existing.relationships || []),
      ...(c.relationships || []),
    ]);
    if (!existing.physicalDescription && c.physicalDescription) {
      existing.physicalDescription = c.physicalDescription;
    }
    if (!existing.identityLockPrompt && c.identityLockPrompt) {
      existing.identityLockPrompt = c.identityLockPrompt;
    }
    existing.important = existing.important || c.important;
  }

  return Array.from(byKey.values());
}

export function mergeLocations(raw: Location[]): Location[] {
  const map = new Map<string, Location>();
  for (const loc of raw) {
    const key = slugify(loc.name || loc.canonicalId);
    const id = loc.canonicalId || `loc_${key}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ...loc,
        canonicalId: id,
        aliases: uniqStrings(loc.aliases || []),
      });
    } else {
      existing.aliases = uniqStrings([
        ...existing.aliases,
        ...loc.aliases,
        loc.name,
      ]);
      if (!existing.description && loc.description) {
        existing.description = loc.description;
      }
    }
  }
  return Array.from(map.values());
}

export function mergeProps(raw: Prop[]): Prop[] {
  const map = new Map<string, Prop>();
  for (const prop of raw) {
    const key = slugify(prop.name || prop.canonicalId);
    const id = prop.canonicalId || `prop_${key}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...prop, canonicalId: id, aliases: uniqStrings(prop.aliases || []) });
    } else {
      existing.aliases = uniqStrings([...existing.aliases, ...prop.aliases, prop.name]);
    }
  }
  return Array.from(map.values());
}

export function mergeCostumes(raw: CostumeVariant[]): CostumeVariant[] {
  const map = new Map<string, CostumeVariant>();
  for (const costume of raw) {
    const key = `${costume.characterId}::${slugify(costume.label)}`;
    const id = costume.canonicalId || `cos_${slugify(key)}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ...costume,
        canonicalId: id,
        sceneNumbers: [...new Set(costume.sceneNumbers || [])].sort((a, b) => a - b),
        garments: uniqStrings(costume.garments || []),
        fabrics: uniqStrings(costume.fabrics || []),
        colors: uniqStrings(costume.colors || []),
        jewelry: uniqStrings(costume.jewelry || []),
      });
    } else {
      existing.sceneNumbers = [
        ...new Set([...existing.sceneNumbers, ...costume.sceneNumbers]),
      ].sort((a, b) => a - b);
      existing.garments = uniqStrings([...existing.garments, ...costume.garments]);
      existing.fabrics = uniqStrings([...existing.fabrics, ...costume.fabrics]);
      existing.colors = uniqStrings([...existing.colors, ...costume.colors]);
      existing.jewelry = uniqStrings([...existing.jewelry, ...costume.jewelry]);
    }
  }
  return Array.from(map.values());
}

export function ensureIdentityLocks(characters: Character[]): Character[] {
  return characters.map((c) => {
    if (c.identityLockPrompt) return c;
    const name = c.names[0] || c.canonicalId;
    return {
      ...c,
      identityLockPrompt: [
        `same person always: ${name}`,
        c.age ? `age ${c.age}` : "",
        c.physicalDescription || "Indian features",
        c.grooming || "",
        "consistent face, body proportions, scars and marks across all shots",
      ]
        .filter(Boolean)
        .join(", "),
    };
  });
}

const PROP_STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "of",
  "in",
  "on",
  "with",
  "and",
  "his",
  "her",
  "their",
  "own",
  "into",
  "from",
  "to",
  "for",
  "at",
  "by",
  "sewn",
  "hidden",
  "being",
  "transferred",
  "body",
]);

/** Normalize prop phrases before comparison (strip parentheticals / stopwords). */
export function normalizePropPhrase(input: string): string {
  return input
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function propTokens(input: string): Set<string> {
  const norm = normalizePropPhrase(input);
  return new Set(
    norm
      .split(" ")
      .map((t) => t.trim())
      .filter((t) => t.length > 1 && !PROP_STOPWORDS.has(t)),
  );
}

/** Token-overlap match — catches "collar lump sewn in shirt" vs "own shirt with sewn lump". */
export function propsMatch(a: string, b: string, threshold = 0.5): boolean {
  const ta = propTokens(a);
  const tb = propTokens(b);
  if (!ta.size || !tb.size) {
    return normalizePropPhrase(a) === normalizePropPhrase(b);
  }
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap++;
  const denom = Math.min(ta.size, tb.size);
  return overlap / denom >= threshold;
}

function listHasProp(list: string[], item: string): boolean {
  return list.some((x) => propsMatch(x, item));
}

export function detectContinuityIssues(
  characters: Character[],
  costumes: CostumeVariant[],
  scenes: Scene[],
  continuity: ContinuitySceneState[],
): ContinuityIssue[] {
  const issues: ContinuityIssue[] = [];

  // Duplicate character names across different IDs
  const nameToIds = new Map<string, Set<string>>();
  for (const c of characters) {
    for (const n of [...c.names, ...c.aliases]) {
      const key = n.toLowerCase();
      if (!nameToIds.has(key)) nameToIds.set(key, new Set());
      nameToIds.get(key)!.add(c.canonicalId);
    }
  }
  for (const [name, ids] of nameToIds) {
    if (ids.size > 1) {
      issues.push({
        id: `dup_char_${name}`,
        severity: "error",
        message: `Name/alias "${name}" maps to multiple character IDs: ${[...ids].join(", ")}`,
        sceneNumbers: [],
        entityIds: [...ids],
      });
    }
  }

  // Costume changes without reason across consecutive scenes
  for (const c of characters) {
    const variants = costumes
      .filter((x) => x.characterId === c.canonicalId)
      .sort((a, b) => (a.sceneNumbers[0] || 0) - (b.sceneNumbers[0] || 0));
    for (let i = 1; i < variants.length; i++) {
      const prev = variants[i - 1];
      const curr = variants[i];
      if (!curr.changeReason) {
        issues.push({
          id: `costume_change_${c.canonicalId}_${curr.canonicalId}`,
          severity: "warning",
          message: `Costume change for ${c.names[0] || c.canonicalId} from "${prev.label}" to "${curr.label}" lacks a change reason`,
          sceneNumbers: curr.sceneNumbers,
          entityIds: [c.canonicalId, curr.canonicalId],
        });
      }
    }
  }

  // Missing continuity beats for important characters in a scene
  for (const scene of scenes) {
    const state = continuity.find((x) => x.sceneNumber === scene.number);
    if (!state) {
      issues.push({
        id: `missing_cont_${scene.number}`,
        severity: "warning",
        message: `No continuity state recorded for scene ${scene.number}`,
        sceneNumbers: [scene.number],
        entityIds: [],
      });
      continue;
    }
    for (const cid of scene.characterIds) {
      const char = characters.find((c) => c.canonicalId === cid);
      if (!char?.important) continue;
      const hasAfter = state.after.some((b) => b.characterId === cid);
      if (!hasAfter) {
        issues.push({
          id: `missing_beat_${scene.number}_${cid}`,
          severity: "warning",
          message: `Important character ${char.names[0] || cid} missing after-state in scene ${scene.number}`,
          sceneNumbers: [scene.number],
          entityIds: [cid],
        });
      }
    }
  }

  // Prop transfer gaps using normalized token overlap (not exact string match)
  const ordered = [...continuity].sort((a, b) => a.sceneNumber - b.sceneNumber);
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1];
    const curr = ordered[i];
    for (const after of prev.after) {
      const before = curr.before.find((b) => b.characterId === after.characterId);
      if (!before) continue;
      for (const item of after.carrying) {
        const still = listHasProp(before.carrying, item);
        const lost = listHasProp(after.lost, item);
        if (!still && !lost && item.trim()) {
          issues.push({
            id: `prop_gap_${curr.sceneNumber}_${after.characterId}_${slugify(item)}`,
            severity: "warning",
            message: `Prop "${item}" on ${after.characterId} after scene ${prev.sceneNumber} not reflected before scene ${curr.sceneNumber}`,
            sceneNumbers: [prev.sceneNumber, curr.sceneNumber],
            entityIds: [after.characterId],
          });
        }
      }
    }
  }

  return issues;
}
