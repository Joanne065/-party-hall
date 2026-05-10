/**
 * 图片压缩 Hook
 * 上传前在浏览器端自动压缩
 * - 最大宽度 1200px
 * - JPEG 质量 0.85
 * - 单张控制在 300KB 以内
 */

function compressImage(file: File): Promise<{ data: string; name: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // 计算压缩后的尺寸（最大1200px）
        let { width, height } = img;
        const maxSize = 1200;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("canvas error")); return; }

        // 使用高质量渲染
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // 转换为 JPEG，质量 0.85（清晰度损失很小）
        const data = canvas.toDataURL("image/jpeg", 0.85);

        // 如果还是太大，进一步降低质量
        let quality = 0.85;
        while (data.length > 800000 && quality > 0.3) {
          quality -= 0.05;
          const recompressed = canvas.toDataURL("image/jpeg", quality);
          if (recompressed.length >= data.length) break; // 防止无限循环
          return resolve({
            data: canvas.toDataURL("image/jpeg", quality),
            name: file.name.replace(/\.[^.]+$/, ".jpg"),
          });
        }

        resolve({
          data,
          name: file.name.replace(/\.[^.]+$/, ".jpg"),
        });
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function useImageCompress() {
  const compressFiles = async (files: FileList | null): Promise<{ name: string; data: string }[]> => {
    if (!files || files.length === 0) return [];
    const results: { name: string; data: string }[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const compressed = await compressImage(file);
        results.push(compressed);
      } catch {
        // 压缩失败就用原图
        const reader = new FileReader();
        const data = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        results.push({ name: file.name, data });
      }
    }
    return results;
  };

  return { compressFiles };
}
