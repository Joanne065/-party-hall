import { defineConfig } from "drizzle-kit";

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

/** Turso 远程库必须用 dialect `turso` + authToken，否则 drizzle-kit push 会在构建阶段失败 */
export default defineConfig(
  tursoUrl && tursoToken
    ? {
        schema: "./db/schema.ts",
        out: "./db/migrations",
        dialect: "turso",
        dbCredentials: {
          url: tursoUrl,
          authToken: tursoToken,
        },
      }
    : {
        schema: "./db/schema.ts",
        out: "./db/migrations",
        dialect: "sqlite",
        dbCredentials: {
          url: "./eventhub.db",
        },
      }
);
