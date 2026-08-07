import type { CultureSelection, ExtractionResult, Scene } from "../schema";
import { chatText } from "../ai/client";
import { buildBangruProfile } from "../culture/bangru";
import { parseScreenplay } from "../parse/screenplay";

function cultureLockCard(culture: CultureSelection): string {
  const profile = buildBangruProfile(culture.setting);
  return `
CULTURE LOCK — ${culture.label}
Dialect: ${profile.dialect}. Region: ${profile.region}. Setting: ${profile.setting}.

Write Bangru as spoken in Haryana:
- सै not है
- के not क्या
- म्हारा not हमारा
- थारा not तुम्हारा
- कोन्या for negation
- Honorifics by rank/age: bhaiya, kaka, tau, puttar

Do NOT translate Hindi line-by-line. Replace jokes, insults, and threats so a Haryanvi speaker recognises them as theirs.
Forbidden failure mode: polished Hindi with one Haryanvi word sprinkled in.
Keep scene headings, scene count, dramatic function, and critical prop/continuity beats intact.
Nonverbal: ${profile.nonverbal.slice(0, 3).join("; ")}.
Architecture/wardrobe cues stay culturally exact Bangru/Haryana — never a generic North-Indian mashup.
`.trim();
}

function sceneBlock(originalText: string, scene: Scene): string {
  const parsed = parseScreenplay(originalText);
  const match = parsed.scenes.find((s) => s.number === scene.number);
  return match?.rawText || scene.slugline;
}

export async function adaptScreenplay(opts: {
  originalText: string;
  extraction: ExtractionResult;
  culture: CultureSelection;
  usageLogPath: string;
}): Promise<string> {
  const plan = opts.extraction.adaptationPlan;
  const lock = cultureLockCard(opts.culture);
  const scenes = opts.extraction.scenes;
  const adaptedScenes: string[] = [];

  for (const scene of scenes) {
    const previous = adaptedScenes.join("\n\n---\n\n");
    const originalScene = sceneBlock(opts.originalText, scene);

    const adapted = await chatText({
      purpose: `adapt_scene_${scene.number}`,
      usageLogPath: opts.usageLogPath,
      temperature: 0.55,
      system: `You are a cultural screenplay adaptation specialist for Bangru Haryanvi.
${lock}
Output this scene in screenplay format only. No commentary.`,
      user: `ADAPTATION PLAN SUMMARY:
${plan?.settingRemap || ""}
${plan?.costumePlanSummary || ""}

CANONICAL CHARACTERS:
${JSON.stringify(
  opts.extraction.characters.map((c) => ({
    id: c.canonicalId,
    names: c.names,
    role: c.role,
  })),
  null,
  2,
)}

PREVIOUSLY ADAPTED SCENES (keep names, honorifics, register stable):
${previous.slice(-12000) || "(none — this is scene 1)"}

ORIGINAL SCENE ${scene.number}:
${originalScene}`,
    });

    adaptedScenes.push(adapted.trim());
  }

  const header = `/* CULTURAL ADAPTATION: ${opts.culture.label} */\n/* Dialect: ${opts.culture.dialect} | Region: ${opts.culture.region} | Setting: ${opts.culture.setting} */\n\n`;
  return header + adaptedScenes.join("\n\n");
}
