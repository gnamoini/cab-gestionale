import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditActorType } from "@/lib/audit/types";
import { AuditLogWriteError } from "@/lib/audit/errors";

export type ResolvedAuditActor = {
  autoreId: string | null;
  actorType: AuditActorType;
  companyId: string | null;
};

/** UUID autore dalla sessione del Supabase client (browser o server-user). */
export async function resolveWriteActorIdFromClient(client: SupabaseClient): Promise<string | null> {
  const { data } = await client.auth.getUser();
  return data.user?.id ?? null;
}

export async function resolveAuditActor(
  client: SupabaseClient,
  input: {
    autoreId?: string | null;
    actorType?: AuditActorType;
    companyId?: string | null;
  },
): Promise<ResolvedAuditActor> {
  const actorType = input.actorType ?? "USER";
  let autoreId = input.autoreId ?? null;

  if (actorType === "USER" && input.autoreId === undefined) {
    const { data: userData } = await client.auth.getUser();
    autoreId = userData.user?.id ?? null;
  }

  let companyId = input.companyId ?? null;
  if (!companyId && autoreId) {
    const { data: profile } = await client
      .from("profiles")
      .select("company_id")
      .eq("id", autoreId)
      .maybeSingle();
    companyId = (profile as { company_id?: string | null } | null)?.company_id ?? null;
  }

  return { autoreId, actorType, companyId };
}

export function requireUserActor(actor: ResolvedAuditActor, meta: string): string {
  if (!actor.autoreId) {
    throw new AuditLogWriteError(`autore_id assente per audit ${meta}`);
  }
  return actor.autoreId;
}
