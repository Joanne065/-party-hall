import {
  sqliteTable,
  integer,
  text,
} from "drizzle-orm/sqlite-core";

export const events = sqliteTable("events", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  title: text("title", { length: 255 }).notNull(),
  date: text("date").notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  location: text("location", { length: 255 }),
  description: text("description"),
  /** 同主题不同场次专用文案（每场一条） */
  sessionIntro: text("session_intro"),
  tags: text("tags", { mode: "json" }).$type<string[]>(),
  status: text("status", { length: 20 }).notNull().default("pending"),
  coverImage: text("cover_image", { length: 500 }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const eventPhotos = sqliteTable("event_photos", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  eventId: integer("event_id").notNull(),
  url: text("url", { length: 500 }).notNull(),
  filename: text("filename", { length: 255 }),
  sortOrder: integer("sort_order", { mode: "number" }).default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const eventReviews = sqliteTable("event_reviews", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  eventId: integer("event_id").notNull(),
  attendance: integer("attendance"),
  atmosphere: text("atmosphere", { length: 50 }),
  improvements: text("improvements"),
  summary: text("summary"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const reviewPhotos = sqliteTable("review_photos", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  reviewId: integer("review_id").notNull(),
  url: text("url", { length: 500 }).notNull(),
  filename: text("filename", { length: 255 }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const passwordConfig = sqliteTable("password_config", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  adminPassword: text("admin_password", { length: 255 }).notNull(),
  visitorPassword: text("visitor_password", { length: 255 }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const authSessions = sqliteTable("auth_sessions", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  token: text("token", { length: 255 }).notNull().unique(),
  role: text("role", { length: 20 }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});
