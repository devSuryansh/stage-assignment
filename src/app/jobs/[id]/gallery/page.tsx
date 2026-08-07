import { JobNav } from "@/components/JobNav";
import { loadJob } from "@/lib/store";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function Asset({
  jobId,
  rel,
  alt,
}: {
  jobId: string;
  rel?: string;
  alt: string;
}) {
  if (!rel) {
    return (
      <div
        className="flex aspect-square items-center justify-center text-xs"
        style={{
          border: "1px dashed var(--border-subtle)",
          background: "var(--surface-raised)",
          color: "var(--text-faint)",
        }}
      >
        Pending
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/jobs/${jobId}/assets/${rel}`}
      alt={alt}
      className="aspect-square w-full object-cover"
      style={{ border: "1px solid var(--border-subtle)" }}
    />
  );
}

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await loadJob(id);
  if (!job?.extraction) notFound();
  const { extraction, visualPack } = job;

  return (
    <div>
      <JobNav jobId={id} current="gallery" status={job.status} />
      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8">
        <div>
          <h1
            className="text-3xl"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            Visual gallery
          </h1>
          <p className="mt-1" style={{ color: "var(--text-muted)" }}>
            Character bible first, then costumes and scene keyframes conditioned on that
            reference image.
          </p>
        </div>

        <section>
          <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-display), sans-serif" }}>
            Characters
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {extraction.characters
              .filter((c) => c.important)
              .map((c) => (
                <figure key={c.canonicalId} className="space-y-2">
                  <Asset
                    jobId={id}
                    rel={c.imagePath || visualPack?.characterImages[c.canonicalId]}
                    alt={c.names[0]}
                  />
                  <figcaption className="text-sm">
                    <span className="font-medium">{c.names[0]}</span>
                    <br />
                    <span style={{ color: "var(--text-faint)" }}>{c.role}</span>
                  </figcaption>
                </figure>
              ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-display), sans-serif" }}>
            Costumes
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {extraction.costumes.map((c) => (
              <figure key={c.canonicalId} className="space-y-2">
                <Asset
                  jobId={id}
                  rel={c.imagePath || visualPack?.costumeImages[c.canonicalId]}
                  alt={c.label}
                />
                <figcaption className="text-sm">
                  <span className="font-medium">{c.label}</span>
                  <br />
                  <span style={{ color: "var(--text-faint)" }}>
                    scenes {c.sceneNumbers.join(", ")}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-display), sans-serif" }}>
            Scenes
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {extraction.scenes.map((s) => (
              <figure key={s.number} className="space-y-2">
                <Asset
                  jobId={id}
                  rel={s.imagePath || visualPack?.sceneImages[String(s.number)]}
                  alt={s.slugline}
                />
                <figcaption className="text-sm">
                  <span className="font-medium">Scene {s.number}</span>
                  <br />
                  <span style={{ color: "var(--text-faint)" }}>{s.slugline}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
