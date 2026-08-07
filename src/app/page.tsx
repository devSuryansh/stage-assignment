import { UploadForm } from "@/components/UploadForm";
import { listJobs } from "@/lib/store";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const jobs = await listJobs();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
        48-hour AI engineering challenge
      </p>
      <h1
        className="mt-2 text-4xl leading-tight text-slate-950 md:text-5xl"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        Cultural Adaptation Studio
      </h1>
      <p className="mt-3 max-w-2xl text-slate-700">
        Re-create a screenplay inside Bangru Haryanvi, keep continuity strict, and
        build a character / costume / scene visual pack after you approve the plan.
      </p>

      <section className="mt-10 rounded-lg border border-slate-300 bg-[#f4f7f9] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">1. Upload & select culture</h2>
        <div className="mt-4">
          <UploadForm />
        </div>
      </section>

      {jobs.length ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Recent jobs</h2>
          <ul className="mt-3 divide-y divide-stone-300 rounded border border-slate-300 bg-[#f4f7f9]">
            {jobs.slice(0, 8).map((job) => (
              <li key={job.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{job.primaryCulture.label}</p>
                  <p className="text-slate-500">
                    {job.sourceFilename || "pasted"} · {job.status}
                  </p>
                </div>
                <Link
                  className="text-slate-900 underline"
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
