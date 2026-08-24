/**
 * Smoke post-fix: stock_apply_movement con delta reale (+1 poi -1).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function env(k: string): string {
  const raw = readFileSync(".env.local", "utf8");
  const m = raw.match(new RegExp(`^${k}=(.+)$`, "m"));
  if (!m?.[1]) throw new Error(`Missing ${k} in .env.local`);
  return m[1].trim();
}

async function adjust(
  sb: SupabaseClient,
  ricambioId: string,
  stockVersion: number,
  delta: number,
): Promise<{ ok: boolean; quantita?: number; stockVersion?: number; error?: string }> {
  const { data, error } = await (sb as SupabaseClient).rpc(
    "stock_apply_movement" as never,
    {
      p_ricambio_id: ricambioId,
      p_delta: delta,
      p_expected_version: stockVersion,
      p_operation_id: crypto.randomUUID(),
      p_origine: "manual_adjustment",
      p_causale: delta > 0 ? "carico_manuale" : "scarico_manuale",
      p_conta_statistiche: true,
      p_lavorazione_id: null,
      p_meta: {},
    } as never,
  );
  if (error) return { ok: false, error: error.message };
  const row = data as { quantita?: number; stock_version?: number };
  return {
    ok: true,
    quantita: Number(row.quantita),
    stockVersion: Number(row.stock_version),
  };
}

async function main(): Promise<void> {
  const sb = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const { data: rows } = await sb.from("magazzino_ricambi").select("id,quantita,stock_version").limit(1);
  const ric = rows?.[0];
  if (!ric) throw new Error("no ricambio");

  const before = Number(ric.quantita);
  const v0 = Number(ric.stock_version ?? 0);

  const up = await adjust(sb, ric.id, v0, 1);
  if (!up.ok) {
    console.error("UP_FAIL", up.error);
    process.exit(1);
  }

  const down = await adjust(sb, ric.id, up.stockVersion ?? v0 + 1, -1);
  if (!down.ok) {
    console.error("DOWN_FAIL", down.error);
    process.exit(1);
  }

  const ok = up.quantita === before + 1 && down.quantita === before;
  console.log(
    JSON.stringify(
      {
        ricambioId: ric.id,
        before,
        afterUp: up.quantita,
        afterDown: down.quantita,
        pass: ok,
      },
      null,
      2,
    ),
  );
  if (!ok) process.exit(1);
}

void main();
