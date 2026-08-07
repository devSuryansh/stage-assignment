import { JobNav } from "@/components/JobNav";
import { loadJob } from "@/lib/store";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ComparePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await loadJob(id);
  if (!job) notFound();

  return (
    <div>
      <JobNav jobId={id} current="compare" status={job.status} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1
          className="text-3xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Adapted screenplay comparison
        </h1>
        <p className="mt-1 text-slate-600">
          Original vs {job.primaryCulture.label}
          {!job.adaptedScreenplay ? " (generate after approval)" : ""}
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <section className="rounded border border-slate-300 bg-[#f4f7f9]">
            <h2 className="border-b border-slate-300 px-3 py-2 text-sm font-semibold">
              Original
            </h2>
            <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap p-3 font-mono text-xs leading-relaxed">
              {job.originalText}
            </pre>
          </section>
          <section className="rounded border border-slate-300 bg-[#f4f7f9]">
            <h2 className="border-b border-slate-300 px-3 py-2 text-sm font-semibold">
              Adapted ({job.primaryCulture.dialect})
            </h2>
            <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap p-3 font-mono text-xs leading-relaxed">
              {job.adaptedScreenplay || "Not generated yet. Approve the plan first."}
            </pre>
          </section>
        </div>
      </main>
    </div>
  );
}
