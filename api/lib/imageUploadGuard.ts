import { TRPCError } from "@trpc/server";
import { allowLocalImageUploadInProduction, isProduction } from "./deployPersistence";

/** 生产环境禁止静默写入本地 uploads，除非显式允许（持久卷等）。 */
export function assertLocalImageFallbackAllowed(): void {
  if (isProduction() && !allowLocalImageUploadInProduction()) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "生产环境请配置 Cloudinary：CLOUDINARY_CLOUD_NAME、CLOUDINARY_UPLOAD_PRESET（及控制台中的 unsigned upload preset）。未配置时图片会写入服务器临时目录，重新部署后链接会失效。若 uploads 已挂载持久盘，可设置 ALLOW_LOCAL_UPLOADS_IN_PRODUCTION=1。",
    });
  }
}
