import { createClient } from "@libsql/client";
import Database from "better-sqlite3";
import * as schema from "@db/schema";

function createDb() {
  if (process.env.NODE_ENV === "production" && process.env.TURSO_DATABASE_URL) {
    // 生产环境：Turso 云端数据库，数据永久保存
    const { drizzle } = require("drizzle-orm/libsql") as typeof import("drizzle-orm/libsql");
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    return drizzle(client, { schema });
  }

  // 本地开发：SQLite 文件
  const { drizzle } = require("drizzle-orm/better-sqlite3") as typeof import("drizzle-orm/better-sqlite3");
  const sqlite = new Database("./eventhub.db");
  return drizzle(sqlite, { schema });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: any = createDb();
