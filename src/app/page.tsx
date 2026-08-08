import { UploadForm } from "@/components/UploadForm";
import { listJobs } from "@/lib/store";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const jobs = await listJobs();

  return (
    <main className="relative overflow-hidden">
      <div className="hero-glow" aria-hidden />
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-14 md:pt-20">
        <p className="animate-fade-up eyebrow">STAGE · production pack module</p>
        <h1 className="animate-fade-up-delay brand-title mt-4">
          Cultural
          <br />
          Adaptation Studio
        </h1>
        <p className="animate-fade-up-delay-2 mt-5 max-w-xl text-base leading-relaxed md:text-lg" style={{ color: "var(--text-muted)" }}>
          Bangru Haryanvi dialogue, continuity-safe breakdowns, and a visual pack
          that only generates after you approve.
        </p>

        <section className="panel-shell animate-fade-up-delay-2 mt-12 p-5 md:p-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="section-title">New adaptation</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--text-faint)" }}>
                Pick a sample, paste text, or upload a file.
              </p>
            </div>
          </div>
          <UploadForm />
        </section>

        {jobs.length ? (
          <section className="mt-12">
            <h2 className="section-title">Recent jobs</h2>
            <ul className="panel-shell mt-4 divide-y" style={{ borderColor: "var(--border-subtle)" }}>
              {jobs.slice(0, 8).map((job) => (
                <li
                  key={job.id}
                  className="flex items-center justify-between gap-4 px-4 py-3.5 text-sm"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{job.primaryCulture.label}</p>
                    <p className="truncate" style={{ color: "var(--text-faint)" }}>
                      {job.sourceFilename || "pasted"} · {job.status}
                    </p>
                  </div>
                  <Link className="shrink-0 link-accent" href={`/jobs/${job.id}/extract`}>
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}
