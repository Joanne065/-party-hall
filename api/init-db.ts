/**
 * 数据库初始化 - 使用 Drizzle 迁移
 * 启动时自动创建表
 */

import { sql } from "drizzle-orm";
import { db } from "./queries/connection";

export async function initDatabase() {
  try {
    console.log("[DB] Checking database...");

    // 检查 events 表是否存在
    const result = await db.get(sql`SELECT name FROM sqlite_master WHERE type='table' AND name='events'`);

    if (!result) {
      console.log("[DB] Creating tables...");

      // 创建所有表
      await db.run(sql`
        CREATE TABLE events (
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
          created_at INTEGER DEFAULT (unixepoch()),
          updated_at INTEGER DEFAULT (unixepoch())
        )
      `);

      await db.run(sql`
        CREATE TABLE event_photos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id INTEGER NOT NULL,
          url TEXT NOT NULL,
          filename TEXT,
          sort_order INTEGER DEFAULT 0,
          created_at INTEGER DEFAULT (unixepoch())
        )
      `);

      await db.run(sql`
        CREATE TABLE event_reviews (
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
        CREATE TABLE review_photos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          review_id INTEGER NOT NULL,
          url TEXT NOT NULL,
          filename TEXT,
          created_at INTEGER DEFAULT (unixepoch())
        )
      `);

      await db.run(sql`
        CREATE TABLE password_config (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          admin_password TEXT NOT NULL,
          visitor_password TEXT NOT NULL,
          updated_at INTEGER DEFAULT (unixepoch())
        )
      `);

      await db.run(sql`
        CREATE TABLE auth_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          token TEXT NOT NULL UNIQUE,
          role TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          created_at INTEGER DEFAULT (unixepoch())
        )
      `);

      // 插入默认密码
      const bcryptjs = await import("bcryptjs");
      await db.run(sql`
        INSERT INTO password_config (admin_password, visitor_password)
        VALUES (${await bcryptjs.hash("admin123", 10)}, ${await bcryptjs.hash("guest", 10)})
      `);

      console.log("[DB] Tables created and seeded successfully");
    } else {
      console.log("[DB] Tables already exist");
    }

    console.log("[DB] Database ready");
  } catch (error) {
    console.error("[DB] Init error (non-fatal):", error);
    // 不抛出错误，让服务继续启动
  }
}
