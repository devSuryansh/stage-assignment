import { UploadForm } from "@/components/UploadForm";
import { listJobs } from "@/lib/store";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const jobs = await listJobs();

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <p
        className="animate-fade-up text-xs uppercase tracking-[0.22em]"
        style={{ color: "var(--text-faint)" }}
      >
        STAGE · AI-native production pack
      </p>
      <h1
        className="animate-fade-up-delay mt-3 text-4xl leading-tight md:text-5xl"
        style={{
          fontFamily: "var(--font-display), sans-serif",
          color: "var(--text-primary)",
        }}
      >
        Cultural Adaptation Studio
      </h1>
      <p className="mt-4 max-w-2xl" style={{ color: "var(--text-muted)" }}>
        Adapt a screenplay into Bangru Haryanvi, lock continuity, then generate a
        character / costume / scene visual pack — only after you approve.
      </p>

      <section
        className="mt-10 p-6"
        style={{
          background: "var(--surface-panel)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <h2
          className="text-lg font-semibold"
          style={{ fontFamily: "var(--font-display), sans-serif" }}
        >
          Upload & select culture
        </h2>
        <div className="mt-4">
          <UploadForm />
        </div>
      </section>

      {jobs.length ? (
        <section className="mt-10">
          <h2
            className="text-lg font-semibold"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            Recent jobs
          </h2>
          <ul
            className="mt-3 divide-y"
            style={{
              background: "var(--surface-panel)",
              border: "1px solid var(--border-subtle)",
              borderColor: "var(--border-subtle)",
            }}
          >
            {jobs.slice(0, 8).map((job) => (
              <li
                key={job.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <div>
                  <p className="font-medium">{job.primaryCulture.label}</p>
                  <p style={{ color: "var(--text-faint)" }}>
                    {job.sourceFilename || "pasted"} · {job.status}
                  </p>
                </div>
                <Link
                  className="underline"
                  style={{ color: "var(--accent-strong)" }}
                  href={`/jobs/${job.id}/extract`}
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
