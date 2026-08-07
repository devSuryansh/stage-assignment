import { promises as fs } from "fs";
import path from "path";
import { appendUsage } from "./usage";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function pollinationsKey(): string | undefined {
  return (
    process.env.POLLINATIONS_API_KEY ||
    process.env.POLLINATIONS_KEY ||
    undefined
  );
}

async function writeImageBuffer(outPath: string, buf: Buffer) {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, buf);
}

/**
 * Keyed Pollinations nanobanana generation.
 * When referenceImagePath is set, uses /v1/images/edits so the local PNG
 * conditions face/identity without needing a public URL.
 */
async function generateWithNanobanana(opts: {
  prompt: string;
  outPath: string;
  referenceImagePath?: string;
  width?: number;
  height?: number;
  seed?: number;
}): Promise<string> {
  const key = pollinationsKey();
  if (!key) throw new Error("POLLINATIONS_API_KEY missing");

  const width = opts.width ?? 1024;
  const height = opts.height ?? 1024;
  const model = process.env.POLLINATIONS_IMAGE_MODEL || "nanobanana";

  if (opts.referenceImagePath) {
    const form = new FormData();
    const bytes = await fs.readFile(opts.referenceImagePath);
    form.append(
      "image",
      new Blob([new Uint8Array(bytes)], { type: "image/png" }),
      path.basename(opts.referenceImagePath),
    );
    form.append("prompt", opts.prompt.slice(0, 3500));
    form.append("model", model);
    form.append("size", `${width}x${height}`);
    form.append("response_format", "b64_json");
    if (opts.seed != null) form.append("seed", String(opts.seed));

    const res = await fetch("https://gen.pollinations.ai/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const err = new Error(
        `nanobanana edits failed: ${res.status} ${body.slice(0, 300)}`,
      );
      if (res.status === 402 || /insufficient balance|PAYMENT_REQUIRED/i.test(body)) {
        (err as Error & { code?: string }).code = "POLLINATIONS_NO_POLLEN";
      }
      throw err;
    }
    const json = (await res.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
    };
    const b64 = json.data?.[0]?.b64_json;
    if (b64) {
      await writeImageBuffer(opts.outPath, Buffer.from(b64, "base64"));
      return model;
    }
    const url = json.data?.[0]?.url;
    if (url) {
      const img = await fetch(url, {
        headers: { Authorization: `Bearer ${key}`, "User-Agent": BROWSER_UA },
      });
      if (!img.ok) throw new Error(`nanobanana download failed: ${img.status}`);
      await writeImageBuffer(opts.outPath, Buffer.from(await img.arrayBuffer()));
      return model;
    }
    // Some responses return raw image bytes despite Accept negotiation.
    const ctype = res.headers.get("content-type") || "";
    if (ctype.startsWith("image/")) {
      await writeImageBuffer(opts.outPath, Buffer.from(await res.arrayBuffer()));
      return model;
    }
    throw new Error("nanobanana edits returned no image data");
  }

  const encoded = encodeURIComponent(opts.prompt.slice(0, 1800));
  const params = new URLSearchParams({
    model,
    width: String(width),
    height: String(height),
    nologo: "true",
  });
  if (opts.seed != null) params.set("seed", String(opts.seed));

  const res = await fetch(
    `https://gen.pollinations.ai/image/${encoded}?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${key}`,
        "User-Agent": BROWSER_UA,
        Accept: "image/*",
      },
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(
      `nanobanana generate failed: ${res.status} ${body.slice(0, 300)}`,
    );
    if (res.status === 402 || /insufficient balance|PAYMENT_REQUIRED/i.test(body)) {
      (err as Error & { code?: string }).code = "POLLINATIONS_NO_POLLEN";
    }
    throw err;
  }
  const ctype = res.headers.get("content-type") || "";
  if (ctype.includes("application/json")) {
    const json = (await res.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
    };
    const b64 = json.data?.[0]?.b64_json;
    if (b64) {
      await writeImageBuffer(opts.outPath, Buffer.from(b64, "base64"));
      return model;
    }
    throw new Error("nanobanana JSON response missing image");
  }
  await writeImageBuffer(opts.outPath, Buffer.from(await res.arrayBuffer()));
  return model;
}

