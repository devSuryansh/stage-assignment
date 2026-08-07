import { NextResponse } from "next/server";
import { approveAndGenerate } from "@/lib/pipeline/run";
import { loadJob, saveJob } from "@/lib/store";
import type { ExtractionResult } from "@/lib/schema";
import { detectContinuityIssues } from "@/lib/pipeline/dedupe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const body = await req.json().catch(() => ({}));
    if (body.extraction) {
      const job = await loadJob(id);
      if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const extraction = body.extraction as ExtractionResult;
      extraction.issues = detectContinuityIssues(
        extraction.characters,
        extraction.costumes,
        extraction.scenes,
        extraction.continuity,
      );
      if (extraction.adaptationPlan) {
        extraction.adaptationPlan.approved = Boolean(body.approved);
      }
      job.extraction = extraction;
      await saveJob(job);
    }

    const result = await approveAndGenerate(id, {
      approved: body.approved === true,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
