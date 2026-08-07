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
    <header
      style={{
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--surface-raised)",
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <Link
            href="/"
            className="text-sm font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            ← Studio
          </Link>
          <p
            className="text-xl"
            style={{
              fontFamily: "var(--font-display), sans-serif",
              color: "var(--text-primary)",
            }}
          >
            Job {jobId.slice(0, 8)}
          </p>
          {status ? (
            <p
              className="text-xs uppercase tracking-wide"
              style={{ color: "var(--text-faint)" }}
            >
              {status}
            </p>
          ) : null}
        </div>
        <nav className="flex flex-wrap gap-1">
          {STEPS.map((step) => {
            const active = step.slug === current;
            return (
              <Link
                key={step.slug}
                href={`/jobs/${jobId}/${step.slug}`}
                className="rounded px-3 py-1.5 text-sm"
                style={
                  active
                    ? { background: "var(--accent)", color: "#1a1208" }
                    : { color: "var(--text-muted)" }
                }
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
