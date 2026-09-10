import "server-only";

import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export async function vat_admin_create_code(payload: Record<string, unknown>) {
  const supabase = await createSupabaseServerUserClient();
  const { data, error } = await supabase.rpc("vat_admin_create_code", { p_payload: payload });
  if (error) throw new Error(error.message);
  return data as { vat_code_id: string; configuration_id: string };
}

export async function vat_admin_create_configuration_version(payload: Record<string, unknown>) {
  const supabase = await createSupabaseServerUserClient();
  const { data, error } = await supabase.rpc("vat_admin_create_configuration_version", { p_payload: payload });
  if (error) throw new Error(error.message);
  return data as { configuration_id: string };
}

export async function vat_list_configurations() {
  const supabase = await createSupabaseServerUserClient();
  const { data, error } = await supabase
    .from("vat_codes")
    .select(
      "id, code, active, vat_code_configurations(id, description, rate, direction, valid_from, valid_to, active, vat_natures(code), vat_operation_types(code))",
    )
    .order("code");
  if (error) throw new Error(error.message);
  return data ?? [];
}
