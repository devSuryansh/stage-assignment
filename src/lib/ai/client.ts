import OpenAI from "openai";
import { appendUsage } from "./usage";
import { generateImageFile } from "./image";

/**
 * Free-first chat routing:
 * 1) Groq (free tier, OpenAI-compatible) — default
 * 2) Hugging Face Inference Providers — optional if HF_TOKEN has credits
 *
 * HF free monthly credits are tiny (~$0.10) and deplete quickly on image+chat.
 */

type ChatBackend = "groq" | "huggingface";

function groqKey(): string | undefined {
  return process.env.GROQ_API_KEY || undefined;
}

function hfToken(): string | undefined {
  return (
    process.env.HF_TOKEN ||
    process.env.HUGGINGFACE_API_KEY ||
    process.env.HUGGING_FACE_HUB_TOKEN ||
    undefined
  );
}

function preferredBackend(): ChatBackend {
  const forced = (process.env.CHAT_PROVIDER || "").toLowerCase();
  if (forced === "groq" || forced === "huggingface" || forced === "hf") {
    return forced === "hf" ? "huggingface" : (forced as ChatBackend);
  }
  if (groqKey()) return "groq";
  if (hfToken()) return "huggingface";
  throw new Error(
    "No free chat key configured. Set GROQ_API_KEY (free at https://console.groq.com/keys). Optional: HF_TOKEN if you still have Inference Providers credits.",
  );
}

function chatClient(backend: ChatBackend) {
  if (backend === "groq") {
    const apiKey = groqKey();
    if (!apiKey) throw new Error("GROQ_API_KEY missing");
    return new OpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey,
    });
  }
  const apiKey = hfToken();
  if (!apiKey) throw new Error("HF_TOKEN missing");
  return new OpenAI({
    baseURL: process.env.HF_CHAT_BASE_URL || "https://router.huggingface.co/v1",
    apiKey,
  });
}

export function chatModel(backend?: ChatBackend) {
  let b: ChatBackend = backend || "groq";
  if (!backend) {
    try {
      b = preferredBackend();
    } catch {
      b = groqKey() ? "groq" : "huggingface";
    }
  }
  if (b === "groq") {
    return process.env.GROQ_CHAT_MODEL || "llama-3.3-70b-versatile";
  }
  return (
    process.env.HF_CHAT_MODEL || "meta-llama/Llama-3.3-70B-Instruct:fastest"
  );
}

export function imageModel() {
  return process.env.HF_IMAGE_MODEL || "black-forest-labs/FLUX.1-schnell";
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isCreditError(msg: string) {
  return /depleted|credits|payment|402|insufficient/i.test(msg);
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

function backendsToTry(): ChatBackend[] {
  const primary = preferredBackend();
  const ordered: ChatBackend[] = [primary];
  if (primary === "groq" && hfToken()) ordered.push("huggingface");
  if (primary === "huggingface" && groqKey()) ordered.push("groq");
  return ordered;
}

async function chatCompletion(opts: {
  system: string;
  user: string;
  temperature?: number;
  json?: boolean;
}): Promise<{ content: string; model: string; usage?: OpenAI.Completions.CompletionUsage }> {
  let lastError: unknown;

  for (const backend of backendsToTry()) {
    const model = chatModel(backend);
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ];
    const body: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      model,
      temperature: opts.temperature ?? 0.3,
      messages,
    };
    if (opts.json) {
      body.response_format = { type: "json_object" };
    }

    try {
      const resp = await chatClient(backend).chat.completions.create(body);
      return {
        content: resp.choices[0]?.message?.content ?? "",
        model: resp.model || `${backend}:${model}`,
        usage: resp.usage,
      };
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);

      if (opts.json && !isCreditError(msg)) {
        try {
          const plain = { ...body };
          delete plain.response_format;
          const resp = await chatClient(backend).chat.completions.create(plain);
          return {
            content: resp.choices[0]?.message?.content ?? "",
            model: resp.model || `${backend}:${model}`,
            usage: resp.usage,
          };
        } catch (retryErr) {
          lastError = retryErr;
        }
      }

      // Try next backend (e.g. HF credits depleted → Groq).
      continue;
    }
  }

  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  if (isCreditError(msg)) {
    throw new Error(
      `${msg} Hugging Face monthly free credits are exhausted. Set GROQ_API_KEY for free chat (https://console.groq.com/keys).`,
    );
  }
  throw lastError instanceof Error ? lastError : new Error(msg);
}

export async function chatText(opts: {
  purpose: string;
  usageLogPath: string;
  system: string;
  user: string;
  temperature?: number;
}): Promise<string> {
  const started = Date.now();
  let lastError: unknown;

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const resp = await chatCompletion({
        system: opts.system,
        user: opts.user,
        temperature: opts.temperature,
      });
      await appendUsage(opts.usageLogPath, {
        purpose: opts.purpose,
        model: resp.model,
        latencyMs: Date.now() - started,
        promptTokens: resp.usage?.prompt_tokens,
        completionTokens: resp.usage?.completion_tokens,
        ok: true,
      });
      return resp.content;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const retryable = /429|rate|timeout|503|502|overloaded|ECONNREFUSED|fetch failed/i.test(
        msg,
      );
      if (!retryable || attempt === 3) break;
      await sleep(1500 * (attempt + 1));
    }
  }

  await appendUsage(opts.usageLogPath, {
    purpose: opts.purpose,
    model: chatModel(),
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
  const started = Date.now();
  let lastError: unknown;
  let content = "";

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await chatCompletion({
        system:
          opts.system +
          "\n\nRespond with valid JSON only. No markdown fences. No commentary.",
        user: opts.user,
        temperature: opts.temperature ?? 0.2,
        json: true,
      });
      content = resp.content;
      await appendUsage(opts.usageLogPath, {
        purpose: opts.purpose,
        model: resp.model,
        latencyMs: Date.now() - started,
        promptTokens: resp.usage?.prompt_tokens,
        completionTokens: resp.usage?.completion_tokens,
        ok: true,
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
    } catch (err) {
      lastError = err;
      await sleep(1200 * (attempt + 1));
    }
  }

  await appendUsage(opts.usageLogPath, {
    purpose: opts.purpose,
    model: chatModel(),
    latencyMs: Date.now() - started,
    ok: false,
    error: lastError instanceof Error ? lastError.message : String(lastError),
  });
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function generateImage(opts: {
  purpose: string;
  usageLogPath: string;
  prompt: string;
  outPath: string;
  referenceImagePath?: string;
  size?: "1024x1024" | "1024x1792" | "1792x1024";
}): Promise<string> {
  const [w, h] = (opts.size || "1024x1024").split("x").map(Number);
  return generateImageFile({
    purpose: opts.purpose,
    usageLogPath: opts.usageLogPath,
    prompt: opts.prompt,
    outPath: opts.outPath,
    referenceImagePath: opts.referenceImagePath,
    width: w,
    height: h,
  });
}
