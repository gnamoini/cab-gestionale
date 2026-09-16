import "server-only";

import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export async function requireLavorazioniMezzoLabelsRead(): Promise<
  | { ok: true; sb: Awaited<ReturnType<typeof createSupabaseServerUserClient>>; userId: string | null }
  | { ok: false; status: number; error: string }
> {
  const canRead = await verifyServerPageRead("lavorazioni");
  if (!canRead) return { ok: false, status: 403, error: "Permesso negato" };
  const sb = await createSupabaseServerUserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return { ok: true, sb, userId: user?.id ?? null };
}
