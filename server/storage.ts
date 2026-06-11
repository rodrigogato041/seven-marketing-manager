import fs from "fs/promises";
import path from "path";
import { ENV } from "./_core/env";

if (ENV.isProduction && !ENV.uploadDir) {
  throw new Error("UPLOAD_DIR must be configured in production. Attach a persistent disk and set UPLOAD_DIR to a path inside it.");
}

const UPLOAD_DIR = ENV.uploadDir ? path.resolve(ENV.uploadDir) : path.resolve(process.cwd(), "uploads");

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "").replace(/\\/g, "/");
}

function localUrl(key: string): string {
  return `/uploads/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const target = path.join(UPLOAD_DIR, key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, data);
  return { key, url: localUrl(key) };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: localUrl(key) };
}
