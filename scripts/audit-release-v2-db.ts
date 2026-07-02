#!/usr/bin/env npx tsx
/**
 * Audit DB pre/post deploy V2 + gate R4.
 * Usage:
 *   npx tsx scripts/audit-release-v2-db.ts [--strict] [--r4-ready] [--json]
 */
import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { scanProductionReadinessCode } from "@/lib/production/production-readiness-scan";

type Finding = { code: string; count: number; sample?: string[]; blocking: boolean };

const args = new Set(process.argv.slice(2));
const strict = args.has("--strict");
const r4Ready = args.has("--r4-ready");
const asJson = args.has("--json");

function legacyColValued(v: unknown): boolean {
  const t = String(v ?? "").trim();
  return Boolean(t && t !== "—" && t.toLowerCase() !== "non assegnata");
}

async function runDbChecks(sb: SupabaseClient): Promise<Finding[]> {
  const findings: Finding[] = [];

  const { data: mezzi } = await sb.from("mezzi").select("id");
  const { data: attrezzature } = await sb.from("attrezzature").select("id, mezzo_id, matricola");
  const mezzoIds = new Set((mezzi ?? []).map((m) => (m as { id: string }).id));
  const attByMezzo = new Map<string, number>();
  for (const a of attrezzature ?? []) {
    const row = a as { mezzo_id: string };
    attByMezzo.set(row.mezzo_id, (attByMezzo.get(row.mezzo_id) ?? 0) + 1);
  }
  const mezziSenzaAtt = (mezzi ?? [])
    .filter((m) => !attByMezzo.has((m as { id: string }).id))
    .map((m) => (m as { id: string }).id);
  findings.push({
    code: "mezzi_senza_attrezzatura",
    count: mezziSenzaAtt.length,
    sample: mezziSenzaAtt.slice(0, 20),
    blocking: mezziSenzaAtt.length > 0,
  });

  const attOrphan = (attrezzature ?? [])
    .filter((a) => !mezzoIds.has((a as { mezzo_id: string }).mezzo_id))
    .map((a) => (a as { id: string }).id);
  findings.push({
    code: "attrezzature_orphan",
    count: attOrphan.length,
    sample: attOrphan.slice(0, 20),
    blocking: attOrphan.length > 0,
  });

  const { data: lavBad } = await sb
    .from("lavorazioni")
    .select("id, mezzo_id, attrezzatura_id")
    .not("attrezzatura_id", "is", null);
  const attMap = new Map(
    (attrezzature ?? []).map((a) => [(a as { id: string }).id, a as { mezzo_id: string }]),
  );
  const lavInvalid = (lavBad ?? [])
    .filter((l) => {
      const row = l as { attrezzatura_id: string; mezzo_id: string | null };
      const att = attMap.get(row.attrezzatura_id);
      return !att || att.mezzo_id !== row.mezzo_id;
    })
    .map((l) => (l as { id: string }).id);
  findings.push({
    code: "lavorazioni_attrezzatura_id_invalido",
    count: lavInvalid.length,
    sample: lavInvalid.slice(0, 20),
    blocking: lavInvalid.length > 0,
  });

  const { data: mezziLegacy } = await sb
    .from("mezzi")
    .select("id, marca, modello, matricola, tipo_attrezzatura");
  const legacyValued = (mezziLegacy ?? [])
    .filter((m) => {
      const row = m as Record<string, unknown>;
      return (
        legacyColValued(row.marca) ||
        legacyColValued(row.modello) ||
        legacyColValued(row.matricola) ||
        legacyColValued(row.tipo_attrezzatura)
      );
    })
    .map((m) => (m as { id: string }).id);
  findings.push({
    code: "mezzi_legacy_cols_valorizzate",
    count: legacyValued.length,
    sample: legacyValued.slice(0, 20),
    blocking: r4Ready && legacyValued.length > 0,
  });

  const matCounts = new Map<string, string[]>();
  for (const a of attrezzature ?? []) {
    const row = a as { id: string; matricola: string | null };
    const mat = row.matricola?.trim();
    if (!mat) continue;
    const key = mat.toLowerCase();
    const list = matCounts.get(key) ?? [];
    list.push(row.id);
    matCounts.set(key, list);
  }
  const dupMat = [...matCounts.entries()].filter(([, ids]) => ids.length > 1);
  findings.push({
    code: "attrezzature_matricola_duplicata",
    count: dupMat.length,
    sample: dupMat.slice(0, 10).map(([k, ids]) => `${k}:${ids.length}`),
    blocking: false,
  });

  return findings;
}

function runCodeChecks(repoRoot: string): Finding[] {
  const findings: Finding[] = [];
  const scan = scanProductionReadinessCode(repoRoot);

  findings.push({
    code: "legacy_mezzi_column_write_hits",
    count: scan.legacyMezziColumnWriteHits.length,
    sample: scan.legacyMezziColumnWriteHits.slice(0, 10).map((h) => `${h.file}:${h.line}`),
    blocking: scan.legacyMezziColumnWriteHits.length > 0,
  });
  findings.push({
    code: "legacy_adapter_import_outside_allowlist",
    count: scan.legacyAdapterImportOutsideAllowlist.length,
    sample: scan.legacyAdapterImportOutsideAllowlist.slice(0, 10).map((h) => `${h.file}:${h.line}`),
    blocking: scan.legacyAdapterImportOutsideAllowlist.length > 0,
  });

  const importPlugin = fs.readFileSync(
    path.join(repoRoot, "lib/data-import/entities/mezzi/mezzi-import.plugin.server.ts"),
    "utf8",
  );
  const importUsesLegacyMatricola =
    /from\("mezzi"\)\.select\("[^"]*matricola/.test(importPlugin) &&
    !/from\("attrezzature"\)/.test(importPlugin.slice(0, importPlugin.indexOf("buildPreview") + 800));
  findings.push({
    code: "import_preview_solo_mezzi_matricola",
    count: importUsesLegacyMatricola ? 1 : 0,
    blocking: r4Ready && importUsesLegacyMatricola,
  });

  return findings;
}

async function main() {
  const repoRoot = process.cwd();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  const codeFindings = runCodeChecks(repoRoot);
  let dbFindings: Finding[] = [];

  if (!url || !key) {
    dbFindings.push({
      code: "db_skip_no_credentials",
      count: 1,
      blocking: strict || r4Ready,
    });
  } else {
    const sb = createClient(url, key);
    dbFindings = await runDbChecks(sb);
  }

  if (r4Ready) {
    try {
      const { execSync } = await import("node:child_process");
      execSync("npx tsx lib/regression/attrezzature-v2-production-gate.test.ts", {
        cwd: repoRoot,
        stdio: "pipe",
      });
    } catch {
      codeFindings.push({
        code: "attrezzature_v2_production_gate",
        count: 1,
        blocking: true,
      });
    }
  }

  const all = [...dbFindings, ...codeFindings];
  const blockers = all.filter((f) => f.blocking);

  if (asJson) {
    console.log(JSON.stringify({ blockers: blockers.length, findings: all }, null, 2));
  } else {
    console.log("=== Audit Release V2 DB ===");
    for (const f of all) {
      console.log(`${f.blocking ? "BLOCK" : "WARN "} ${f.code}: ${f.count}`);
      if (f.sample?.length) console.log(`  sample: ${f.sample.join(", ")}`);
    }
    console.log(`\nBlockers: ${blockers.length}`);
  }

  if ((strict || r4Ready) && blockers.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
