import { NextResponse } from "next/server";
import { loadJob } from "@/lib/store";
import { exportJobZip, buildContinuityReport } from "@/lib/pipeline/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const job = await loadJob(id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = new URL(req.url);
  if (url.searchParams.get("format") === "report") {
    return new NextResponse(buildContinuityReport(job), {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  }

  const zip = await exportJobZip(job);
  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="job-${id}-pack.zip"`,
    },
  });
}
