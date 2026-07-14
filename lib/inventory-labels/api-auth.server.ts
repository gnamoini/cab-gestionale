import "server-only";

import { verifyServerPageRead, verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export async function requireInventoryLabelsRead(): Promise<
  { ok: true; sb: Awaited<ReturnType<typeof createSupabaseServerUserClient>>; userId: string | null } | { ok: false; status: number; error: string }
> {
  const canRead = await verifyServerPageRead("magazzino");
  if (!canRead) return { ok: false, status: 403, error: "Permesso negato" };
  const sb = await createSupabaseServerUserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return { ok: true, sb, userId: user?.id ?? null };
}

export async function requireInventoryLabelsWrite(): Promise<
  { ok: true; sb: Awaited<ReturnType<typeof createSupabaseServerUserClient>>; userId: string | null } | { ok: false; status: number; error: string }
> {
  const canWrite = await verifyServerPageWrite("magazzino");
  if (!canWrite) return { ok: false, status: 403, error: "Permesso negato" };
  const sb = await createSupabaseServerUserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return { ok: true, sb, userId: user?.id ?? null };
}

export function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  return url.origin;
}
