import { createClient } from "@libsql/client";
import Database from "better-sqlite3";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import { drizzle as drizzleBetter } from "drizzle-orm/better-sqlite3";
import * as schema from "@db/schema";
import {
  allowEphemeralSqliteInProduction,
  hasTursoCredentials,
  isProduction,
} from "../lib/deployPersistence";
import { SQLITE_ALTER_PATCHES } from "../lib/sqlitePatches";

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

let db: ReturnType<typeof drizzleLibsql> | ReturnType<typeof drizzleBetter>;

if (isProduction() && !hasTursoCredentials()) {
  if (!allowEphemeralSqliteInProduction()) {
    throw new Error(
      "[party-hall] 生产环境未配置 TURSO_DATABASE_URL / TURSO_AUTH_TOKEN：数据库会使用容器内临时文件，重新部署后活动与记录会丢失。请在 Turso 创建数据库并填入上述变量；若你自行挂载持久盘使用 SQLite，可设置 ALLOW_EPHEMERAL_DB=1。"
    );
  }
  console.warn(
    "[DB] WARNING: production 使用本地 SQLite（eventhub.db）。除非磁盘持久挂载，否则重新部署会丢数据。"
  );
}

if (isProduction() && tursoUrl && tursoToken) {
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
      session_intro TEXT,
      tags TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      cover_image TEXT,
      theme_local INTEGER DEFAULT 0,
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
      sort_order INTEGER DEFAULT 0,
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

  // 默认密码由 api/lib/seedPasswords.ts 在启动时用 bcrypt 写入（此处占位 SQL 无法生成合法 hash）

  console.log("[DB] Using Turso cloud database");

  for (const sql of SQLITE_ALTER_PATCHES) {
    client.execute(sql).catch(() => {});
  }
} else if (!isProduction() || !tursoUrl || !tursoToken) {
  // 本地开发，或未配置 Turso 时的降级：SQLite 文件
  const sqlite = new Database("./eventhub.db");
  for (const sql of SQLITE_ALTER_PATCHES) {
    try {
      sqlite.exec(sql);
    } catch {
      /* column may already exist */
    }
  }
  db = drizzleBetter(sqlite, { schema });
  console.log("[DB] Using local SQLite");
}

export { db };
