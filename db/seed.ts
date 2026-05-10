import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import bcryptjs from "bcryptjs";

const sqlite = new Database("eventhub.db");
const db = drizzle(sqlite, { schema });

async function seed() {
  const existing = await db.select().from(schema.passwordConfig);
  if (existing.length === 0) {
    await db.insert(schema.passwordConfig).values({
      adminPassword: await bcryptjs.hash("admin123", 10),
      visitorPassword: await bcryptjs.hash("guest", 10),
    });
    console.log("Default passwords seeded:");
    console.log("  Admin: admin123");
    console.log("  Visitor: guest");
  } else {
    console.log("Passwords already seeded.");
  }
  process.exit(0);
}

seed().catch(console.error);
