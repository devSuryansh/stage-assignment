import { promises as fs } from "fs";
import path from "path";

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

export async function appendUsage(
  logPath: string,
  entry: Omit<UsageEntry, "ts">,
): Promise<void> {
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n";
  await fs.appendFile(logPath, line, "utf8");
}
