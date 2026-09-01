import "server-only";

import { resolveWriteActorIdFromClient } from "@/lib/audit/resolve-actor";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

/** SSOT server-side: UUID autore dalla sessione autenticata (mai da request body). */
export async function resolveWriteActorIdFromServerSession(): Promise<string | null> {
  const session = await getServerSession();
  if (session.user?.id) return session.user.id;
  const sb = await createSupabaseServerUserClient();
  return resolveWriteActorIdFromClient(sb);
}
