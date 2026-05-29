import { cache } from "react";
import { cookies } from "next/headers";
import { resolveServerAuthFromCookies } from "@/src/lib/auth/resolve-server-auth";
import type { ServerAuthSnapshot } from "@/src/lib/auth/server-auth-types";

/** Source of truth server-side per sessione auth (dedupe React cache per request RSC). */
export const getServerSession = cache(async (): Promise<ServerAuthSnapshot> => {
  const cookieStore = await cookies();
  return resolveServerAuthFromCookies(cookieStore.getAll());
});
