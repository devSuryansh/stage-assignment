import { promises as fs } from "fs";
import path from "path";
import JSZip from "jszip";
import type { Job } from "../schema";
import { jobDir } from "../store";

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
  const dir = jobDir(job.id);
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

  try {
    const usage = await fs.readFile(job.usageLogPath, "utf8");
    zip.file("ai-usage-log.jsonl", usage);
  } catch {
    zip.file("ai-usage-log.jsonl", "");
  }

  const addFolder = async (folderRel: string) => {
    const abs = path.join(dir, folderRel);
    try {
      const files = await fs.readdir(abs);
      for (const file of files) {
        const buf = await fs.readFile(path.join(abs, file));
        zip.file(path.join(folderRel, file), buf);
      }
    } catch {
      // optional
    }
  };

  await addFolder(path.join("images", "characters"));
  await addFolder(path.join("images", "costumes"));
  await addFolder(path.join("images", "scenes"));

  return zip.generateAsync({ type: "nodebuffer" });
}
