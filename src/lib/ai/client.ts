import OpenAI from "openai";
import { appendUsage } from "./usage";
import { generateImageFile } from "./image";

function freeLlmClient() {
  const baseURL = process.env.FREELLMAPI_BASE_URL || "http://localhost:3001/v1";
  const apiKey = process.env.FREELLMAPI_API_KEY || "freellmapi-missing";
  return new OpenAI({ baseURL, apiKey });
}

/** Direct Gemini OpenAI-compatible fallback when FreeLLMAPI is unreachable. */
function geminiClient() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    apiKey,
  });
}

export function chatModel() {
  return process.env.FREELLMAPI_CHAT_MODEL || "gemini-3.5-flash";
}

export function imageModel() {
  return process.env.FREELLMAPI_IMAGE_MODEL || "nanobanana";
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

async function chatCompletion(opts: {
  system: string;
  user: string;
  temperature?: number;
  json?: boolean;
}): Promise<{ content: string; model: string; usage?: OpenAI.Completions.CompletionUsage }> {
  const model = chatModel();
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
    const resp = await freeLlmClient().chat.completions.create(body);
    return {
      content: resp.choices[0]?.message?.content ?? "",
      model: resp.model || model,
      usage: resp.usage,
    };
  } catch (primaryErr) {
    const gemini = geminiClient();
    if (!gemini) throw primaryErr;
    const fallbackModel =
      process.env.GOOGLE_CHAT_MODEL || "gemini-2.5-flash";
    const resp = await gemini.chat.completions.create({
      ...body,
      model: fallbackModel,
    });
    return {
      content: resp.choices[0]?.message?.content ?? "",
      model: resp.model || fallbackModel,
      usage: resp.usage,
    };
  }
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
