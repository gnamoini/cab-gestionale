/**
 * Post-migration: scrive in log_modifiche i conflitti note SSOT da audit_note_ssot_conflicts.
 * Uso: npx tsx scripts/migrate-note-ssot-audit.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Richiede NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

type ConflictRow = {
  id: string;
  lavorazione_id: string;
  lavorazione_note: string | null;
  scheda_note: string | null;
  resolution: string;
};

async function main() {
  const { data: rows, error } = await supabase
    .from("audit_note_ssot_conflicts")
    .select("id,lavorazione_id,lavorazione_note,scheda_note,resolution");

  if (error) {
    console.error("Lettura audit_note_ssot_conflicts fallita:", error.message);
    process.exit(1);
  }

  const conflicts = (rows ?? []) as ConflictRow[];
  if (conflicts.length === 0) {
    console.log("Nessun conflitto note SSOT da registrare.");
    return;
  }

  for (const row of conflicts) {
    const payload = {
      source: "migration_note_ssot",
      resolution: row.resolution,
      scheda_note: row.scheda_note,
      lavorazione_note: row.lavorazione_note,
    };
    const { error: logErr } = await supabase.from("log_modifiche").insert({
      entita: "lavorazioni",
      entita_id: row.lavorazione_id,
      operazione: "aggiornamento",
      riepilogo: "Migrazione note SSOT: valore scheda ignorato (vince lavorazioni.note)",
      payload,
    });
    if (logErr) {
      console.error(`log_modifiche fallito per ${row.lavorazione_id}:`, logErr.message);
      process.exit(1);
    }
  }

  console.log(`Registrati ${conflicts.length} eventi log_modifiche per migrazione note SSOT.`);
}

void main();
