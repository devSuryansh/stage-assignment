import { JobNav } from "@/components/JobNav";
import { loadJob } from "@/lib/store";
import { buildContinuityReport } from "@/lib/pipeline/export";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ExportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await loadJob(id);
  if (!job) notFound();
  const report = buildContinuityReport(job);

  return (
    <div>
      <JobNav jobId={id} current="export" status={job.status} />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <h1
          className="text-3xl"
          style={{ fontFamily: "var(--font-display), sans-serif" }}
        >
          Continuity report & export
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          Download the adapted screenplay, breakdown, bibles, continuity report, and
          image pack as a ZIP.
        </p>
        <a
          href={`/api/jobs/${id}/export`}
          className="inline-block rounded px-4 py-2 text-sm font-medium"
          style={{ background: "var(--accent)", color: "#1a1208" }}
        >
          Download production pack ZIP
        </a>
        <pre
          className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded p-4 font-mono text-xs"
          style={{
            background: "var(--surface-panel)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {report}
        </pre>
      </main>
    </div>
  );
}
