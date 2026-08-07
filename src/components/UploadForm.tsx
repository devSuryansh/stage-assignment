"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UploadForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [setting, setSetting] = useState("rural");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(useFixture = false) {
    setBusy(true);
    setError(null);
    try {
      let res: Response;
      if (useFixture) {
        res = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            useFixture: true,
            cultures: [
              {
                dialect: "Bangru",
                region: "Haryana",
                setting,
                label: `Bangru Haryanvi (Haryana, ${setting})`,
              },
            ],
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      router.push(`/jobs/${data.id}/extract`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const fieldStyle = {
    background: "var(--surface-raised)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-primary)",
  } as const;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            Culture / dialect
          </span>
          <div className="rounded px-3 py-2" style={fieldStyle}>
            Bangru Haryanvi · Haryana
          </div>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            Setting
          </span>
          <select
            className="w-full rounded px-3 py-2"
            style={fieldStyle}
            value={setting}
            onChange={(e) => setSetting(e.target.value)}
          >
            <option value="rural">Rural</option>
            <option value="semi-urban">Semi-urban</option>
            <option value="urban">Urban</option>
          </select>
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
          Paste screenplay
        </span>
        <textarea
          className="min-h-48 w-full rounded p-3 font-mono text-sm"
          style={fieldStyle}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste TXT screenplay here..."
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
          Or upload TXT / DOCX / PDF
        </span>
        <input
          type="file"
          accept=".txt,.md,.docx,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </label>

      {error ? (
        <p
          className="rounded px-3 py-2 text-sm"
          style={{
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            background: "rgba(248,113,113,0.08)",
          }}
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => submit(false)}
          className="rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#1a1208" }}
        >
          {busy ? "Extracting…" : "Upload & extract"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit(true)}
          className="rounded px-4 py-2 text-sm disabled:opacity-50"
          style={fieldStyle}
        >
          Use 5-scene jail fixture (Bangru)
        </button>
      </div>
    </div>
  );
}
