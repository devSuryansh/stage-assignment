import path from "path";
import type { ExtractionResult, VisualPack } from "../schema";
import { STYLE_PREFIX } from "../schema";
import { generateImage } from "../ai/client";
import { jobDir } from "../store";

const HARYANA_VISUAL = [
  "bone-white lime plaster walls",
  "khaki cotton, gamcha, pagdi where appropriate",
  "brass and steel tumblers",
  "dust-laden afternoon light",
  "neem and peepal shade near compounds",
  "rusted iron gates, barred windows, bare bulbs",
  "rural Haryana jail/world authenticity recognizable without dialogue",
].join(", ");

function costumePrompt(extraction: ExtractionResult, costumeId: string): string {
  const costume = extraction.costumes.find((c) => c.canonicalId === costumeId);
  const character = extraction.characters.find((c) => c.canonicalId === costume?.characterId);
  if (!costume || !character) return STYLE_PREFIX;
  return [
    STYLE_PREFIX,
    "full-body front view costume reference sheet",
    character.identityLockPrompt,
    `same face as the character bible reference image`,
    `costume: ${costume.label}`,
    `garments: ${costume.garments.join(", ")}`,
    `fabrics: ${costume.fabrics.join(", ")}`,
    `colors: ${costume.colors.join(", ")}`,
    `footwear: ${costume.footwear}`,
    costume.jewelry.length ? `jewelry: ${costume.jewelry.join(", ")}` : "",
    costume.headwear ? `headwear: ${costume.headwear}` : "",
    `grooming: ${costume.grooming}`,
    HARYANA_VISUAL,
    "plain neutral backdrop, production design reference",
  ]
    .filter(Boolean)
    .join(", ");
}

function characterPrompt(extraction: ExtractionResult, characterId: string): string {
  const character = extraction.characters.find((c) => c.canonicalId === characterId);
  if (!character) return STYLE_PREFIX;
  const costume = extraction.costumes.find((c) => c.characterId === characterId);
  return [
    STYLE_PREFIX,
    "full-body character bible portrait reference",
    character.identityLockPrompt,
    `role: ${character.role}`,
    `personality cues: ${character.personality.join(", ")}`,
    costume
      ? `wearing primary costume: ${costume.label}, ${costume.garments.join(", ")}`
      : character.grooming,
    HARYANA_VISUAL,
    "neutral backdrop, consistent proportions, sharp facial detail for identity lock",
  ]
    .filter(Boolean)
    .join(", ");
}

function scenePrompt(extraction: ExtractionResult, sceneNumber: number): string {
  const scene = extraction.scenes.find((s) => s.number === sceneNumber);
  if (!scene) return STYLE_PREFIX;
  const location = extraction.locations.find((l) => l.canonicalId === scene.locationId);
  const people = scene.characterIds
    .map((id) => extraction.characters.find((c) => c.canonicalId === id))
    .filter(Boolean)
    .map((c) => `${c!.names[0]} (${c!.identityLockPrompt})`)
    .join("; ");
  const costumes = extraction.costumes
    .filter((c) => c.sceneNumbers.includes(sceneNumber))
    .map((c) => `${c.label}: ${c.garments.join(", ")}`)
    .join("; ");

  return [
    STYLE_PREFIX,
    "single cinematic keyframe for one scene",
    scene.slugline,
    location?.architectureCues || location?.description || scene.production.set,
    `time: ${scene.time}, mood: ${scene.mood}, weather: ${scene.weather}`,
    `blocking and present characters: ${people}`,
    `costumes locked: ${costumes}`,
    `props: ${scene.production.props.join(", ")}`,
    `gestures: ${scene.production.gestures.join(", ")}`,
    HARYANA_VISUAL,
    "faces must match provided character reference images",
  ]
    .filter(Boolean)
    .join(", ");
}

export async function generateVisualPack(opts: {
  jobId: string;
  extraction: ExtractionResult;
  usageLogPath: string;
}): Promise<VisualPack> {
  const base = jobDir(opts.jobId);
  const pack: VisualPack = {
    characterImages: {},
    costumeImages: {},
    sceneImages: {},
    stylePrefix: STYLE_PREFIX,
  };

  const characterAbs = new Map<string, string>();

  // Stage 1: character bible portraits (text only) — identity lock source.
  const important = opts.extraction.characters.filter((c) => c.important);
  for (const character of important) {
    const rel = path.join("images", "characters", `${character.canonicalId}.png`);
    const abs = path.join(base, rel);
    await generateImage({
      purpose: `image_character_${character.canonicalId}`,
      usageLogPath: opts.usageLogPath,
      prompt: characterPrompt(opts.extraction, character.canonicalId),
      outPath: abs,
    });
    pack.characterImages[character.canonicalId] = rel;
    character.imagePath = rel;
    characterAbs.set(character.canonicalId, abs);
  }

  // Stage 2a: costume sheets conditioned on character reference.
  for (const costume of opts.extraction.costumes) {
    const rel = path.join("images", "costumes", `${costume.canonicalId}.png`);
    const abs = path.join(base, rel);
    await generateImage({
      purpose: `image_costume_${costume.canonicalId}`,
      usageLogPath: opts.usageLogPath,
      prompt: costumePrompt(opts.extraction, costume.canonicalId),
      outPath: abs,
      referenceImagePath: characterAbs.get(costume.characterId),
    });
    pack.costumeImages[costume.canonicalId] = rel;
    costume.imagePath = rel;
  }

  // Stage 2b: scene keyframes conditioned on the first important character present.
  for (const scene of opts.extraction.scenes) {
    const rel = path.join("images", "scenes", `scene_${scene.number}.png`);
    const abs = path.join(base, rel);
    const refId =
      scene.characterIds.find((id) => characterAbs.has(id)) ||
      important[0]?.canonicalId;
    await generateImage({
      purpose: `image_scene_${scene.number}`,
      usageLogPath: opts.usageLogPath,
      prompt: scenePrompt(opts.extraction, scene.number),
      outPath: abs,
      referenceImagePath: refId ? characterAbs.get(refId) : undefined,
    });
    pack.sceneImages[String(scene.number)] = rel;
    scene.imagePath = rel;
  }

  return pack;
}
