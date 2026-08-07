import { promises as fs } from "fs";
import path from "path";
import { createJob, saveJob, jobDir } from "../src/lib/store";
import { heuristicExtract } from "../src/lib/pipeline/extract";
import { bangruHeuristicAdaptation } from "../src/lib/pipeline/adapt";
import {
  buildBreakdown,
  buildContinuityReport,
  exportJobZip,
} from "../src/lib/pipeline/export";
import { BANGRU_DEFAULT } from "../src/lib/schema";

async function main() {
  const fixture = await fs.readFile(
    path.join(process.cwd(), "fixtures", "sample-5scenes.txt"),
    "utf8",
  );
  const job = await createJob({
    originalText: fixture,
    sourceFilename: "sample-5scenes.txt",
    cultures: [BANGRU_DEFAULT],
  });

  const extraction = heuristicExtract(fixture);
  if (extraction.adaptationPlan) extraction.adaptationPlan.approved = true;
  const adapted = bangruHeuristicAdaptation(fixture, BANGRU_DEFAULT);

  job.extraction = extraction;
  job.adaptedScreenplay = adapted;
  job.status = "ready";
  job.approvedAt = new Date().toISOString();
  job.visualPack = {
    characterImages: {},
    costumeImages: {},
    sceneImages: {},
    stylePrefix: "sample-run-without-live-images",
  };
  await saveJob(job);

  await fs.appendFile(
    job.usageLogPath,
    JSON.stringify({
      ts: new Date().toISOString(),
      purpose: "sample_script",
      model: "heuristic",
      latencyMs: 0,
      ok: true,
    }) + "\n",
  );

  const outDir = path.join(process.cwd(), "samples", "bangru");
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "adapted_screenplay.txt"), adapted);
  await fs.writeFile(
    path.join(outDir, "breakdown.json"),
    JSON.stringify(buildBreakdown(job), null, 2),
  );
  await fs.writeFile(
    path.join(outDir, "continuity_report.md"),
    buildContinuityReport(job),
  );
  await fs.copyFile(job.usageLogPath, path.join(outDir, "ai-usage-log.jsonl"));

  const zip = await exportJobZip(job);
  await fs.writeFile(path.join(outDir, "production-pack.zip"), zip);

  await fs.writeFile(
    path.join(outDir, "README.md"),
    `# Bangru sample pack\n\nGenerated from fixtures/sample-5scenes.txt via heuristic pipeline (offline sample).\nJob id: ${job.id}\nJob dir: ${jobDir(job.id)}\n\nRe-run with live FreeLLMAPI from the web UI for LLM adaptation + images.\n`,
  );

  console.log("Wrote samples/bangru for job", job.id);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
