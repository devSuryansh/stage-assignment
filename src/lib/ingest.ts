/**
 * File ingest for screenplay uploads.
 * Heavy parsers (pdf-parse / mammoth) are dynamically imported so the
 * /api/jobs route can load on Vercel without DOMMatrix / canvas polyfills.
 */

export async function ingestFile(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".txt") || lower.endsWith(".md")) {
    return buffer.toString("utf8");
  }
  if (lower.endsWith(".docx")) {
    const mammothMod = await import("mammoth");
    const mammoth = mammothMod.default ?? mammothMod;
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  if (lower.endsWith(".pdf")) {
    try {
      // pdf-parse v2 pulls pdfjs, which expects browser canvas globals.
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        return result.text || "";
      } finally {
        await parser.destroy();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/DOMMatrix|canvas|ImageData|Path2D/i.test(msg)) {
        throw new Error(
          "PDF parsing is unavailable in this environment. Upload TXT or DOCX, or paste the screenplay text.",
        );
      }
      throw err;
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
