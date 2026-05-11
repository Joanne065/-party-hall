/**
 * 部署持久化：生产环境应使用 Turso（数据库）+ Cloudinary（图片）。
 * 未配置时落盘到容器本地会在重新部署后丢失。
 */

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function hasTursoCredentials(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
}

export function allowEphemeralSqliteInProduction(): boolean {
  const v = process.env.ALLOW_EPHEMERAL_DB;
  return v === "1" || v === "true";
}

export function allowLocalImageUploadInProduction(): boolean {
  const v = process.env.ALLOW_LOCAL_UPLOADS_IN_PRODUCTION;
  return v === "1" || v === "true";
}
