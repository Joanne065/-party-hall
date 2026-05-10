import { z } from "zod";
import { router, publicQuery } from "./router-base";
import { db } from "./queries/connection";
import { eventPhotos } from "@db/schema";
import { eq } from "drizzle-orm";
import { adminOnly } from "./middleware";
import { uploadToCloudinary } from "./lib/cloudinary";

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
        // 先尝试上传到 Cloudinary
        const cloudinaryResult = await uploadToCloudinary(file.data, file.name);

        if (cloudinaryResult) {
          // Cloudinary 上传成功
          const result = await db.insert(eventPhotos).values({
            eventId: input.eventId,
            url: cloudinaryResult.url,
            filename: file.name,
          });
          results.push({
            id: Number(result.lastInsertRowid),
            url: cloudinaryResult.url,
            filename: file.name,
          });
        } else {
          // Cloudinary 失败，回退到本地存储
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
