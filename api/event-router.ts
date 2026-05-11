import { z } from "zod";
import { router, publicQuery } from "./router-base";
import { db } from "./queries/connection";
import { events, eventPhotos, eventReviews, reviewPhotos } from "@db/schema";
import { eq, and, like, desc, gte, lte } from "drizzle-orm";
import { adminOnly } from "./middleware";

export const eventRouter = router({
  list: publicQuery
    .input(
      z
        .object({
          month: z.string().optional(),
          /** 含日历格子上、下月的可见区间（YYYY-MM-DD），与 month 二选一优先用区间 */
          dateFrom: z.string().optional(),
          dateTo: z.string().optional(),
          status: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const conditions = [];
      if (input?.dateFrom && input?.dateTo) {
        conditions.push(gte(events.date, input.dateFrom));
        conditions.push(lte(events.date, input.dateTo));
      } else if (input?.month) {
        conditions.push(like(events.date, `${input.month}%`));
      }
      if (input?.status) {
        conditions.push(eq(events.status, input.status));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const result = await db
        .select()
        .from(events)
        .where(where)
        .orderBy(desc(events.date));

      // Fetch photos for each event
      const eventIds = result.map((r: typeof events.$inferSelect) => r.id);

      // Actually we need all photos for all events
      const allPhotos = eventIds.length > 0
        ? await Promise.all(eventIds.map((id: number) => db.select().from(eventPhotos).where(eq(eventPhotos.eventId, id))))
        : [];

      return result.map((evt: typeof events.$inferSelect, i: number) => ({
        ...evt,
        photos: allPhotos[i] || [],
      }));
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const eventRows = await db
        .select()
        .from(events)
        .where(eq(events.id, input.id))
        .limit(1);

      if (eventRows.length === 0) return null;

      const photos = await db
        .select()
        .from(eventPhotos)
        .where(eq(eventPhotos.eventId, input.id));

      return { ...eventRows[0], photos };
    }),

  create: publicQuery
    .input(
      z.object({
        title: z.string().min(1),
        date: z.string(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        location: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        status: z.enum(["confirmed", "pending"]).default("pending"),
        coverImage: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      adminOnly(ctx as { role: string | null });
      const result = await db.insert(events).values({
        ...input,
        tags: input.tags ?? [],
      });
      return { id: Number(result.lastInsertRowid), ...input };
    }),

  update: publicQuery
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        date: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        location: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        status: z.enum(["confirmed", "pending"]).optional(),
        coverImage: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      adminOnly(ctx as { role: string | null });
      const { id, ...data } = input;
      await db.update(events).set(data).where(eq(events.id, id));
      return { id, ...data };
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      adminOnly(ctx as { role: string | null });
      await db.delete(eventPhotos).where(eq(eventPhotos.eventId, input.id));
      const reviews = await db.select().from(eventReviews).where(eq(eventReviews.eventId, input.id));
      for (const r of reviews) {
        await db.delete(reviewPhotos).where(eq(reviewPhotos.reviewId, r.id));
      }
      await db.delete(eventReviews).where(eq(eventReviews.eventId, input.id));
      await db.delete(events).where(eq(events.id, input.id));
      return true;
    }),
});