/** Keyless flux fallback. Cloudflare returns 1010 without a browser User-Agent. */
async function generateWithFluxFallback(opts: {
  prompt: string;
  outPath: string;
  width?: number;
  height?: number;
  seed?: number;
}): Promise<string> {
  const width = opts.width ?? 1024;
  const height = opts.height ?? 1024;
  const seed = opts.seed ?? Math.floor(Math.random() * 1_000_000);
  const encoded = encodeURIComponent(opts.prompt.slice(0, 1800));
  const url = `https://image.pollinations.ai/prompt/${encoded}?model=flux&width=${width}&height=${height}&nologo=true&seed=${seed}`;
  const res = await fetch(url, {
    headers: { "User-Agent": BROWSER_UA, Accept: "image/*" },
  });
  if (!res.ok) {
    throw new Error(`flux fallback failed: ${res.status}`);
  }
  await writeImageBuffer(opts.outPath, Buffer.from(await res.arrayBuffer()));
  return "flux";
}

export async function generateImageFile(opts: {
  purpose: string;
  usageLogPath: string;
  prompt: string;
  outPath: string;
  referenceImagePath?: string;
  width?: number;
  height?: number;
  seed?: number;
}): Promise<string> {
  const started = Date.now();
  let lastError: unknown;
  let modelUsed = "none";

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (pollinationsKey()) {
        try {
          modelUsed = await generateWithNanobanana(opts);
          await appendUsage(opts.usageLogPath, {
            purpose: opts.purpose,
            model: modelUsed,
            latencyMs: Date.now() - started,
            ok: true,
          });
          // Serialize calls; free tiers throttle around ~10 RPM.
          await sleep(2500);
          return opts.outPath;
        } catch (err) {
          lastError = err;
          const noPollen =
            typeof err === "object" &&
            err &&
            "code" in err &&
            (err as { code?: string }).code === "POLLINATIONS_NO_POLLEN";
          // Zero pollen: skip further keyed retries and go straight to keyless flux.
          if (noPollen) {
            modelUsed = await generateWithFluxFallback(opts);
            await appendUsage(opts.usageLogPath, {
              purpose: opts.purpose,
              model: "pollinations-flux-fallback",
              latencyMs: Date.now() - started,
              ok: true,
              error: err instanceof Error ? err.message : String(err),
            });
            await sleep(1500);
            return opts.outPath;
          }
          // Reference edits may fail for other reasons — retry text-only once.
          if (opts.referenceImagePath && attempt === 0) {
            modelUsed = await generateWithNanobanana({
              ...opts,
              referenceImagePath: undefined,
              prompt: `${opts.prompt}. Match the same character identity described in the prompt exactly.`,
            });
            await appendUsage(opts.usageLogPath, {
              purpose: opts.purpose,
              model: `${modelUsed}:no_ref_retry`,
              latencyMs: Date.now() - started,
              ok: true,
              error: err instanceof Error ? err.message : String(err),
            });
            await sleep(2500);
            return opts.outPath;
          }
        }
      }

      modelUsed = await generateWithFluxFallback(opts);
      await appendUsage(opts.usageLogPath, {
        purpose: opts.purpose,
        model: "pollinations-flux-fallback",
        latencyMs: Date.now() - started,
        ok: true,
        error:
          lastError instanceof Error
            ? `primary_failed:${lastError.message}`
            : undefined,
      });
      await sleep(1500);
      return opts.outPath;
    } catch (err) {
      lastError = err;
      await sleep(1500 * (attempt + 1));
    }
  }

  await appendUsage(opts.usageLogPath, {
    purpose: opts.purpose,
    model: modelUsed,
    latencyMs: Date.now() - started,
    ok: false,
    error: lastError instanceof Error ? lastError.message : String(lastError),
  });
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
