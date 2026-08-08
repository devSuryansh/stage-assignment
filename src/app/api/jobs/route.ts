import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { after } from "next/server";
import { createJob, listJobs } from "@/lib/store";
import { ingestFile, normalizeScreenplayText } from "@/lib/ingest";
import { CULTURE_PRESETS } from "@/lib/culture/bangru";
import { FIXTURES, getFixture } from "@/lib/fixtures";
import type { CultureSelection, SettingType } from "@/lib/schema";
import { runExtraction } from "@/lib/pipeline/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Static path map so Vercel file tracing always bundles fixtures. */
const FIXTURE_FILES: Record<string, string> = {
  "jail-5scenes": "sample-5scenes.txt",
  "sabzi-mandi": "sample-sabzi-mandi.txt",
  "bus-adda": "sample-bus-adda.txt",
  thana: "sample-thana.txt",
};

async function loadFixtureText(fixtureId: string) {
  const meta = getFixture(fixtureId) || getFixture("jail-5scenes");
  if (!meta) throw new Error(`Unknown fixture: ${fixtureId}`);
  const filename = FIXTURE_FILES[meta.id] || meta.filename;
  // Literal directory + known filenames keep fixtures in the serverless bundle.
  const abs = path.join(process.cwd(), "fixtures", filename);
  const text = await fs.readFile(abs, "utf8");
  return { text, filename: meta.filename, meta };
}

export async function GET() {
  try {
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
      fixtures: FIXTURES,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
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
      const fixtureId = String(form.get("fixtureId") || "");
      const dialect = String(form.get("dialect") || "Bangru");
      const region = String(form.get("region") || "Haryana");
      const setting = String(form.get("setting") || "rural") as SettingType;

      cultures = [
        {
          dialect,
          region,
          setting,
          label: `${dialect} (${region}, ${setting})`,
        },
      ];

      if (fixtureId) {
        const loaded = await loadFixtureText(fixtureId);
        text = loaded.text;
        filename = loaded.filename;
      } else if (file && typeof file !== "string") {
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

      // Fixture must load even when cultures are also provided (UI always sends both).
      if (body.useFixture || body.fixtureId) {
        const loaded = await loadFixtureText(
          String(body.fixtureId || "jail-5scenes"),
        );
        text = loaded.text;
        filename = loaded.filename;
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

    // Return quickly on Vercel; finish extraction in the same invocation via after().
    after(async () => {
      try {
        await runExtraction(job.id);
      } catch (err) {
        console.error("background extraction failed", job.id, err);
      }
    });

    return NextResponse.json({ id: job.id, status: "extracting" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
