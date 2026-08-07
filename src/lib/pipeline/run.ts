import { adaptScreenplay } from "./adapt";
import { extractScreenplay } from "./extract";
import { generateVisualPack } from "./visuals";
import { loadJob, saveJob, updateJobStatus } from "../store";

export async function runExtraction(jobId: string) {
  const job = await loadJob(jobId);
  if (!job) throw new Error("Job not found");
  await updateJobStatus(jobId, "extracting");
  try {
    const extraction = await extractScreenplay({
      text: job.originalText,
      usageLogPath: job.usageLogPath,
      culture: job.primaryCulture,
      useHeuristicFallback: true,
    });
    await updateJobStatus(jobId, "awaiting_approval", { extraction });
    return extraction;
  } catch (err) {
    await updateJobStatus(jobId, "failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export async function approveAndGenerate(
  jobId: string,
  opts: { approved?: boolean } = {},
) {
  const job = await loadJob(jobId);
  if (!job) throw new Error("Job not found");
  if (!job.extraction) throw new Error("Extraction missing");

  if (job.status === "ready") {
    throw new Error("Job already generated; re-approval refused");
  }
  if (job.status !== "awaiting_approval") {
    throw new Error(
      `Job must be awaiting_approval (current: ${job.status})`,
    );
  }
  if (opts.approved !== true) {
    throw new Error("Explicit approved:true required");
  }

  if (job.extraction.issues.some((i) => i.severity === "error")) {
    throw new Error("Resolve continuity errors before generation");
  }

  const extraction = {
    ...job.extraction,
    adaptationPlan: job.extraction.adaptationPlan
      ? { ...job.extraction.adaptationPlan, approved: true }
      : job.extraction.adaptationPlan,
  };

  await updateJobStatus(jobId, "adapting", {
    extraction,
    approvedAt: new Date().toISOString(),
  });

  try {
    const adaptedScreenplay = await adaptScreenplay({
      originalText: job.originalText,
      extraction,
      culture: job.primaryCulture,
      usageLogPath: job.usageLogPath,
    });

    await updateJobStatus(jobId, "generating", { adaptedScreenplay });

    const fresh = await loadJob(jobId);
    if (!fresh?.extraction) throw new Error("Job lost extraction");

    const visualPack = await generateVisualPack({
      jobId,
      extraction: fresh.extraction,
      usageLogPath: fresh.usageLogPath,
    });

    const updatedExtraction = { ...fresh.extraction };
    for (const c of updatedExtraction.characters) {
      if (visualPack.characterImages[c.canonicalId]) {
        c.imagePath = visualPack.characterImages[c.canonicalId];
      }
    }
    for (const c of updatedExtraction.costumes) {
      if (visualPack.costumeImages[c.canonicalId]) {
        c.imagePath = visualPack.costumeImages[c.canonicalId];
      }
    }
    for (const s of updatedExtraction.scenes) {
      if (visualPack.sceneImages[String(s.number)]) {
        s.imagePath = visualPack.sceneImages[String(s.number)];
      }
    }

    await updateJobStatus(jobId, "ready", {
      adaptedScreenplay,
      visualPack,
      extraction: updatedExtraction,
    });

    return await loadJob(jobId);
  } catch (err) {
    await updateJobStatus(jobId, "failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export async function saveExtractionEdits(
  jobId: string,
  extraction: NonNullable<Awaited<ReturnType<typeof loadJob>>>["extraction"],
) {
  const job = await loadJob(jobId);
  if (!job) throw new Error("Job not found");
  job.extraction = extraction;
  job.status = "awaiting_approval";
  await saveJob(job);
  return job;
}
