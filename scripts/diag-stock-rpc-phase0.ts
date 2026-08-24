/**
 * Fase 0 gate — diagnostica stock_apply_movement overload + RPC 9-arg.
 * ponytail: script one-shot diagnosi; non parte della suite CI.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function env(k: string): string {
  const raw = readFileSync(".env.local", "utf8");
  const m = raw.match(new RegExp(`^${k}=(.+)$`, "m"));
  if (!m?.[1]) throw new Error(`Missing ${k} in .env.local`);
  return m[1].trim();
}

async function main(): Promise<void> {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const sb = createClient(url, serviceKey);

  const { data: rows, error: listErr } = await sb
    .from("magazzino_ricambi")
    .select("id,quantita,stock_version")
    .limit(1);

  if (listErr || !rows?.[0]) {
    console.error("LIST_ERR", listErr);
    process.exit(1);
  }

  const ric = rows[0];
  const op = crypto.randomUUID();
  const { data, error } = await (sb as SupabaseClient).rpc(
    "stock_apply_movement" as never,
    {
      p_ricambio_id: ric.id,
      p_delta: 0,
      p_expected_version: ric.stock_version ?? 0,
      p_operation_id: op,
      p_origine: "manual_adjustment",
      p_causale: null,
      p_conta_statistiche: true,
      p_lavorazione_id: null,
      p_meta: {},
    } as never,
  );

  console.log(
    JSON.stringify(
      {
        phase: "rpc_9_named_params_service_role",
        ricambioId: ric.id,
        stock_version: ric.stock_version,
        data,
        error: error
          ? { message: error.message, code: error.code, details: error.details, hint: error.hint }
          : null,
      },
      null,
      2,
    ),
  );
}

void main();
