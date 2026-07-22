/**
 * Audit link mezzo ↔ scheda ingresso (report only).
 * Uso: npx tsx scripts/mezzo-scheda-link-audit.ts [--out report.json]
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";

type AuditStatus = "ok" | "ident_mismatch" | "mezzo_missing" | "ambiguous_match";

type AuditRow = {
  lavorazioneId: string;
  mezzoId: string | null;
  status: AuditStatus;
  schedaTarga: string;
  schedaMatricola: string;
  schedaScuderia: string;
  mezzoTarga: string;
  mezzoMatricola: string;
  mezzoScuderia: string;
};

function norm(v: string | null | undefined): string {
  return (v ?? "").trim().toLowerCase();
}

function identKey(targa: string, matricola: string, scuderia: string): string {
  return [norm(targa), norm(matricola), norm(scuderia)].filter(Boolean).join("|");
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.log("SKIP: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY non configurati.");
    process.exit(0);
  }

  const sb = createClient(url, key);
  const { data: schede, error } = await sb
    .from("scheda_lavorazione")
    .select("id, lavorazione_id, campi, lavorazioni(mezzo_id, mezzi(targa, numero_scuderia, attrezzature(matricola)))")
    .eq("tipo", "ingresso")
    .limit(5000);
  if (error) throw error;

  const rows: AuditRow[] = [];
  for (const s of schede ?? []) {
    const campi = (s.campi ?? {}) as Record<string, string>;
    const lav = s.lavorazioni as {
      mezzo_id?: string | null;
      mezzi?: {
        targa?: string | null;
        numero_scuderia?: string | null;
        attrezzature?: { matricola?: string | null }[];
      } | null;
    } | null;
    const mezzoId = lav?.mezzo_id ?? null;
    const mezzo = lav?.mezzi;
    const attMat = mezzo?.attrezzature?.[0]?.matricola ?? "";
    const schedaTarga = campi.targa ?? "";
    const schedaMatricola = campi.matricola ?? "";
    const schedaScuderia = campi.nScuderia ?? "";
    const mezzoTarga = mezzo?.targa ?? "";
    const mezzoMatricola = attMat;
    const mezzoScuderia = mezzo?.numero_scuderia ?? "";

    let status: AuditStatus = "ok";
    if (!mezzoId) status = "mezzo_missing";
    else if (identKey(schedaTarga, schedaMatricola, schedaScuderia) !== identKey(mezzoTarga, mezzoMatricola, mezzoScuderia)) {
      status = "ident_mismatch";
    }

    rows.push({
      lavorazioneId: s.lavorazione_id,
      mezzoId,
      status,
      schedaTarga,
      schedaMatricola,
      schedaScuderia,
      mezzoTarga,
      mezzoMatricola,
      mezzoScuderia,
    });
  }

  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const outPath = process.argv.includes("--out")
    ? process.argv[process.argv.indexOf("--out") + 1] ?? "mezzo-scheda-link-audit-report.json"
    : "mezzo-scheda-link-audit-report.json";

  writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), counts, rows }, null, 2));
  console.log(`Wrote ${outPath} (${rows.length} rows)`);
  console.log(JSON.stringify(counts, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
