import bcryptjs from "bcryptjs";
import { passwordConfig } from "@db/schema";
import { db } from "../queries/connection";

/** 空库时写入默认可登录密码（admin123 / guest），与 db/seed.ts 行为一致 */
export async function seedDefaultPasswordsIfEmpty(): Promise<void> {
  try {
    const existing = await db.select().from(passwordConfig).limit(1);
    if (existing.length === 0) {
      await db.insert(passwordConfig).values({
        adminPassword: await bcryptjs.hash("admin123", 10),
        visitorPassword: await bcryptjs.hash("guest", 10),
      });
      console.log("[DB] Default passwords seeded (admin / visitor)");
    }
  } catch (e) {
    console.log("[DB] Password config seed skipped:", e);
  }
}
