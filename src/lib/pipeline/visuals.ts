import path from "path";
import type { ExtractionResult, VisualPack } from "../schema";
import { STYLE_PREFIX } from "../schema";
import { generateImage } from "../ai/client";
import { jobDir } from "../store";

function costumePrompt(extraction: ExtractionResult, costumeId: string): string {
  const costume = extraction.costumes.find((c) => c.canonicalId === costumeId);
  const character = extraction.characters.find((c) => c.canonicalId === costume?.characterId);
  if (!costume || !character) return STYLE_PREFIX;
  return [
    STYLE_PREFIX,
    "full-body front view costume reference sheet",
    character.identityLockPrompt,
    `costume: ${costume.label}`,
    `garments: ${costume.garments.join(", ")}`,
    `fabrics: ${costume.fabrics.join(", ")}`,
    `colors: ${costume.colors.join(", ")}`,
    `footwear: ${costume.footwear}`,
    costume.jewelry.length ? `jewelry: ${costume.jewelry.join(", ")}` : "",
    costume.headwear ? `headwear: ${costume.headwear}` : "",
    `grooming: ${costume.grooming}`,
    "Bangru Haryanvi / rural Haryana cultural authenticity",
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
    "full-body character bible reference",
    character.identityLockPrompt,
    `role: ${character.role}`,
    `personality cues: ${character.personality.join(", ")}`,
    costume
      ? `wearing primary costume: ${costume.label}, ${costume.garments.join(", ")}`
      : character.grooming,
    "Bangru Haryanvi rural Haryana casting authenticity",
    "neutral backdrop, consistent proportions",
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
    "Bangru Haryanvi rural Haryana jail/world details, no cultural mixing",
    "recognize culture from visuals alone",
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
  }

  // Unique costumes only once
  for (const costume of opts.extraction.costumes) {
    const rel = path.join("images", "costumes", `${costume.canonicalId}.png`);
    const abs = path.join(base, rel);
    await generateImage({
      purpose: `image_costume_${costume.canonicalId}`,
      usageLogPath: opts.usageLogPath,
      prompt: costumePrompt(opts.extraction, costume.canonicalId),
      outPath: abs,
    });
    pack.costumeImages[costume.canonicalId] = rel;
    costume.imagePath = rel;
  }

  for (const scene of opts.extraction.scenes) {
    const rel = path.join("images", "scenes", `scene_${scene.number}.png`);
    const abs = path.join(base, rel);
    await generateImage({
      purpose: `image_scene_${scene.number}`,
      usageLogPath: opts.usageLogPath,
      prompt: scenePrompt(opts.extraction, scene.number),
      outPath: abs,
    });
    pack.sceneImages[String(scene.number)] = rel;
    scene.imagePath = rel;
  }

  return pack;
}
