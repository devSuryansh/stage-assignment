import { JobNav } from "@/components/JobNav";
import { loadJob } from "@/lib/store";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ExtractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await loadJob(id);
  if (!job) notFound();
  const extraction = job.extraction;
  const panel = {
    background: "var(--surface-panel)",
    border: "1px solid var(--border-subtle)",
  } as const;

  return (
    <div>
      <JobNav jobId={id} current="extract" status={job.status} />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <div>
          <h1
            className="text-3xl"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            Scene-by-scene extraction
          </h1>
          <p className="mt-1" style={{ color: "var(--text-muted)" }}>
            {job.primaryCulture.label} · {extraction?.scenes.length || 0} scenes ·{" "}
            {extraction?.characters.length || 0} characters
          </p>
        </div>

        {extraction?.issues?.length ? (
          <section
            className="rounded p-4"
            style={{
              border: "1px solid var(--warn)",
              background: "rgba(251,191,36,0.08)",
            }}
          >
            <h2 className="font-semibold" style={{ color: "var(--warn)" }}>
              Continuity issues
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm" style={{ color: "var(--text-muted)" }}>
              {extraction.issues.map((issue) => (
                <li key={issue.id}>
                  <span className="uppercase">[{issue.severity}]</span> {issue.message}
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No continuity issues flagged.
          </p>
        )}

        <section className="overflow-x-auto rounded" style={panel}>
          <table className="min-w-full text-left text-sm">
            <thead style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <tr style={{ color: "var(--text-faint)" }}>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Slugline</th>
                <th className="px-3 py-2">Mood</th>
                <th className="px-3 py-2">Purpose</th>
                <th className="px-3 py-2">Characters</th>
                <th className="px-3 py-2">Props</th>
              </tr>
            </thead>
            <tbody>
              {extraction?.scenes.map((scene) => (
                <tr
                  key={scene.number}
                  className="align-top"
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                >
                  <td className="px-3 py-2">{scene.number}</td>
                  <td className="px-3 py-2 font-medium">{scene.slugline}</td>
                  <td className="px-3 py-2">{scene.mood}</td>
                  <td className="px-3 py-2">{scene.dramaticPurpose}</td>
                  <td className="px-3 py-2">
                    {scene.characterIds
                      .map(
                        (cid) =>
                          extraction.characters.find((c) => c.canonicalId === cid)
                            ?.names[0] || cid,
                      )
                      .join(", ")}
                  </td>
                  <td className="px-3 py-2">{scene.production.props.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-display), sans-serif" }}>
            Canonical characters
          </h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {extraction?.characters.map((c) => (
              <article key={c.canonicalId} className="rounded p-4 text-sm" style={panel}>
                <h3 className="font-semibold">
                  {c.names[0]}{" "}
                  <span className="font-normal" style={{ color: "var(--text-faint)" }}>
                    ({c.canonicalId})
                  </span>
                </h3>
                <p className="mt-1" style={{ color: "var(--text-muted)" }}>
                  {c.role}
                </p>
                <p className="mt-2">{c.physicalDescription}</p>
                {c.aliases.length ? (
                  <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
                    aliases: {c.aliases.join(", ")}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <Link
          href={`/jobs/${id}/approve`}
          className="inline-block rounded px-4 py-2 text-sm font-medium"
          style={{ background: "var(--accent)", color: "#1a1208" }}
        >
          Continue to approval →
        </Link>
      </main>
    </div>
  );
}
