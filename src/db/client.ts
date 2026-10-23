import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

export function initializeSqlite(sqlite: Database.Database) {
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  const migration = fs.readFileSync(path.join(process.cwd(), "drizzle/0000_initial.sql"), "utf8");
  sqlite.exec(migration);
}

export function createDatabase(filename: string) {
  if (filename !== ":memory:") fs.mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  const sqlite = new Database(filename);
  initializeSqlite(sqlite);
  return { sqlite, db: drizzle(sqlite, { schema }) };
}

let singleton: ReturnType<typeof createDatabase> | undefined;

export function getDatabase() {
  singleton ??= createDatabase(process.env.DATABASE_URL ?? "data/seven.db");
  return singleton;
}

export type AppDatabase = ReturnType<typeof createDatabase>["db"];
