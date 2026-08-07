import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { CultureSelection, Job, JobStatus } from "./schema";
import { BANGRU_DEFAULT } from "./schema";

const ROOT = path.join(process.cwd(), "data", "jobs");

export function jobDir(id: string) {
  return path.join(ROOT, id);
}

export function jobJsonPath(id: string) {
  return path.join(jobDir(id), "job.json");
}

export async function ensureJobDirs(id: string) {
  const dir = jobDir(id);
  await fs.mkdir(path.join(dir, "images", "characters"), { recursive: true });
  await fs.mkdir(path.join(dir, "images", "costumes"), { recursive: true });
  await fs.mkdir(path.join(dir, "images", "scenes"), { recursive: true });
  await fs.mkdir(path.join(dir, "exports"), { recursive: true });
  return dir;
}

export async function createJob(input: {
  originalText: string;
  sourceFilename?: string;
  cultures?: CultureSelection[];
}): Promise<Job> {
  const id = randomUUID();
  const cultures = input.cultures?.length ? input.cultures : [BANGRU_DEFAULT];
  const now = new Date().toISOString();
  await ensureJobDirs(id);
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
  await fs.writeFile(path.join(jobDir(id), "original.txt"), input.originalText, "utf8");
  return job;
}

export async function saveJob(job: Job): Promise<void> {
  job.updatedAt = new Date().toISOString();
  await ensureJobDirs(job.id);
  await fs.writeFile(jobJsonPath(job.id), JSON.stringify(job, null, 2), "utf8");
}

export async function loadJob(id: string): Promise<Job | null> {
  try {
    const raw = await fs.readFile(jobJsonPath(id), "utf8");
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
    await fs.mkdir(ROOT, { recursive: true });
    const entries = await fs.readdir(ROOT);
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
