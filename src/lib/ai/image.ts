import { promises as fs } from "fs";
import path from "path";
import { InferenceClient } from "@huggingface/inference";
import { appendUsage } from "./usage";

/**
 * Free-first images:
 * 1) Pollinations keyless flux (no paid credits; browser UA required)
 * 2) Optional HF text-to-image / image-to-image when HF_TOKEN still has credits
 *
 * Reference conditioning prefers HF Kontext when available; otherwise the
 * character identity is locked via prompt + fixed seed.
 */

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function hfToken(): string | undefined {
  return (
    process.env.HF_TOKEN ||
    process.env.HUGGINGFACE_API_KEY ||
    process.env.HUGGING_FACE_HUB_TOKEN ||
    undefined
  );
}

function preferHfImages(): boolean {
  const forced = (process.env.IMAGE_PROVIDER || "").toLowerCase();
  if (forced === "huggingface" || forced === "hf") return true;
  if (forced === "pollinations") return false;
  return process.env.HF_IMAGES === "1" || process.env.HF_IMAGES === "true";
}

export function textToImageModel() {
  return process.env.HF_IMAGE_MODEL || "black-forest-labs/FLUX.1-schnell";
}

export function imageEditModel() {
  return (
    process.env.HF_IMAGE_EDIT_MODEL || "black-forest-labs/FLUX.1-Kontext-dev"
  );
}

async function writeImageBuffer(outPath: string, buf: Buffer) {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, buf);
}

async function writeImageBlob(outPath: string, blob: Blob) {
  await writeImageBuffer(outPath, Buffer.from(await blob.arrayBuffer()));
}

/** Free Pollinations flux — Cloudflare 1010 without a browser User-Agent. */
async function generateWithPollinationsFlux(opts: {
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
    throw new Error(`pollinations flux failed: ${res.status}`);
  }
  await writeImageBuffer(opts.outPath, Buffer.from(await res.arrayBuffer()));
  return "pollinations-flux";
}

async function generateHfTextToImage(opts: {
  prompt: string;
  outPath: string;
  width?: number;
  height?: number;
  seed?: number;
}): Promise<string> {
  const token = hfToken();
  if (!token) throw new Error("HF_TOKEN missing");
  const model = textToImageModel();
  const client = new InferenceClient(token);
  const result = await client.textToImage({
    model,
    inputs: opts.prompt.slice(0, 3500),
    parameters: {
      width: opts.width ?? 1024,
      height: opts.height ?? 1024,
      ...(opts.seed != null ? { seed: opts.seed } : {}),
    },
  });
  if (typeof result === "string") {
    const res = await fetch(result);
    if (!res.ok) throw new Error(`HF image download failed: ${res.status}`);
    await writeImageBlob(opts.outPath, await res.blob());
  } else {
    await writeImageBlob(opts.outPath, result as Blob);
  }
  return model;
}

async function generateHfWithReference(opts: {
  prompt: string;
  outPath: string;
  referenceImagePath: string;
}): Promise<string> {
  const token = hfToken();
  if (!token) throw new Error("HF_TOKEN missing");
  const model = imageEditModel();
  const client = new InferenceClient(token);
  const bytes = await fs.readFile(opts.referenceImagePath);
  const blob = new Blob([new Uint8Array(bytes)], { type: "image/png" });
  const result = await client.imageToImage({
    model,
    inputs: blob,
    parameters: { prompt: opts.prompt.slice(0, 3500) },
  });
  if (typeof result === "string") {
    const res = await fetch(result);
    if (!res.ok) throw new Error(`HF edit download failed: ${res.status}`);
    await writeImageBlob(opts.outPath, await res.blob());
  } else {
    await writeImageBlob(opts.outPath, result as Blob);
  }
  return model;
}

function stableSeed(prompt: string, referenceImagePath?: string): number {
  const base = `${referenceImagePath || ""}::${prompt.slice(0, 200)}`;
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0;
  return h % 1_000_000;
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
  const seed = opts.seed ?? stableSeed(opts.prompt, opts.referenceImagePath);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // Optional paid/credit HF path for true reference conditioning.
      if (preferHfImages() && hfToken() && opts.referenceImagePath) {
        try {
          modelUsed = await generateHfWithReference({
            prompt: opts.prompt,
            outPath: opts.outPath,
            referenceImagePath: opts.referenceImagePath,
          });
          await appendUsage(opts.usageLogPath, {
            purpose: opts.purpose,
            model: modelUsed,
            latencyMs: Date.now() - started,
            ok: true,
          });
          await sleep(1200);
          return opts.outPath;
        } catch (err) {
          lastError = err;
        }
      }

      if (preferHfImages() && hfToken() && !opts.referenceImagePath) {
        try {
          modelUsed = await generateHfTextToImage({ ...opts, seed });
          await appendUsage(opts.usageLogPath, {
            purpose: opts.purpose,
            model: modelUsed,
            latencyMs: Date.now() - started,
            ok: true,
          });
          await sleep(1200);
          return opts.outPath;
        } catch (err) {
          lastError = err;
        }
      }

      // Free default: Pollinations flux (prompt identity + stable seed).
      const prompt =
        opts.referenceImagePath
          ? `${opts.prompt}. Match the same character identity described in the prompt exactly, consistent face and build.`
          : opts.prompt;
      modelUsed = await generateWithPollinationsFlux({
        prompt,
        outPath: opts.outPath,
        width: opts.width,
        height: opts.height,
        seed,
      });
      await appendUsage(opts.usageLogPath, {
        purpose: opts.purpose,
        model: modelUsed,
        latencyMs: Date.now() - started,
        ok: true,
        error:
          lastError instanceof Error
            ? `hf_skipped_or_failed:${lastError.message}`
            : undefined,
      });
      await sleep(1000);
      return opts.outPath;
    } catch (err) {
      lastError = err;
      await sleep(1200 * (attempt + 1));
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
