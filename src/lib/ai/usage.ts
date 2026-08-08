import path from "path";
import { appendJobText, jobDir } from "../fs-store";

export interface UsageEntry {
  ts: string;
  purpose: string;
  model: string;
  routedVia?: string;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  ok: boolean;
  error?: string;
}

function jobIdFromUsagePath(logPath: string): string | null {
  // .../jobs/<id>/ai-usage-log.jsonl  or  /tmp/data/jobs/<id>/...
  const parts = logPath.replace(/\\/g, "/").split("/");
  const jobsIdx = parts.lastIndexOf("jobs");
  if (jobsIdx >= 0 && parts[jobsIdx + 1]) return parts[jobsIdx + 1];
  // Fallback: dirname basename when path is jobDir/ai-usage-log.jsonl
  const dir = path.dirname(logPath);
  if (path.basename(dir) && path.basename(logPath) === "ai-usage-log.jsonl") {
    return path.basename(dir);
  }
  return null;
}

export async function appendUsage(
  logPath: string,
  entry: Omit<UsageEntry, "ts">,
): Promise<void> {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n";
  const jobId = jobIdFromUsagePath(logPath);
  if (jobId) {
    await appendJobText(jobId, "ai-usage-log.jsonl", line);
    return;
  }
  // Legacy absolute path outside job layout (tests / scripts)
  const { promises: fs } = await import("fs");
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.appendFile(logPath, line, "utf8");
}

export function usageLogPathForJob(jobId: string) {
  return path.join(jobDir(jobId), "ai-usage-log.jsonl");
}
