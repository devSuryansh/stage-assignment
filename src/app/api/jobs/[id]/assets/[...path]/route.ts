import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { loadJob, jobDir } from "@/lib/store";

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
  const imagesRoot = path.resolve(jobDir(id), "images");
  const abs = path.resolve(jobDir(id), rel);

  if (!abs.startsWith(imagesRoot + path.sep) && abs !== imagesRoot) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const buf = await fs.readFile(abs);
    const ext = path.extname(abs).toLowerCase();
    const type =
      ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".webp"
            ? "image/webp"
            : "application/octet-stream";
    return new NextResponse(buf, {
      headers: { "Content-Type": type, "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
}
