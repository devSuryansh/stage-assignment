"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UploadForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [setting, setSetting] = useState("rural");
  const [bonus, setBonus] = useState(false);
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
              ...(bonus
                ? [
                    {
                      dialect: "Malwai",
                      region: "Malwa, Punjab",
                      setting: "rural",
                      label: "Malwai Punjabi (Malwa, rural)",
                    },
                  ]
                : []),
            ],
          }),
        });
      } else {
        const form = new FormData();
        form.set("text", text);
        form.set("dialect", "Bangru");
        form.set("region", "Haryana");
        form.set("setting", setting);
        form.set("bonusCulture", String(bonus));
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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Culture / dialect</span>
          <div className="rounded border border-slate-300 bg-white px-3 py-2 text-slate-900">
            Bangru Haryanvi · Haryana
          </div>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Setting</span>
          <select
            className="w-full rounded border border-slate-300 bg-white px-3 py-2"
            value={setting}
            onChange={(e) => setSetting(e.target.value)}
          >
            <option value="rural">Rural</option>
            <option value="semi-urban">Semi-urban</option>
            <option value="urban">Urban</option>
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={bonus}
          onChange={(e) => setBonus(e.target.checked)}
        />
        Also queue a second independent culture (Malwai) for bonus run metadata
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Paste screenplay</span>
        <textarea
          className="min-h-48 w-full rounded border border-slate-300 bg-white p-3 font-mono text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste TXT screenplay here..."
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Or upload TXT / DOCX / PDF</span>
        <input
          type="file"
          accept=".txt,.md,.docx,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </label>

      {error ? (
        <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => submit(false)}
          className="rounded bg-[#1f5c4d] px-4 py-2 text-sm text-[#f4f7f9] disabled:opacity-50"
        >
          {busy ? "Extracting…" : "Upload & extract"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit(true)}
          className="rounded border border-slate-400 bg-white px-4 py-2 text-sm text-slate-800 disabled:opacity-50"
        >
          Use 5-scene jail fixture (Bangru)
        </button>
      </div>
    </div>
  );
}
