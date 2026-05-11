/**
 * 数据库初始化
 * 启动时自动创建表和默认密码
 * 支持 Turso 云端和本地 SQLite
 */

import { db } from "./queries/connection";
import { passwordConfig } from "@db/schema";
import { sql } from "drizzle-orm";
import bcryptjs from "bcryptjs";

// 注意：这里用动态导入避免循环依赖
export async function initDatabase() {
  try {
    console.log("[DB] Initializing database...");

    // 创建所有表（如果不存在）
    await db.run(sql`
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
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS event_photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        url TEXT NOT NULL,
        filename TEXT,
        created_at INTEGER DEFAULT (unixepoch())
      )
    `);

    await db.run(sql`
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
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS review_photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        review_id INTEGER NOT NULL,
        url TEXT NOT NULL,
        filename TEXT,
        created_at INTEGER DEFAULT (unixepoch())
      )
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS password_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_password TEXT NOT NULL,
        visitor_password TEXT NOT NULL,
        updated_at INTEGER DEFAULT (unixepoch())
      )
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER DEFAULT (unixepoch())
      )
    `);

    console.log("[DB] Tables created successfully");

    // 检查是否需要插入默认密码
    try {
      const existing = await db.select().from(passwordConfig).limit(1);
      if (existing.length === 0) {
        await db.insert(passwordConfig).values({
          adminPassword: await bcryptjs.hash("admin123", 10),
          visitorPassword: await bcryptjs.hash("guest", 10),
        });
        console.log("[DB] Default passwords seeded");
      }
    } catch {
      console.log("[DB] Password config check skipped");
    }

    console.log("[DB] Initialization complete");
  } catch (error) {
    console.error("[DB] Init error:", error);
  }
}
