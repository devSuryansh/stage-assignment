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
  const panel = {
    background: "var(--surface-panel)",
    border: "1px solid var(--border-subtle)",
  } as const;

  return (
    <div>
      <JobNav jobId={id} current="compare" status={job.status} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1
          className="text-3xl"
          style={{ fontFamily: "var(--font-display), sans-serif" }}
        >
          Adapted screenplay comparison
        </h1>
        <p className="mt-1" style={{ color: "var(--text-muted)" }}>
          Original vs {job.primaryCulture.label}
          {!job.adaptedScreenplay ? " (generate after approval)" : ""}
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <section className="rounded" style={panel}>
            <h2
              className="px-3 py-2 text-sm font-semibold"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              Original
            </h2>
            <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap p-3 font-mono text-xs leading-relaxed">
              {job.originalText}
            </pre>
          </section>
          <section className="rounded" style={panel}>
            <h2
              className="px-3 py-2 text-sm font-semibold"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
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
