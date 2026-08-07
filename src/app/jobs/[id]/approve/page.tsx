import { JobNav } from "@/components/JobNav";
import { ApproveClient } from "@/components/ApproveClient";
import { loadJob } from "@/lib/store";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ApprovePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await loadJob(id);
  if (!job?.extraction) notFound();

  return (
    <div>
      <JobNav jobId={id} current="approve" status={job.status} />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <div>
          <h1
            className="text-3xl"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            Approve extraction & costume plan
          </h1>
          <p className="mt-1" style={{ color: "var(--text-muted)" }}>
            Visual generation stays locked until you approve. Continuity errors must be
            cleared first.
          </p>
        </div>
        <ApproveClient jobId={id} job={job} />
      </main>
    </div>
  );
}
