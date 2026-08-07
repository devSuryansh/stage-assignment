import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { createJob, listJobs } from "@/lib/store";
import { ingestFile, normalizeScreenplayText } from "@/lib/ingest";
import { CULTURE_PRESETS } from "@/lib/culture/bangru";
import type { CultureSelection, SettingType } from "@/lib/schema";
import { runExtraction } from "@/lib/pipeline/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const jobs = await listJobs();
  return NextResponse.json({
    jobs: jobs.map((j) => ({
      id: j.id,
      status: j.status,
      createdAt: j.createdAt,
      culture: j.primaryCulture,
      sourceFilename: j.sourceFilename,
    })),
    presets: CULTURE_PRESETS,
  });
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let text = "";
    let filename: string | undefined;
    let cultures: CultureSelection[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const pasted = String(form.get("text") || "");
      const file = form.get("file");
      const dialect = String(form.get("dialect") || "Bangru");
      const region = String(form.get("region") || "Haryana");
      const setting = String(form.get("setting") || "rural") as SettingType;
      const bonus = String(form.get("bonusCulture") || "") === "true";

      cultures = [
        {
          dialect,
          region,
          setting,
          label: `${dialect} (${region}, ${setting})`,
        },
      ];
      if (bonus) {
        cultures.push({
          dialect: "Malwai",
          region: "Malwa, Punjab",
          setting: "rural",
          label: "Malwai Punjabi (Malwa, rural)",
        });
      }

      if (file && typeof file !== "string") {
        const buf = Buffer.from(await file.arrayBuffer());
        filename = file.name;
        text = await ingestFile(buf, file.name);
      } else if (pasted.trim()) {
        text = pasted;
        filename = "pasted.txt";
      }
    } else {
      const body = await req.json();
      text = body.text || "";
      filename = body.filename;
      cultures = body.cultures;
      if (!cultures?.length && body.useFixture) {
        const fixture = await fs.readFile(
          path.join(process.cwd(), "fixtures", "sample-5scenes.txt"),
          "utf8",
        );
        text = fixture;
        filename = "sample-5scenes.txt";
      }
      if (!cultures?.length) {
        cultures = [
          {
            dialect: "Bangru",
            region: "Haryana",
            setting: "rural",
            label: "Bangru Haryanvi (Haryana, rural)",
          },
        ];
      }
    }

    text = normalizeScreenplayText(text);
    if (!text) {
      return NextResponse.json({ error: "No screenplay provided" }, { status: 400 });
    }

    const job = await createJob({
      originalText: text,
      sourceFilename: filename,
      cultures,
    });

    // Kick extraction (await for MVP reliability)
    await runExtraction(job.id);

    return NextResponse.json({ id: job.id, status: "awaiting_approval" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
