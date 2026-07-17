import "server-only";

import { verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export async function requireOpsAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; status: number; error: string }
> {
  const allowed = await verifyServerPageWrite("sicurezza");
  if (!allowed) return { ok: false, status: 403, error: "Operazione riservata agli amministratori." };

  const sb = await createSupabaseServerUserClient();
  const {
    data: { user },
    error,
  } = await sb.auth.getUser();
  if (error || !user) return { ok: false, status: 401, error: "Sessione non valida." };
  return { ok: true, userId: user.id };
}
