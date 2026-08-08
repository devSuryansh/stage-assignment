/**
 * Portable job file storage.
 * - Local: filesystem under DATA_DIR
 * - Vercel: Vercel Blob (BLOB_READ_WRITE_TOKEN) — required because /tmp is
 *   per-instance and jobs disappear between POST /api/jobs and page renders.
 */
import { promises as fs } from "fs";
import path from "path";
import { get, list, put } from "@vercel/blob";

function onVercel() {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

export function isBlobStoreEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function assertDurableStorage() {
  if (onVercel() && !isBlobStoreEnabled()) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is required on Vercel. Create a Blob store and connect it to this project so jobs survive across serverless instances.",
    );
  }
}

function dataRoot() {
  let base = process.env.DATA_DIR || "data";
  if (onVercel() && (!path.isAbsolute(base) || !base.startsWith("/tmp"))) {
    base = "/tmp/data";
  }
  return path.isAbsolute(base)
    ? path.join(base, "jobs")
    : path.join(process.cwd(), base, "jobs");
}

export function jobDir(id: string) {
  return path.join(dataRoot(), id);
}

function blobPath(jobId: string, relativePath: string) {
  return `jobs/${jobId}/${relativePath.replace(/\\/g, "/")}`;
}

async function ensureLocalDirs(jobId: string) {
  const dir = jobDir(jobId);
  await fs.mkdir(path.join(dir, "images", "characters"), { recursive: true });
  await fs.mkdir(path.join(dir, "images", "costumes"), { recursive: true });
  await fs.mkdir(path.join(dir, "images", "scenes"), { recursive: true });
  await fs.mkdir(path.join(dir, "exports"), { recursive: true });
  return dir;
}

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

export async function writeJobText(
  jobId: string,
  relativePath: string,
  text: string,
) {
  await ensureLocalDirs(jobId);
  const abs = path.join(jobDir(jobId), relativePath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, text, "utf8");

  if (isBlobStoreEnabled()) {
    await put(blobPath(jobId, relativePath), text, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: relativePath.endsWith(".json")
        ? "application/json"
        : "text/plain; charset=utf-8",
    });
  }
}

export async function writeJobBinary(
  jobId: string,
  relativePath: string,
  data: Buffer,
) {
  await ensureLocalDirs(jobId);
  const abs = path.join(jobDir(jobId), relativePath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, data);

  if (isBlobStoreEnabled()) {
    const ext = path.extname(relativePath).toLowerCase();
    const contentType =
      ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".webp"
            ? "image/webp"
            : "application/octet-stream";
    await put(blobPath(jobId, relativePath), data, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
    });
  }
}

export async function readJobText(
  jobId: string,
  relativePath: string,
): Promise<string | null> {
  if (isBlobStoreEnabled()) {
    try {
      const result = await get(blobPath(jobId, relativePath), {
        access: "private",
      });
      if (result?.stream && result.statusCode === 200) {
        return (await streamToBuffer(result.stream)).toString("utf8");
      }
    } catch {
      // fall through to local
    }
  }
  try {
    return await fs.readFile(path.join(jobDir(jobId), relativePath), "utf8");
  } catch {
    return null;
  }
}

export async function readJobBinary(
  jobId: string,
  relativePath: string,
): Promise<Buffer | null> {
  if (isBlobStoreEnabled()) {
    try {
      const result = await get(blobPath(jobId, relativePath), {
        access: "private",
      });
      if (result?.stream && result.statusCode === 200) {
        return streamToBuffer(result.stream);
      }
    } catch {
      // fall through
    }
  }
  try {
    return await fs.readFile(path.join(jobDir(jobId), relativePath));
  } catch {
    return null;
  }
}

export async function appendJobText(
  jobId: string,
  relativePath: string,
  chunk: string,
) {
  const prev = (await readJobText(jobId, relativePath)) || "";
  await writeJobText(jobId, relativePath, prev + chunk);
}

export async function listJobIds(): Promise<string[]> {
  if (isBlobStoreEnabled()) {
    const listed = await list({ prefix: "jobs/", limit: 1000 });
    const ids = new Set<string>();
    for (const blob of listed.blobs) {
      const parts = blob.pathname.split("/");
      if (parts[0] === "jobs" && parts[1]) ids.add(parts[1]);
    }
    return [...ids];
  }

  try {
    const root = dataRoot();
    await fs.mkdir(root, { recursive: true });
    return await fs.readdir(root);
  } catch {
    return [];
  }
}

export async function listJobFiles(
  jobId: string,
  folderRel: string,
): Promise<string[]> {
  if (isBlobStoreEnabled()) {
    const prefix = `${blobPath(jobId, folderRel).replace(/\/$/, "")}/`;
    const listed = await list({ prefix, limit: 200 });
    return listed.blobs
      .map((b) => b.pathname.slice(prefix.length))
      .filter((name) => name && !name.includes("/"));
  }
  try {
    return await fs.readdir(path.join(jobDir(jobId), folderRel));
  } catch {
    return [];
  }
}

/** Mirror a file already written under jobDir to Blob. */
export async function syncLocalFileToBlob(jobId: string, relativePath: string) {
  if (!isBlobStoreEnabled()) return;
  const abs = path.join(jobDir(jobId), relativePath);
  const data = await fs.readFile(abs);
  const ext = path.extname(relativePath).toLowerCase();
  const contentType =
    ext === ".png"
      ? "image/png"
      : ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : ext === ".webp"
          ? "image/webp"
          : "application/octet-stream";
  await put(blobPath(jobId, relativePath), data, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
  });
}
