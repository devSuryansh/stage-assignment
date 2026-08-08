import path from "path";
import JSZip from "jszip";
import type { Job } from "../schema";
import { listJobFiles, readJobBinary, readJobText } from "../fs-store";

export function buildContinuityReport(job: Job): string {
  const extraction = job.extraction;
  if (!extraction) return "No extraction available.\n";

  const lines: string[] = [];
  lines.push(`# Continuity Report`);
  lines.push(`Job: ${job.id}`);
  lines.push(`Culture: ${job.primaryCulture.label}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push(`## Issues (${extraction.issues.length})`);
  if (!extraction.issues.length) {
    lines.push("- None flagged.");
  } else {
    for (const issue of extraction.issues) {
      lines.push(
        `- [${issue.severity}] ${issue.message} (scenes: ${issue.sceneNumbers.join(", ") || "n/a"}; entities: ${issue.entityIds.join(", ") || "n/a"})`,
      );
    }
  }
  lines.push("");
  lines.push("## Scene continuity");
  for (const state of extraction.continuity) {
    lines.push(`### Scene ${state.sceneNumber}`);
    for (const beat of state.after) {
      lines.push(
        `- ${beat.characterId}: wearing=[${beat.wearing.join("; ")}] carrying=[${beat.carrying.join("; ")}] gained=[${beat.gained.join("; ")}] lost=[${beat.lost.join("; ")}] injuries=[${beat.injuries.join("; ")}]`,
      );
      if (beat.notes) lines.push(`  note: ${beat.notes}`);
    }
  }
  lines.push("");
  lines.push("## Costume reuse");
  for (const c of extraction.costumes) {
    lines.push(
      `- ${c.canonicalId} (${c.label}) → character ${c.characterId}; scenes ${c.sceneNumbers.join(", ")}; reason=${c.changeReason || "n/a"}`,
    );
  }
  return lines.join("\n");
}

export function buildBreakdown(job: Job) {
  return {
    jobId: job.id,
    culture: job.primaryCulture,
    characters: job.extraction?.characters || [],
    locations: job.extraction?.locations || [],
    props: job.extraction?.props || [],
    costumes: job.extraction?.costumes || [],
    scenes: job.extraction?.scenes || [],
    continuity: job.extraction?.continuity || [],
    issues: job.extraction?.issues || [],
    adaptationPlan: job.extraction?.adaptationPlan,
    visualPack: job.visualPack,
  };
}

export async function exportJobZip(job: Job): Promise<Buffer> {
  const zip = new JSZip();
  const report = buildContinuityReport(job);
  const breakdown = buildBreakdown(job);

  zip.file("original.txt", job.originalText);
  zip.file("adapted_screenplay.txt", job.adaptedScreenplay || "");
  zip.file("continuity_report.md", report);
  zip.file("breakdown.json", JSON.stringify(breakdown, null, 2));
  zip.file(
    "character_bible.json",
    JSON.stringify(job.extraction?.characters || [], null, 2),
  );
  zip.file(
    "costume_bible.json",
    JSON.stringify(job.extraction?.costumes || [], null, 2),
  );

  const usage = await readJobText(job.id, "ai-usage-log.jsonl");
  zip.file("ai-usage-log.jsonl", usage || "");

  const addFolder = async (folderRel: string) => {
    const files = await listJobFiles(job.id, folderRel);
    for (const file of files) {
      const buf = await readJobBinary(job.id, path.join(folderRel, file));
      if (buf) zip.file(path.join(folderRel, file), buf);
    }
  };

  await addFolder(path.join("images", "characters"));
  await addFolder(path.join("images", "costumes"));
  await addFolder(path.join("images", "scenes"));

  return zip.generateAsync({ type: "nodebuffer" });
}
