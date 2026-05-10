import { z } from "zod";
import { router, publicQuery } from "./router-base";
import { db } from "./queries/connection";
import { passwordConfig, authSessions } from "@db/schema";
import bcryptjs from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { adminOnly } from "./middleware";

export const passwordRouter = router({
  verify: publicQuery
    .input(z.object({ password: z.string() }))
    .mutation(async ({ input }) => {
      const configs = await db.select().from(passwordConfig).limit(1);
      if (configs.length === 0) return { success: false, token: null, role: null };

      const config = configs[0];
      const isAdmin = await bcryptjs.compare(input.password, config.adminPassword);
      const isVisitor = await bcryptjs.compare(input.password, config.visitorPassword);

      if (!isAdmin && !isVisitor) {
        return { success: false, token: null, role: null };
      }

      const role = isAdmin ? "admin" : "visitor";
      const token = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await db.insert(authSessions).values({
        token,
        role,
        expiresAt,
      });

      return { success: true, token, role };
    }),

  checkSession: publicQuery.query(async ({ ctx }) => {
    return { valid: !!ctx.role, role: ctx.role };
  }),

  update: publicQuery
    .input(
      z.object({
        adminPassword: z.string().optional(),
        visitorPassword: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      adminOnly(ctx);
      const configs = await db.select().from(passwordConfig).limit(1);
      if (configs.length === 0) return { success: false };

      const config = configs[0];
      const updates: Record<string, string> = {};

      if (input.adminPassword) {
        updates.adminPassword = await bcryptjs.hash(input.adminPassword, 10);
      }
      if (input.visitorPassword) {
        updates.visitorPassword = await bcryptjs.hash(input.visitorPassword, 10);
      }

      await db
        .update(passwordConfig)
        .set(updates)
        .where(eq(passwordConfig.id, config.id));

      return { success: true };
    }),
});
