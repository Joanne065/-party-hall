import { TRPCError } from "@trpc/server";

export function adminOnly(ctx: { role: string | null }) {
  if (ctx.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
}

export function authed(ctx: { role: string | null }) {
  if (!ctx.role) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Login required" });
  }
}
