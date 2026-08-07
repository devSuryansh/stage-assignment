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
      <div className="flex aspect-square items-center justify-center rounded border border-dashed border-slate-400 bg-slate-100 text-xs text-slate-500">
        Pending
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/jobs/${jobId}/assets/${rel}`}
      alt={alt}
      className="aspect-square w-full rounded border border-slate-300 object-cover"
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
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Visual gallery
          </h1>
          <p className="mt-1 text-slate-600">
            Character bible, unique costumes, and one keyframe per scene.
          </p>
        </div>

        <section>
          <h2 className="text-xl font-semibold">Characters</h2>
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
                    <span className="text-slate-500">{c.role}</span>
                  </figcaption>
                </figure>
              ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Costumes</h2>
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
                  <span className="text-slate-500">
                    scenes {c.sceneNumbers.join(", ")}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Scenes</h2>
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
                  <span className="text-slate-500">{s.slugline}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
