import type { CultureSelection, ExtractionResult } from "../schema";
import { chatText } from "../ai/client";
import { buildBangruProfile } from "../culture/bangru";

export async function adaptScreenplay(opts: {
  originalText: string;
  extraction: ExtractionResult;
  culture: CultureSelection;
  usageLogPath: string;
}): Promise<string> {
  const plan = opts.extraction.adaptationPlan;
  const profile = plan?.culture || buildBangruProfile(opts.culture.setting);

  try {
    const adapted = await chatText({
      purpose: "adapt_screenplay_bangru",
      usageLogPath: opts.usageLogPath,
      temperature: 0.55,
      system: `You are a cultural screenplay adaptation specialist.
Rewrite the screenplay so it feels native to the target culture, NOT translated or decorated.
Keep scene headings structure, scene count, character dramatic functions, and critical prop/continuity beats.
Preserve the collar-lump transfer and number placard 613 continuity exactly.
Output screenplay format only.`,
      user: `TARGET CULTURE PROFILE:
${JSON.stringify(profile, null, 2)}

ADAPTATION PLAN:
${JSON.stringify(plan, null, 2)}

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

ORIGINAL SCREENPLAY:
${opts.originalText.slice(0, 45000)}`,
    });
    return adapted.trim();
  } catch {
    return bangruHeuristicAdaptation(opts.originalText, opts.culture);
  }
}

/** Offline/demo adaptation stub with clear Bangru markers when LLM unavailable */
export function bangruHeuristicAdaptation(
  original: string,
  culture: CultureSelection,
): string {
  const header = `/* CULTURAL ADAPTATION: ${culture.label} */
/* Dialect: ${culture.dialect} | Region: ${culture.region} | Setting: ${culture.setting} */
/* NOTE: Heuristic offline adaptation. Prefer LLM path when FreeLLMAPI is available. */

`;

  let text = original;
  const replacements: Array<[RegExp, string]> = [
    [/HAVALDAR/g, "HAVALDAR (THANEDAR-STYLE)"],
    [/HEAD CLERK/g, "MUNSHI"],
    [/DAGDU/g, "DAGDU"],
    [/GANPAT/g, "GANPAT KAKA"],
    [/TRUSTY/g, "TRUSTY (CHAUKIDAR INMATE)"],
    [/THE CONVICT/g, "THE CONVICT"],
    [/अरे देखो देखो। बड़ा माल आया है आज।/g, "अरे देखो-देखो यार! आज तगड़ा माल आया सै।"],
    [/नाम\?/g, "नांव तेरा के सै?"],
    [/नाम-वाम रहने दे। इनका नाम नंबर होता है।/g, "नांव-वांव छोड। इणका नांव नंबर होवै सै।"],
    [/आज से तू ये है। और कुछ नहीं।/g, "आज तै तू ये सै। होर कुच्छ नहीं।"],
    [/जल्दी कर।/g, "हिल जा रे।"],
  ];

  for (const [from, to] of replacements) {
    text = text.replace(from, to);
  }

  return (
    header +
    text +
    `\n\n/* Bangru nonverbal notes: palm shove for authority; eyes down for submission; barrack raised bedroll = izzat seat; Ganpat Kaka uses elder mercy without breaking hierarchy. */\n`
  );
}
