"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { Job } from "@/lib/schema";

async function fetchJob(jobId: string): Promise<Job> {
  const res = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load job");
  return data as Job;
}

export function ApproveClient({ jobId, job }: { jobId: string; job: Job }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const extraction = job.extraction!;
  const errors = extraction.issues.filter((i) => i.severity === "error");

  const statusQuery = useQuery({
    queryKey: ["job-status", jobId],
    queryFn: () => fetchJob(jobId),
    enabled: polling,
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      if (!status) return 2000;
      if (status === "ready" || status === "failed" || status === "awaiting_approval") {
        return false;
      }
      return 2000;
    },
  });

  useEffect(() => {
    const status = statusQuery.data?.status;
    if (status === "ready") {
      setPolling(false);
      setBusy(false);
      router.push(`/jobs/${jobId}/gallery`);
      router.refresh();
    } else if (status === "failed") {
      setPolling(false);
      setBusy(false);
      setError(statusQuery.data?.error || "Generation failed");
    }
  }, [statusQuery.data, jobId, router]);

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraction, approved: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approval failed");
      if (data.status === "ready") {
        router.push(`/jobs/${jobId}/gallery`);
        router.refresh();
        return;
      }
      setPolling(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  const liveStatus = statusQuery.data?.status || job.status;
  const panel = {
    background: "var(--surface-panel)",
    border: "1px solid var(--border-subtle)",
  } as const;

  return (
    <div className="space-y-6">
      <section className="rounded p-4" style={panel}>
        <h2 className="font-semibold" style={{ fontFamily: "var(--font-display), sans-serif" }}>
          Adaptation plan ({job.primaryCulture.label})
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          {extraction.adaptationPlan?.culture.adaptationNotes}
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm" style={{ color: "var(--text-muted)" }}>
          {extraction.adaptationPlan?.culture.verbal.slice(0, 4).map((v) => (
            <li key={v}>{v}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm">
          <span className="font-medium">Setting remap:</span>{" "}
          {extraction.adaptationPlan?.settingRemap}
        </p>
      </section>

      <section className="rounded p-4" style={panel}>
        <h2 className="font-semibold" style={{ fontFamily: "var(--font-display), sans-serif" }}>
          Costume bible (unique variants)
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          {extraction.costumes.map((c) => (
            <li
              key={c.canonicalId}
              className="pb-2"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <span className="font-medium">{c.label}</span> · {c.canonicalId}
              <br />
              <span style={{ color: "var(--text-muted)" }}>
                {c.garments.join(", ")} · scenes {c.sceneNumbers.join(", ")}
                {c.changeReason ? ` · change: ${c.changeReason}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {errors.length ? (
        <p
          className="rounded px-3 py-2 text-sm"
          style={{ border: "1px solid var(--danger)", color: "var(--danger)" }}
        >
          {errors.length} continuity error(s) block generation. Fix extraction first.
        </p>
      ) : null}
      {error ? (
        <p className="error-banner" role="alert">
          {error}
        </p>
      ) : null}

      {(busy || polling) && (
        <p className="animate-pulse-soft text-sm" style={{ color: "var(--accent-strong)" }}>
          Status: {liveStatus} — adapting dialogue and generating reference-conditioned visuals…
        </p>
      )}

      <button
        type="button"
        disabled={busy || polling || errors.length > 0 || job.status === "ready"}
        onClick={approve}
        className="btn-primary disabled:opacity-50"
      >
        {busy || polling
          ? "Generating…"
          : job.status === "ready"
            ? "Already generated"
            : "Approve & generate"}
      </button>
    </div>
  );
}
