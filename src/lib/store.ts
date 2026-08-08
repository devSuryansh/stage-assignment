import path from "path";
import { randomUUID } from "crypto";
import type { CultureSelection, Job, JobStatus } from "./schema";
import { BANGRU_DEFAULT } from "./schema";
import {
  assertDurableStorage,
  jobDir,
  listJobIds,
  readJobText,
  writeJobText,
} from "./fs-store";

export { jobDir } from "./fs-store";

export function jobJsonPath(id: string) {
  return path.join(jobDir(id), "job.json");
}

export async function ensureJobDirs(id: string) {
  // Local dirs are created lazily by write helpers; Blob needs no mkdir.
  void id;
  return jobDir(id);
}

export async function createJob(input: {
  originalText: string;
  sourceFilename?: string;
  cultures?: CultureSelection[];
}): Promise<Job> {
  assertDurableStorage();
  const id = randomUUID();
  const cultures = input.cultures?.length ? input.cultures : [BANGRU_DEFAULT];
  const now = new Date().toISOString();
  const job: Job = {
    id,
    createdAt: now,
    updatedAt: now,
    status: "uploaded",
    originalText: input.originalText,
    sourceFilename: input.sourceFilename,
    cultures,
    primaryCulture: cultures[0],
    usageLogPath: path.join(jobDir(id), "ai-usage-log.jsonl"),
  };
  await saveJob(job);
  await writeJobText(id, "original.txt", input.originalText);
  return job;
}

export async function saveJob(job: Job): Promise<void> {
  job.updatedAt = new Date().toISOString();
  await writeJobText(job.id, "job.json", JSON.stringify(job, null, 2));
}

export async function loadJob(id: string): Promise<Job | null> {
  const raw = await readJobText(id, "job.json");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Job;
  } catch {
    return null;
  }
}

export async function updateJobStatus(
  id: string,
  status: JobStatus,
  patch: Partial<Job> = {},
): Promise<Job> {
  const job = await loadJob(id);
  if (!job) throw new Error(`Job not found: ${id}`);
  Object.assign(job, patch, { status });
  await saveJob(job);
  return job;
}

export async function listJobs(): Promise<Job[]> {
  try {
    const entries = await listJobIds();
    const jobs: Job[] = [];
    for (const entry of entries) {
      const job = await loadJob(entry);
      if (job) jobs.push(job);
    }
    return jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export function absoluteAssetPath(jobId: string, relativePath: string) {
  return path.join(jobDir(jobId), relativePath);
}

/** Relative path inside a job dir from an absolute local path. */
export function relativeJobPath(jobId: string, absPath: string): string {
  const base = jobDir(jobId);
  const rel = path.relative(base, absPath);
  return rel.replace(/\\/g, "/");
}
