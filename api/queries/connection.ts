import { createClient } from "@libsql/client";
import Database from "better-sqlite3";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import { drizzle as drizzleBetter } from "drizzle-orm/better-sqlite3";
import * as schema from "@db/schema";

const isProduction = process.env.NODE_ENV === "production";
const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

// 生产环境用 Turso，本地用 SQLite
let db: ReturnType<typeof drizzleLibsql> | ReturnType<typeof drizzleBetter>;

if (isProduction && tursoUrl && tursoToken) {
  const client = createClient({
    url: tursoUrl,
    authToken: tursoToken,
  });
  db = drizzleLibsql(client, { schema });
  console.log("[DB] Using Turso cloud database");
} else {
  const sqlite = new Database("./eventhub.db");
  db = drizzleBetter(sqlite, { schema });
  console.log("[DB] Using local SQLite");
}

export { db };
