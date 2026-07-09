import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicQuery } from "./router-base";
import { db } from "./queries/connection";
import { events, eventPhotos, eventReviews, reviewPhotos } from "@db/schema";
import { eq, and, like, desc, gte, lte, inArray } from "drizzle-orm";
import { adminOnly } from "./middleware";

type EventRow = typeof events.$inferSelect;

function titleKey(title: string) {
  return title.trim();
}

async function syncThemeToGroup(
  source: EventRow,
  patch: Partial<Pick<EventRow, "title" | "description" | "coverImage" | "tags">>
) {
  const key = titleKey(source.title);
  const allRows = await db.select().from(events);
  const memberIds = allRows
    .filter((e) => titleKey(e.title) === key && !e.themeLocal)
    .map((m) => m.id);
  if (memberIds.length === 0) return 0;
  if (Object.keys(patch).length === 0) return 0;
  await db.update(events).set(patch as Record<string, unknown>).where(inArray(events.id, memberIds));
  return memberIds.length;
}

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

      const photos = (await db
        .select()
        .from(eventPhotos)
        .where(eq(eventPhotos.eventId, input.id)))
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id);

      return { ...eventRows[0], photos };
    }),

  /** 与当前活动标题（trim）相同的所有场次，用于详情页切换与主题同步 */
  getGroup: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const row = await db.select().from(events).where(eq(events.id, input.id)).limit(1);
      if (row.length === 0) return { members: [] as { id: number; date: string; status: string; title: string }[], isMulti: false };
      const key = row[0].title.trim();
      const allRows = await db.select().from(events);
      const members = allRows
        .map((e) => ({ id: e.id, date: e.date, status: e.status, title: e.title }))
        .filter((e) => e.title.trim() === key)
        .sort((a, b) => a.date.localeCompare(b.date));
      return { members, isMulti: members.length > 1 };
    }),

  /** 日历双击选活动：按标题去重后的主题列表 */
  listUniqueThemes: publicQuery.query(async () => {
    const all = await db.select().from(events).orderBy(desc(events.date));
    const map = new Map<
      string,
      {
        title: string;
        templateEventId: number;
        coverImage: string | null;
        description: string | null;
        sessionDates: string[];
      }
    >();
    for (const e of all) {
      const key = titleKey(e.title);
      if (!key) continue;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          title: e.title.trim(),
          templateEventId: e.id,
          coverImage: e.coverImage,
          description: e.description,
          sessionDates: [e.date],
        });
      } else if (!existing.sessionDates.includes(e.date)) {
        existing.sessionDates.push(e.date);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
  }),

  /** 将已有活动复制到新日期（不移动/删除原场次与照片） */
  addSessionToDate: publicQuery
    .input(
      z.object({
        copyFromEventId: z.number(),
        date: z.string(),
        status: z.enum(["confirmed", "pending"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      adminOnly(ctx as { role: string | null });
      const sourceRows = await db.select().from(events).where(eq(events.id, input.copyFromEventId)).limit(1);
      if (sourceRows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "源活动不存在" });
      }
      const source = sourceRows[0]!;
      const key = titleKey(source.title);
      const allRows = await db.select().from(events);
      const duplicate = allRows.some((e) => titleKey(e.title) === key && e.date === input.date);
      if (duplicate) {
        throw new TRPCError({ code: "CONFLICT", message: "该日期已有同名活动" });
      }

      const result = await db.insert(events).values({
        title: source.title.trim(),
        date: input.date,
        startTime: source.startTime,
        endTime: source.endTime,
        location: source.location,
        description: source.description,
        tags: source.tags ?? [],
        coverImage: source.coverImage,
        sessionIntro: null,
        status: input.status ?? source.status,
        themeLocal: false,
      });
      return { id: Number(result.lastInsertRowid), date: input.date, title: source.title.trim() };
    }),

  /** 将主题级字段同步到所有同名场次（不含场次日期、场次介绍；跳过 themeLocal 场次） */
  syncGroupTheme: publicQuery
    .input(
      z.object({
        sourceEventId: z.number(),
        title: z.string().optional(),
        description: z.string().nullable().optional(),
        tags: z.array(z.string()).optional(),
        coverImage: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      adminOnly(ctx as { role: string | null });
      const row = await db.select().from(events).where(eq(events.id, input.sourceEventId)).limit(1);
      if (row.length === 0) return { updated: 0 };
      const key = titleKey(row[0].title);
      const allRows = await db.select().from(events);
      const memberIds = allRows
        .filter((e) => titleKey(e.title) === key && !e.themeLocal)
        .map((m) => m.id);
      if (memberIds.length === 0) return { updated: 0 };

      const patch: Partial<typeof events.$inferInsert> = {};
      if (input.title !== undefined) patch.title = input.title;
      if (input.description !== undefined) patch.description = input.description;
      if (input.tags !== undefined) patch.tags = input.tags;
      if (input.coverImage !== undefined) patch.coverImage = input.coverImage;

      if (Object.keys(patch).length === 0) return { updated: 0 };
      await db.update(events).set(patch as Record<string, unknown>).where(inArray(events.id, memberIds));
      return { updated: memberIds.length };
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
        sessionIntro: z.string().optional(),
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
        sessionIntro: z.string().nullable().optional(),
        themeLocal: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      adminOnly(ctx as { role: string | null });
      const { id, themeLocal, ...data } = input;

      const currentRows = await db.select().from(events).where(eq(events.id, id)).limit(1);
      if (currentRows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "活动不存在" });
      }
      const current = currentRows[0]!;

      const rowPatch: Record<string, unknown> = { ...data };
      if (themeLocal !== undefined) rowPatch.themeLocal = themeLocal;

      await db.update(events).set(rowPatch).where(eq(events.id, id));

      const effectiveLocal = themeLocal ?? current.themeLocal ?? false;
      const themeChanged =
        data.title !== undefined ||
        data.description !== undefined ||
        data.tags !== undefined ||
        data.coverImage !== undefined;

      if (!effectiveLocal && themeChanged) {
        const updated = await db.select().from(events).where(eq(events.id, id)).limit(1);
        const row = updated[0] ?? current;
        await syncThemeToGroup(row, {
          title: row.title,
          description: row.description,
          coverImage: row.coverImage,
          tags: row.tags ?? [],
        });
      }

      return { id, ...data, themeLocal: effectiveLocal };
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
