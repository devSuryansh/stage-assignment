import Link from "next/link";

const STEPS = [
  { slug: "extract", label: "Extract" },
  { slug: "approve", label: "Approve" },
  { slug: "compare", label: "Compare" },
  { slug: "gallery", label: "Gallery" },
  { slug: "export", label: "Export" },
] as const;

export function JobNav({
  jobId,
  current,
  status,
}: {
  jobId: string;
  current: (typeof STEPS)[number]["slug"];
  status?: string;
}) {
  return (
    <header className="border-b border-slate-300 bg-[#f4f7f9]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            ← Studio
          </Link>
          <p className="font-[family-name:var(--font-display)] text-xl text-slate-900">
            Job {jobId.slice(0, 8)}
          </p>
          {status ? (
            <p className="text-xs uppercase tracking-wide text-slate-500">{status}</p>
          ) : null}
        </div>
        <nav className="flex flex-wrap gap-1">
          {STEPS.map((step) => {
            const active = step.slug === current;
            return (
              <Link
                key={step.slug}
                href={`/jobs/${jobId}/${step.slug}`}
                className={`rounded px-3 py-1.5 text-sm ${
                  active
                    ? "bg-[#1f5c4d] text-[#f4f7f9]"
                    : "text-slate-700 hover:bg-slate-200"
                }`}
              >
                {step.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
