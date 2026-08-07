"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Job } from "@/lib/schema";

export function ApproveClient({ jobId, job }: { jobId: string; job: Job }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const extraction = job.extraction!;
  const errors = extraction.issues.filter((i) => i.severity === "error");

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approval failed");
      router.push(`/jobs/${jobId}/gallery`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded border border-slate-300 bg-[#f4f7f9] p-4">
        <h2 className="font-semibold">Adaptation plan ({job.primaryCulture.label})</h2>
        <p className="mt-2 text-sm text-slate-700">
          {extraction.adaptationPlan?.culture.adaptationNotes}
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          {extraction.adaptationPlan?.culture.verbal.slice(0, 4).map((v) => (
            <li key={v}>{v}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm">
          <span className="font-medium">Setting remap:</span>{" "}
          {extraction.adaptationPlan?.settingRemap}
        </p>
      </section>

      <section className="rounded border border-slate-300 bg-[#f4f7f9] p-4">
        <h2 className="font-semibold">Costume bible (unique variants)</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {extraction.costumes.map((c) => (
            <li key={c.canonicalId} className="border-b border-slate-200 pb-2">
              <span className="font-medium">{c.label}</span> · {c.canonicalId}
              <br />
              {c.garments.join(", ")} · scenes {c.sceneNumbers.join(", ")}
              {c.changeReason ? ` · change: ${c.changeReason}` : ""}
            </li>
          ))}
        </ul>
      </section>

      {errors.length ? (
        <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {errors.length} continuity error(s) block generation. Fix extraction first.
        </p>
      ) : null}
      {error ? (
        <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={busy || errors.length > 0 || job.status === "ready"}
        onClick={approve}
        className="rounded bg-[#1f5c4d] px-4 py-2 text-sm text-[#f4f7f9] disabled:opacity-50"
      >
        {busy
          ? "Adapting + generating visuals (free API, may take a while)…"
          : job.status === "ready"
            ? "Already generated"
            : "Approve & generate"}
      </button>
    </div>
  );
}
