import OpenAI from "openai";
import { promises as fs } from "fs";
import path from "path";
import { appendUsage } from "./usage";

function getClient() {
  const baseURL = process.env.FREELLMAPI_BASE_URL || "http://localhost:3001/v1";
  const apiKey = process.env.FREELLMAPI_API_KEY || "freellmapi-missing";
  return new OpenAI({ baseURL, apiKey });
}

export function chatModel() {
  return process.env.FREELLMAPI_CHAT_MODEL || "auto:smart";
}

export function imageModel() {
  return process.env.FREELLMAPI_IMAGE_MODEL || "auto";
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) return JSON.parse(fenced[1].trim());
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    const aStart = trimmed.indexOf("[");
    const aEnd = trimmed.lastIndexOf("]");
    if (aStart >= 0 && aEnd > aStart) return JSON.parse(trimmed.slice(aStart, aEnd + 1));
    throw new Error("Failed to parse JSON from model response");
  }
}

export async function chatText(opts: {
  purpose: string;
  usageLogPath: string;
  system: string;
  user: string;
  temperature?: number;
}): Promise<string> {
  const client = getClient();
  const model = chatModel();
  const started = Date.now();
  let lastError: unknown;

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const resp = await client.chat.completions.create({
        model,
        temperature: opts.temperature ?? 0.3,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
      });
      const content = resp.choices[0]?.message?.content ?? "";
      const routedVia =
        (resp as unknown as { headers?: Record<string, string> }).headers?.[
          "x-routed-via"
        ] || undefined;
      await appendUsage(opts.usageLogPath, {
        purpose: opts.purpose,
        model: resp.model || model,
        routedVia,
        latencyMs: Date.now() - started,
        promptTokens: resp.usage?.prompt_tokens,
        completionTokens: resp.usage?.completion_tokens,
        ok: true,
      });
      return content;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const retryable = /429|rate|timeout|503|502|overloaded/i.test(msg);
      if (!retryable || attempt === 3) break;
      await sleep(1500 * (attempt + 1));
    }
  }

  await appendUsage(opts.usageLogPath, {
    purpose: opts.purpose,
    model,
    latencyMs: Date.now() - started,
    ok: false,
    error: lastError instanceof Error ? lastError.message : String(lastError),
  });
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function chatJson<T>(opts: {
  purpose: string;
  usageLogPath: string;
  system: string;
  user: string;
  temperature?: number;
}): Promise<T> {
  const content = await chatText({
    ...opts,
    system:
      opts.system +
      "\n\nRespond with valid JSON only. No markdown fences unless required. No commentary.",
  });
  try {
    return extractJson(content) as T;
  } catch {
    const repaired = await chatText({
      purpose: opts.purpose + ":json_repair",
      usageLogPath: opts.usageLogPath,
      system: "Fix the following into valid JSON only. Preserve all fields.",
      user: content,
      temperature: 0,
    });
    return extractJson(repaired) as T;
  }
}

export async function generateImage(opts: {
  purpose: string;
  usageLogPath: string;
  prompt: string;
  outPath: string;
  size?: "1024x1024" | "1024x1792" | "1792x1024";
}): Promise<string> {
  const client = getClient();
  const model = imageModel();
  const started = Date.now();

  try {
    await fs.mkdir(path.dirname(opts.outPath), { recursive: true });

    // Prefer OpenAI-compatible images API via FreeLLMAPI.
    try {
      const img = await client.images.generate({
        model,
        prompt: opts.prompt,
        n: 1,
        size: opts.size || "1024x1024",
        response_format: "b64_json",
      });
      const b64 = img.data?.[0]?.b64_json;
      const url = img.data?.[0]?.url;
      if (b64) {
        await fs.writeFile(opts.outPath, Buffer.from(b64, "base64"));
      } else if (url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Image download failed: ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        await fs.writeFile(opts.outPath, buf);
      } else {
        throw new Error("No image data returned");
      }
      await appendUsage(opts.usageLogPath, {
        purpose: opts.purpose,
        model,
        latencyMs: Date.now() - started,
        ok: true,
      });
      return opts.outPath;
    } catch (primaryErr) {
      // Fallback: keyless Pollinations (free open resource)
      const encoded = encodeURIComponent(opts.prompt.slice(0, 1800));
      const pollUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&seed=42`;
      const res = await fetch(pollUrl);
      if (!res.ok) {
        throw primaryErr;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      await fs.writeFile(opts.outPath, buf);
      await appendUsage(opts.usageLogPath, {
        purpose: opts.purpose,
        model: "pollinations-fallback",
        latencyMs: Date.now() - started,
        ok: true,
        error:
          primaryErr instanceof Error
            ? `primary_failed:${primaryErr.message}`
            : "primary_failed",
      });
      return opts.outPath;
    }
  } catch (err) {
    await appendUsage(opts.usageLogPath, {
      purpose: opts.purpose,
      model,
      latencyMs: Date.now() - started,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
