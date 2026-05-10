/**
 * Cloudinary 图片上传
 * 图片上传到 Cloudinary CDN，URL 存在数据库
 * 免费版 25GB，永久保存，全球 CDN 加速
 */

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  uploadPreset: string;
}

function getConfig(): CloudinaryConfig | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) return null;

  return { cloudName, apiKey: apiKey || "", uploadPreset };
}

export async function uploadToCloudinary(
  base64Data: string,
  filename: string
): Promise<{ url: string; filename: string } | null> {
  const config = getConfig();
  if (!config) {
    // 没有配置 Cloudinary，返回 null，让调用方用本地存储
    return null;
  }

  try {
    // 移除 base64 前缀
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");

    // 构造 form data
    const formData = new FormData();
    formData.append("file", `data:image/jpeg;base64,${cleanBase64}`);
    formData.append("upload_preset", config.uploadPreset);
    formData.append("public_id", `${Date.now()}-${filename.replace(/\.[^.]+$/, "")}`);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      console.error("Cloudinary upload failed:", await response.text());
      return null;
    }

    const result = (await response.json()) as { secure_url: string };
    return {
      url: result.secure_url,
      filename: filename,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return null;
  }
}

export function getCloudinaryUrl(publicId: string, width = 800): string {
  const config = getConfig();
  if (!config) return publicId;
  return `https://res.cloudinary.com/${config.cloudName}/image/upload/w_${width},q_auto,f_auto/${publicId}`;
}
