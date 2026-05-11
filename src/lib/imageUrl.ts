/** 列表/卡片用小尺寸 Cloudinary 变换，减轻体积并利用 CDN 缓存 */
export function listThumbnailUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    return url.replace("/upload/", "/upload/w_480,q_auto,f_auto/");
  }
  return url;
}
