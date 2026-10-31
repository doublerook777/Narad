import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

function hashKey(key: string): string {
  return crypto.createHash("sha1").update(key).digest("hex");
}

function getCachePath(kind: string, key: string): string {
  const hash = hashKey(key);
  return path.join(process.cwd(), ".cache", kind, `${hash}.json`);
}

export async function getCache<T>(kind: string, key: string): Promise<T | null> {
  if (process.env.DEMO_CACHE === "false") {
    return null;
  }

  try {
    const filePath = getCachePath(kind, key);
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export async function setCache<T>(kind: string, key: string, data: T): Promise<void> {
  if (process.env.DEMO_CACHE === "false") {
    return;
  }

  try {
    const filePath = getCachePath(kind, key);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("[cache] failed to write cache:", err);
  }
}

export async function hasCache(kind: string, key: string): Promise<boolean> {
  if (process.env.DEMO_CACHE === "false") {
    return false;
  }

  try {
    const filePath = getCachePath(kind, key);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
