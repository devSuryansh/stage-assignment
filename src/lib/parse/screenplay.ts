/**
 * Format-driven screenplay parser.
 *
 * Derives structure purely from screenplay conventions (sluglines, character
 * cues, parentheticals) so it works on any script. Nothing here knows about a
 * particular story: it is both the pre-pass that grounds the LLM extraction and
 * the offline fallback when no model is reachable.
 */

export type IntExt = "INT" | "EXT" | "INT/EXT" | "OTHER";

export interface ParsedDialogue {
  character: string;
  parenthetical?: string;
  text: string;
}

export interface ParsedScene {
  number: number;
  slugline: string;
  intExt: IntExt;
  locationName: string;
  subLocation: string;
  time: string;
  action: string;
  dialogue: ParsedDialogue[];
  characterCues: string[];
  rawText: string;
}

export interface ParsedScreenplay {
  scenes: ParsedScene[];
  characterCues: string[];
}

const SLUGLINE = /^\s*(INT\.?\/EXT\.?|EXT\.?\/INT\.?|I\/E\.?|INT\.?|EXT\.?)([\s.-]+)(.*)$/i;

const TIME_TOKENS = [
  "CONTINUOUS",
  "MOMENTS LATER",
  "LATER",
  "SAME TIME",
  "SAME",
  "MORNING",
  "AFTERNOON",
  "EVENING",
  "NIGHT",
  "DAY",
  "DAWN",
  "DUSK",
  "SUNSET",
  "SUNRISE",
  "MAGIC HOUR",
  "PRE-DAWN",
];

const TRANSITION =
  /^(CUT|SMASH CUT|MATCH CUT|HARD CUT|DISSOLVE|FADE|INTERCUT|WIPE|JUMP CUT)\b|^(SUPER|TITLE|CHYRON|CAPTION|SUBTITLE|INSERT|MONTAGE|SERIES OF SHOTS|OVER BLACK|THE END|FLASHBACK|BACK TO SCENE)\b|\bTO:$/i;

/**
 * Screenplay cues are uppercase, but so is any Devanagari line (the script has
 * no case), so requiring a cased Latin letter is what keeps Hindi dialogue and
 * action from being mistaken for a character cue.
 */
function isUpperCue(line: string): boolean {
  if (!/[A-Za-z]/.test(line)) return false;
  return line === line.toUpperCase();
}

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

