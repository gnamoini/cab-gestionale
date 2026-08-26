import "server-only";

import { canonicalSiteOriginString } from "@/lib/core/site-origin";
import { verifyServerPageRead, verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export async function requireMezzoLabelsRead(): Promise<
  | { ok: true; sb: Awaited<ReturnType<typeof createSupabaseServerUserClient>>; userId: string | null }
  | { ok: false; status: number; error: string }
> {
  const canRead = await verifyServerPageRead("mezzi");
  if (!canRead) return { ok: false, status: 403, error: "Permesso negato" };
  const sb = await createSupabaseServerUserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return { ok: true, sb, userId: user?.id ?? null };
}

export async function requireMezzoLabelsWrite(): Promise<
  | { ok: true; sb: Awaited<ReturnType<typeof createSupabaseServerUserClient>>; userId: string | null }
  | { ok: false; status: number; error: string }
> {
  const canWrite = await verifyServerPageWrite("mezzi");
  if (!canWrite) return { ok: false, status: 403, error: "Permesso negato" };
  const sb = await createSupabaseServerUserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return { ok: true, sb, userId: user?.id ?? null };
}

export async function requireAuthenticatedUser(): Promise<
  | { ok: true; sb: Awaited<ReturnType<typeof createSupabaseServerUserClient>>; userId: string | null }
  | { ok: false; status: number; error: string }
> {
  const sb = await createSupabaseServerUserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "Non autenticato" };
  return { ok: true, sb, userId: user.id };
}

export function requestOrigin(request: Request): string {
  return canonicalSiteOriginString(request);
}
