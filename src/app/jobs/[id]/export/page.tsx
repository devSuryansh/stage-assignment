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
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Continuity report & export
        </h1>
        <p className="text-slate-600">
          Download the adapted screenplay, breakdown, bibles, continuity report, and
          image pack as a ZIP.
        </p>
        <a
          href={`/api/jobs/${id}/export`}
          className="inline-block rounded bg-[#1f5c4d] px-4 py-2 text-sm text-[#f4f7f9]"
        >
          Download production pack ZIP
        </a>
        <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded border border-slate-300 bg-[#f4f7f9] p-4 font-mono text-xs">
          {report}
        </pre>
      </main>
    </div>
  );
}
