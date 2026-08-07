import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export async function ingestFile(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".txt") || lower.endsWith(".md")) {
    return buffer.toString("utf8");
  }
  if (lower.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  if (lower.endsWith(".pdf")) {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text || "";
    } finally {
      await parser.destroy();
    }
  }
  throw new Error(`Unsupported file type: ${filename}`);
}

export function normalizeScreenplayText(text: string): string {
  return text
    .replace(/\u000c/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
