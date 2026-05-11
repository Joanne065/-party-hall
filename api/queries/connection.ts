import { createClient } from "@libsql/client";
import Database from "better-sqlite3";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import { drizzle as drizzleBetter } from "drizzle-orm/better-sqlite3";
import * as schema from "@db/schema";

const isProduction = process.env.NODE_ENV === "production";
const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

let db: ReturnType<typeof drizzleLibsql> | ReturnType<typeof drizzleBetter>;

if (isProduction && tursoUrl && tursoToken) {
  // 生产环境：Turso 云端数据库
  const client = createClient({
    url: tursoUrl,
    authToken: tursoToken,
  });
  db = drizzleLibsql(client, { schema });

  // 异步初始化表
  client.execute(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      location TEXT,
      description TEXT,
      tags TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      cover_image TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    )
  `).catch(() => {});

  client.execute(`
    CREATE TABLE IF NOT EXISTS event_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      filename TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    )
  `).catch(() => {});

  client.execute(`
    CREATE TABLE IF NOT EXISTS event_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      attendance INTEGER,
      atmosphere TEXT,
      improvements TEXT,
      summary TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    )
  `).catch(() => {});

  client.execute(`
    CREATE TABLE IF NOT EXISTS review_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      review_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      filename TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    )
  `).catch(() => {});

  client.execute(`
    CREATE TABLE IF NOT EXISTS password_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_password TEXT NOT NULL,
      visitor_password TEXT NOT NULL,
      updated_at INTEGER DEFAULT (unixepoch())
    )
  `).catch(() => {});

  client.execute(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER DEFAULT (unixepoch())
    )
  `).catch(() => {});

  // 插入默认密码
  client.execute(`
    INSERT OR IGNORE INTO password_config (id, admin_password, visitor_password)
    VALUES (1, '$2a$10$dummyhashfordemopurposesonly01', '$2a$10$dummyhashfordemopurposesonly02')
  `).catch(() => {});

  console.log("[DB] Using Turso cloud database");
} else {
  // 本地开发：SQLite 文件
  const sqlite = new Database("./eventhub.db");
  db = drizzleBetter(sqlite, { schema });
  console.log("[DB] Using local SQLite");
}

export { db };
