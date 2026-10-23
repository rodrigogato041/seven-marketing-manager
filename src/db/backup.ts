import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export async function backupDatabase(sourceFilename: string, destinationFilename: string) {
  fs.mkdirSync(path.dirname(path.resolve(destinationFilename)), { recursive: true });
  const source = new Database(sourceFilename);
  try { await source.backup(destinationFilename); } finally { source.close(); }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const source = process.env.DATABASE_URL ?? "data/seven.db";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const destination = path.join("backups", `seven-${stamp}.db`);
  await backupDatabase(source, destination);
  console.log(`Backup created at ${destination}`);
}