function stripCueSuffix(name: string): string {
  return name
    .replace(/\((?:CONT'D|CONTD|CONT|V\.?O\.?|O\.?S\.?|O\.?C\.?|PRE-?LAP|FILTERED)\.?\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * PDF text extraction commonly welds the scene number onto the final token of a
 * slugline ("- DAY1", "- CONTINUOUS3"). Strip it so time parsing stays reliable.
 */
function stripWeldedNumber(token: string): string {
  return token.replace(/(\D)\d{1,3}$/, "$1").trim();
}

function parseSlugline(line: string): {
  intExt: IntExt;
  locationName: string;
  subLocation: string;
  time: string;
} {
  const match = line.match(SLUGLINE);
  if (!match) {
    return { intExt: "OTHER", locationName: line.trim(), subLocation: "", time: "" };
  }

  const prefix = match[1].toUpperCase().replace(/\./g, "");
  const intExt: IntExt =
    prefix === "INT" ? "INT" : prefix === "EXT" ? "EXT" : "INT/EXT";

  const parts = match[3]
    .split(/\s+[-–—]\s+|\s{2,}/)
    .map((p) => stripWeldedNumber(p.trim()))
    .filter(Boolean);

  let time = "";
  if (parts.length > 1) {
    const last = parts[parts.length - 1].toUpperCase();
    if (TIME_TOKENS.some((t) => last === t || last.startsWith(t + " ") || last.endsWith(" " + t))) {
      time = parts.pop()!.toUpperCase();
    }
  }

  return {
    intExt,
    locationName: parts[0] || "",
    subLocation: parts.slice(1).join(" - "),
    time,
  };
}

function splitIntoSceneBlocks(lines: string[]): Array<{ slugline: string; body: string[] }> {
  const blocks: Array<{ slugline: string; body: string[] }> = [];
  let current: { slugline: string; body: string[] } | null = null;

  for (const line of lines) {
    if (SLUGLINE.test(line) && line.trim().length > 4) {
      if (current) blocks.push(current);
      current = { slugline: stripWeldedNumber(line.trim()), body: [] };
      continue;
    }
    if (current) current.body.push(line);
  }
  if (current) blocks.push(current);
  return blocks;
}

function parseSceneBody(body: string[]): {
  action: string;
  dialogue: ParsedDialogue[];
  characterCues: string[];
} {
  const dialogue: ParsedDialogue[] = [];
  const actionLines: string[] = [];
  const cues: string[] = [];

  let i = 0;
  while (i < body.length) {
    const raw = body[i];
    const line = raw.trim();

    if (!line) {
      i++;
      continue;
    }

    const isCue =
      isUpperCue(line) &&
      line.length <= 45 &&
      !line.startsWith("(") &&
      !line.endsWith(":") &&
      !TRANSITION.test(line);

    if (!isCue) {
      actionLines.push(line);
      i++;
      continue;
    }

    // A cue only counts if speech actually follows it.
    let j = i + 1;
    while (j < body.length && !body[j].trim()) j++;
    const next = j < body.length ? body[j].trim() : "";
    if (!next || SLUGLINE.test(next) || (isUpperCue(next) && !next.startsWith("("))) {
      actionLines.push(line);
      i++;
      continue;
    }

    const character = stripCueSuffix(line);
    if (character) cues.push(character);

    let parenthetical: string | undefined;
    const speech: string[] = [];
    // Dialogue sits in an indented column while action returns to the left
    // margin, and scripts routinely omit the blank line between the two, so
    // indentation is the only dependable boundary. The column is taken from the
    // first spoken line, never a parenthetical, which is indented deeper.
    let speechIndent: number | null = null;
    i = j;
    while (i < body.length) {
      const spoken = body[i].trim();
      if (!spoken) break;
      if (speechIndent !== null && speechIndent > 0 && indentOf(body[i]) < speechIndent - 2) break;
      if (spoken.startsWith("(")) {
        // Parentheticals can wrap across lines in PDF-extracted text.
        let block = spoken;
        while (!block.includes(")") && i + 1 < body.length) {
          i++;
          block += " " + body[i].trim();
        }
        parenthetical = (parenthetical ? parenthetical + " " : "") + block.replace(/[()]/g, "").trim();
        i++;
        continue;
      }
      if (SLUGLINE.test(spoken)) break;
      if (speechIndent === null) speechIndent = indentOf(body[i]);
      speech.push(spoken);
      i++;
    }

    if (speech.length) {
      dialogue.push({ character, parenthetical, text: speech.join(" ") });
    }
  }

  return {
    action: actionLines.join("\n"),
    dialogue,
    characterCues: [...new Set(cues)],
  };
}

export function parseScreenplay(text: string): ParsedScreenplay {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks = splitIntoSceneBlocks(lines);

  const scenes: ParsedScene[] = blocks.map((block, index) => {
    const { intExt, locationName, subLocation, time } = parseSlugline(block.slugline);
    const { action, dialogue, characterCues } = parseSceneBody(block.body);
    return {
      number: index + 1,
      slugline: block.slugline,
      intExt,
      locationName,
      subLocation,
      time,
      action,
      dialogue,
      characterCues,
      rawText: [block.slugline, ...block.body].join("\n").trim(),
    };
  });

  const allCues = new Set<string>();
  for (const scene of scenes) {
    for (const cue of scene.characterCues) allCues.add(cue);
  }

  return { scenes, characterCues: [...allCues] };
}
