import { z } from "zod";
import { router, publicQuery } from "./router-base";
import { db } from "./queries/connection";
import { eventReviews, reviewPhotos } from "@db/schema";
import { eq } from "drizzle-orm";
import { adminOnly } from "./middleware";

export const reviewRouter = router({
  getByEventId: publicQuery
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input }) => {
      const reviews = await db
        .select()
        .from(eventReviews)
        .where(eq(eventReviews.eventId, input.eventId))
        .limit(1);

      if (reviews.length === 0) return null;

      const photos = await db
        .select()
        .from(reviewPhotos)
        .where(eq(reviewPhotos.reviewId, reviews[0].id));

      return { ...reviews[0], photos };
    }),

  upsert: publicQuery
    .input(
      z.object({
        eventId: z.number(),
        attendance: z.number().optional(),
        atmosphere: z.string().optional(),
        improvements: z.string().optional(),
        summary: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      adminOnly(ctx as { role: string | null });
      const { eventId, ...data } = input;

      const existing = await db
        .select()
        .from(eventReviews)
        .where(eq(eventReviews.eventId, eventId))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(eventReviews)
          .set(data)
          .where(eq(eventReviews.id, existing[0].id));
        return { id: existing[0].id, eventId, ...data };
      } else {
        const result = await db.insert(eventReviews).values({
          eventId,
          ...data,
        });
        return { id: Number(result.lastInsertRowid), eventId, ...data };
      }
    }),

  uploadPhoto: publicQuery
    .input(
      z.object({
        reviewId: z.number(),
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

        const result = await db.insert(reviewPhotos).values({
          reviewId: input.reviewId,
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

  deletePhoto: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      adminOnly(ctx as { role: string | null });
      const photo = await db
        .select()
        .from(reviewPhotos)
        .where(eq(reviewPhotos.id, input.id))
        .limit(1);

      if (photo.length > 0) {
        const fs = await import("fs/promises");
        const path = await import("path");
        const filePath = path.join(process.cwd(), "public", photo[0].url);
        try {
          await fs.unlink(filePath);
        } catch { /* ignore */ }
      }

      await db.delete(reviewPhotos).where(eq(reviewPhotos.id, input.id));
      return true;
    }),
});
