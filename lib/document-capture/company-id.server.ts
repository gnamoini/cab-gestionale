import "server-only";

import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export class CompanyNotConfiguredError extends Error {
  readonly code = "TENANT_MISSING" as const;
  readonly status = 403 as const;

  constructor() {
    super("Tenant non configurato per l'utente");
    this.name = "CompanyNotConfiguredError";
  }
}

export async function requireCompanyIdForUser(): Promise<string> {
  const sb = await createSupabaseServerUserClient();
  const { data: userData, error: userError } = await sb.auth.getUser();
  if (userError || !userData.user) {
    throw new CompanyNotConfiguredError();
  }

  const { data, error } = await sb
    .from("profiles")
    .select("company_id")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (error || !data?.company_id) {
    throw new CompanyNotConfiguredError();
  }

  return data.company_id;
}

export async function getCompanyIdForUserOrNull(): Promise<string | null> {
  try {
    return await requireCompanyIdForUser();
  } catch {
    return null;
  }
}
