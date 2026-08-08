/**
 * End-to-end sample regeneration against fixtures/sample-5scenes.txt.
 * Requires GROQ_API_KEY (free). Images use free Pollinations flux by default.
 */
import "dotenv/config";
import { promises as fs } from "fs";
import path from "path";
import { createJob, saveJob, jobDir, loadJob } from "../src/lib/store";
import { extractScreenplay } from "../src/lib/pipeline/extract";
import { adaptScreenplay } from "../src/lib/pipeline/adapt";
import { generateVisualPack } from "../src/lib/pipeline/visuals";
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

  const extraction = await extractScreenplay({
    text: fixture,
    usageLogPath: job.usageLogPath,
    culture: BANGRU_DEFAULT,
    useHeuristicFallback: false,
  });
  if (extraction.adaptationPlan) extraction.adaptationPlan.approved = true;

  job.extraction = extraction;
  job.status = "adapting";
  job.approvedAt = new Date().toISOString();
  await saveJob(job);

  const adapted = await adaptScreenplay({
    originalText: fixture,
    extraction,
    culture: BANGRU_DEFAULT,
    usageLogPath: job.usageLogPath,
  });
  job.adaptedScreenplay = adapted;
  job.status = "generating";
  await saveJob(job);

  const visualPack = await generateVisualPack({
    jobId: job.id,
    extraction,
    usageLogPath: job.usageLogPath,
  });

  for (const c of extraction.characters) {
    if (visualPack.characterImages[c.canonicalId]) {
      c.imagePath = visualPack.characterImages[c.canonicalId];
    }
  }
  for (const c of extraction.costumes) {
    if (visualPack.costumeImages[c.canonicalId]) {
      c.imagePath = visualPack.costumeImages[c.canonicalId];
    }
  }
  for (const s of extraction.scenes) {
    if (visualPack.sceneImages[String(s.number)]) {
      s.imagePath = visualPack.sceneImages[String(s.number)];
    }
  }

  job.extraction = extraction;
  job.visualPack = visualPack;
  job.status = "ready";
  await saveJob(job);

  const outDir = path.join(process.cwd(), "samples", "bangru");
  await fs.mkdir(path.join(outDir, "images", "characters"), { recursive: true });
  await fs.mkdir(path.join(outDir, "images", "costumes"), { recursive: true });
  await fs.mkdir(path.join(outDir, "images", "scenes"), { recursive: true });

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

  const imagesDir = path.join(jobDir(job.id), "images");
  await fs.cp(imagesDir, path.join(outDir, "images"), { recursive: true });

  const zip = await exportJobZip(job);
  await fs.writeFile(path.join(outDir, "production-pack.zip"), zip);

  await fs.writeFile(
    path.join(outDir, "README.md"),
    `# Bangru sample pack

Generated from fixtures/sample-5scenes.txt via the live two-pass extraction + scene-by-scene adaptation + reference-conditioned image pipeline.

- Job id: ${job.id}
- Job dir: ${jobDir(job.id)}
- Chat model: ${process.env.GROQ_CHAT_MODEL || "llama-3.3-70b-versatile"}
- Image model: pollinations-flux (free) unless HF_IMAGES=1

Re-run: \`npm run sample\` with GROQ_API_KEY loaded.
`,
  );

  const fresh = await loadJob(job.id);
  console.log("Wrote samples/bangru for job", fresh?.id, "status", fresh?.status);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
