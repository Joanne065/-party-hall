import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@db/schema";
import path from "path";
import fs from "fs";

function findDatabase(): string {
  const candidates = [
    path.join(process.cwd(), "eventhub.db"),
    path.join(process.cwd(), "dist", "eventhub.db"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Fallback: create at cwd
  return candidates[0];
}

const sqlite = new Database(findDatabase());

export const db = drizzle(sqlite, { schema });
