import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicQuery } from "./router-base";
import { db } from "./queries/connection";
import { eventPhotos } from "@db/schema";
import { eq } from "drizzle-orm";
import { adminOnly } from "./middleware";
import { uploadToCloudinary } from "./lib/cloudinary";
import { assertLocalImageFallbackAllowed } from "./lib/imageUploadGuard";

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

      const existing = await db
        .select()
        .from(eventPhotos)
        .where(eq(eventPhotos.eventId, input.eventId));
      let nextOrder =
        existing.reduce((m, r) => Math.max(m, r.sortOrder ?? 0), -1) + 1;

      for (const file of input.files) {
        // 先尝试上传到 Cloudinary
        const cloudinaryResult = await uploadToCloudinary(file.data, file.name);

        if (cloudinaryResult) {
          // Cloudinary 上传成功
          const result = await db.insert(eventPhotos).values({
            eventId: input.eventId,
            url: cloudinaryResult.url,
            filename: file.name,
            sortOrder: nextOrder++,
          });
          results.push({
            id: Number(result.lastInsertRowid),
            url: cloudinaryResult.url,
            filename: file.name,
          });
        } else {
          assertLocalImageFallbackAllowed();
          // Cloudinary 未配置或失败，回退到本地存储（开发环境或 ALLOW_LOCAL_UPLOADS_IN_PRODUCTION）
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
            sortOrder: nextOrder++,
          });

          results.push({
            id: Number(result.lastInsertRowid),
            url: `/uploads/${filename}`,
            filename: file.name,
          });
        }
      }

      return results;
    }),

  reorder: publicQuery
    .input(
      z.object({
        eventId: z.number(),
        orderedPhotoIds: z.array(z.number()).min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      adminOnly(ctx as { role: string | null });
      const pics = await db
        .select()
        .from(eventPhotos)
        .where(eq(eventPhotos.eventId, input.eventId));
      const allowed = new Set(pics.map((p) => p.id));
      for (const pid of input.orderedPhotoIds) {
        if (!allowed.has(pid)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid photo id for this event" });
        }
      }
      if (input.orderedPhotoIds.length !== allowed.size) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Must include every photo id for reorder" });
      }
      for (let i = 0; i < input.orderedPhotoIds.length; i++) {
        await db
          .update(eventPhotos)
          .set({ sortOrder: i })
          .where(eq(eventPhotos.id, input.orderedPhotoIds[i]!));
      }
      return true;
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
        // 如果是本地文件，删除文件
        if (photo[0].url.startsWith("/uploads/")) {
          const fs = await import("fs/promises");
          const path = await import("path");
          const filePath = path.join(process.cwd(), "public", photo[0].url);
          try {
            await fs.unlink(filePath);
          } catch { /* ignore if file doesn't exist */ }
        }
        // 如果是 Cloudinary 图片，不需要删除文件，URL 失效即可
      }

      await db.delete(eventPhotos).where(eq(eventPhotos.id, input.id));
      return true;
    }),
});
