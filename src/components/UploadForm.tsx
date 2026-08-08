"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FIXTURES, type FixtureMeta } from "@/lib/fixtures";
import { readJsonResponse } from "@/lib/api";

type JobCreateResponse = {
  id?: string;
  status?: string;
  error?: string;
};

async function waitForExtraction(jobId: string) {
  const started = Date.now();
  while (Date.now() - started < 180_000) {
    const res = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
    const job = await readJsonResponse<{ status?: string; error?: string }>(res);
    if (!res.ok) throw new Error(job.error || "Failed to poll job status");
    if (job.status === "awaiting_approval" || job.status === "ready") return;
    if (job.status === "failed") {
      throw new Error(job.error || "Extraction failed");
    }
    // uploaded / extracting are in-progress
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("Extraction timed out. Open the job from Recent jobs and retry.");
}

export function UploadForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [setting, setSetting] = useState("rural");
  const [selectedFixture, setSelectedFixture] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  async function submit(fixtureId?: string) {
    setBusy(true);
    setError(null);
    setStatusNote("Creating job…");
    try {
      let res: Response;
      const cultures = [
        {
          dialect: "Bangru",
          region: "Haryana",
          setting,
          label: `Bangru Haryanvi (Haryana, ${setting})`,
        },
      ];

      if (fixtureId) {
        res = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            useFixture: true,
            fixtureId,
            cultures,
          }),
        });
      } else {
        const form = new FormData();
        form.set("text", text);
        form.set("dialect", "Bangru");
        form.set("region", "Haryana");
        form.set("setting", setting);
        if (file) form.set("file", file);
        res = await fetch("/api/jobs", { method: "POST", body: form });
      }
      const data = await readJsonResponse<JobCreateResponse>(res);
      if (!res.ok) throw new Error(data.error || "Upload failed");
      if (!data.id) throw new Error("Server did not return a job id");

      if (data.status === "extracting") {
        setStatusNote("Extracting scenes and continuity…");
        await waitForExtraction(data.id);
      }

      router.push(`/jobs/${data.id}/extract`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      setStatusNote(null);
    }
  }

  function pickFixture(f: FixtureMeta) {
    setSelectedFixture(f.id);
    setFile(null);
  }

  function onFile(next: File | null) {
    setFile(next);
    setSelectedFixture(null);
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="field-label">Culture / dialect</span>
          <div className="field-box">Bangru Haryanvi · Haryana</div>
        </label>
        <label className="block space-y-2">
          <span className="field-label">Setting</span>
          <select
            className="field-box w-full appearance-none"
            value={setting}
            onChange={(e) => setSetting(e.target.value)}
          >
            <option value="rural">Rural</option>
            <option value="semi-urban">Semi-urban</option>
            <option value="urban">Urban</option>
          </select>
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <span className="field-label">Start from a sample</span>
          <span className="text-xs" style={{ color: "var(--text-faint)" }}>
            {FIXTURES.length} bundled screenplays
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {FIXTURES.map((f) => {
            const active = selectedFixture === f.id;
            return (
              <button
                key={f.id}
                type="button"
                disabled={busy}
                onClick={() => pickFixture(f)}
                className="sample-tile text-left disabled:opacity-50"
                data-active={active ? "true" : "false"}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                    {f.title}
                  </p>
                  <span className="sample-chip">{f.scenes} sc</span>
                </div>
                <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                  {f.blurb}
                </p>
                <p className="mt-3 flex flex-wrap gap-1.5">
                  {f.tags.map((tag) => (
                    <span key={tag} className="sample-tag">
                      {tag}
                    </span>
                  ))}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <label className="block space-y-2">
        <span className="field-label">Or paste your screenplay</span>
        <textarea
          className="field-box min-h-44 w-full font-mono text-sm leading-relaxed"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value.trim()) setSelectedFixture(null);
          }}
          placeholder="INT. SOMEWHERE - DAY&#10;&#10;Action lines…&#10;&#10;                    CHARACTER&#10;          Dialogue…"
        />
      </label>

      <div className="space-y-2">
        <span className="field-label">Or drop a file</span>
        <label
          className="file-drop"
          data-active={dragOver ? "true" : "false"}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) onFile(dropped);
          }}
        >
          <input
            type="file"
            accept=".txt,.md,.docx,.pdf"
            className="sr-only"
            onChange={(e) => onFile(e.target.files?.[0] || null)}
          />
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {file ? file.name : "TXT, DOCX, or PDF"}
          </span>
          <span className="mt-1 block text-xs" style={{ color: "var(--text-faint)" }}>
            {file ? "Click to replace" : "Click to browse or drag a file here"}
          </span>
        </label>
      </div>

      {error ? (
        <p className="error-banner" role="alert">
          {error}
        </p>
      ) : null}
      {statusNote ? (
        <p className="animate-pulse-soft text-sm" style={{ color: "var(--accent-strong)" }}>
          {statusNote}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          disabled={busy || (!selectedFixture && !text.trim() && !file)}
          onClick={() => submit(selectedFixture || undefined)}
          className="btn-primary disabled:opacity-50"
        >
          {busy
            ? statusNote || "Working…"
            : selectedFixture
              ? "Run selected sample"
              : "Upload & extract"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit("jail-5scenes")}
          className="btn-ghost disabled:opacity-50"
        >
          Quick start: jail fixture
        </button>
      </div>
    </div>
  );
}
