import { db } from "./queries/connection";
import { authSessions } from "@db/schema";
import { eq } from "drizzle-orm";

export async function createContext(req: Request) {
  const token = req.headers.get("x-auth-token");
  let role: "admin" | "visitor" | null = null;

  if (token) {
    const session = await db
      .select()
      .from(authSessions)
      .where(eq(authSessions.token, token))
      .limit(1);

    if (session.length > 0 && new Date() < session[0].expiresAt) {
      role = session[0].role as "admin" | "visitor";
    }
  }

  return { db, role };
}
