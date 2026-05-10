import { z } from "zod";
import { router, publicQuery } from "./router-base";
import { db } from "./queries/connection";
import { eventPhotos } from "@db/schema";
import { eq } from "drizzle-orm";
import { adminOnly } from "./middleware";

export const photoRouter = router({
  upload: publicQuery
    .input(
      z.object({
        eventId: z.number(),
        files: z.array(
          z.object({
            name: z.string(),
            data: z.string(), // base64
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      adminOnly(ctx as { role: string | null });
      const results = [];

      for (const file of input.files) {
        const base64Data = file.data.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const filename = `${Date.now()}-${file.name}`;
        const fs = await import("fs/promises");
        const path = await import("path");
        const uploadDir = path.join(process.cwd(), "public", "uploads");

        try {
          await fs.mkdir(uploadDir, { recursive: true });
        } catch { /* ignore */ }

        const filePath = path.join(uploadDir, filename);
        await fs.writeFile(filePath, buffer);

        const result = await db.insert(eventPhotos).values({
          eventId: input.eventId,
          url: `/uploads/${filename}`,
          filename: file.name,
        });

        results.push({
          id: Number(result.lastInsertRowid),
          url: `/uploads/${filename}`,
          filename: file.name,
        });
      }

      return results;
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      adminOnly(ctx as { role: string | null });
      const photo = await db
        .select()
        .from(eventPhotos)
        .where(eq(eventPhotos.id, input.id))
        .limit(1);

      if (photo.length > 0) {
        const fs = await import("fs/promises");
        const path = await import("path");
        const filePath = path.join(process.cwd(), "public", photo[0].url);
        try {
          await fs.unlink(filePath);
        } catch { /* ignore if file doesn't exist */ }
      }

      await db.delete(eventPhotos).where(eq(eventPhotos.id, input.id));
      return true;
    }),
});
