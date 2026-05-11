import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { seedDefaultPasswordsIfEmpty } from "./lib/seedPasswords";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = new Hono<{ Bindings: HttpBindings }>();

void seedDefaultPasswordsIfEmpty();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// Serve uploads directory
app.use("/uploads/*", async (c) => {
  try {
    const fsPromises = await import("fs/promises");
    const filePath = path.join(process.cwd(), "public", c.req.path);
    const file = await fsPromises.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType =
      ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : ext === ".gif"
        ? "image/gif"
        : "application/octet-stream";
    return new Response(file, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return c.json({ error: "Not found" }, 404);
  }
});

// tRPC API
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: () => createContext(c.req.raw),
  });
});

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

// Static files and SPA fallback
const distPath = path.resolve(__dirname, "public");

app.use("*", serveStatic({ root: distPath }));

app.notFound((c) => {
  const accept = c.req.header("accept") ?? "";
  if (!accept.includes("text/html")) {
    return c.json({ error: "Not Found" }, 404);
  }
  try {
    const indexPath = path.resolve(distPath, "index.html");
    const content = fs.readFileSync(indexPath, "utf-8");
    return c.html(content);
  } catch {
    return c.json({ error: "Not Found" }, 404);
  }
});

export default app;

if (process.env.NODE_ENV === "production") {
  const { serve } = await import("@hono/node-server");
  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
