/**
 * 旧库增量列（CREATE IF NOT EXISTS 不会给已有表加列）
 */
export const SQLITE_ALTER_PATCHES = [
  "ALTER TABLE events ADD COLUMN session_intro TEXT",
  "ALTER TABLE event_photos ADD COLUMN sort_order INTEGER DEFAULT 0",
  "ALTER TABLE events ADD COLUMN theme_local INTEGER DEFAULT 0",
] as const;
