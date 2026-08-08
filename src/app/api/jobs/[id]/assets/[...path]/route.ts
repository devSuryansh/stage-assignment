import { NextResponse } from "next/server";
import path from "path";
import { loadJob } from "@/lib/store";
import { readJobBinary } from "@/lib/fs-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string; path: string[] }> },
) {
  const { id, path: parts } = await ctx.params;
  const job = await loadJob(id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rel = parts.join("/");
  if (!rel.startsWith("images/") || rel.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const buf = await readJobBinary(id, rel);
    if (!buf) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
    const ext = path.extname(rel).toLowerCase();
    const type =
      ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".webp"
            ? "image/webp"
            : "application/octet-stream";
    return new NextResponse(new Uint8Array(buf), {
      headers: { "Content-Type": type, "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
}
