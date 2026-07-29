#!/usr/bin/env npx tsx
/**
 * Ripara compatibilitaRefs orfani (fleet-* / ID disallineati) su magazzino_ricambi.
 * Usage: npx tsx scripts/repair-magazzino-compat-refs.ts [--apply]
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  attrezzatureCatalogToHierarchyTree,
  fetchAttrezzatureCatalogEntries,
  resolveMezziListeWithFleetCatalog,
} from "@/lib/attrezzature/attrezzature-catalog";
import { migrateMezziListePrefs } from "@/lib/mezzi/attrezzature-prefs";
import { createMezziListePrefsDefault } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { auditCompatConsistency } from "@/lib/magazzino/compat/compat-consistency-auditor";
import { writeCompatibilitaRicambio, legacyToSSOTWriteAdapter } from "@/lib/magazzino/compat/compat-write-gate";
import { parseMagazzinoRicambioMeta } from "@/lib/magazzino/magazzino-meta";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const apply = process.argv.includes("--apply");

async function loadMezziListePrefs(sb: SupabaseClient) {
  const { data, error } = await sb
    .from("app_settings")
    .select("value")
    .eq("module", "mezzi")
    .eq("key", "liste")
    .maybeSingle();
  if (error) throw new Error(error.message);
  const raw = (data as { value: unknown } | null)?.value;
  if (!raw || typeof raw !== "object") return createMezziListePrefsDefault();
  return migrateMezziListePrefs(raw as import("@/lib/mezzi/mezzi-liste-prefs-storage").MezziListePrefs);
}

async function main() {
  if (!url || !key) {
    console.log("SKIP: credenziali Supabase mancanti.");
    process.exit(0);
  }

  const sb = createClient(url, key);
  const mezziListePrefs = await loadMezziListePrefs(sb);
  const fleetTree = attrezzatureCatalogToHierarchyTree(await fetchAttrezzatureCatalogEntries(sb));
  const mezziListe = resolveMezziListeWithFleetCatalog(mezziListePrefs, fleetTree);

  const { data: rows, error } = await sb.from("magazzino_ricambi").select("id, nome, meta");
  if (error) throw new Error(error.message);

  let orphanBefore = 0;
  let repaired = 0;
  let skipped = 0;

  for (const row of rows ?? []) {
    const meta = parseMagazzinoRicambioMeta(row.meta ?? {});
    const refs = meta.compatibilitaRefs ?? [];
    const legacy = meta.compatibilitaMezzi ?? [];
    if (refs.length === 0 && legacy.length === 0) continue;

    const audit = auditCompatConsistency(
      {
        id: row.id,
        compatibilitaRefs: refs,
        compatibilitaMezzi: legacy,
      },
      mezziListe,
      "repair-magazzino-compat-refs",
    );

    if (audit.diff.orphanCount > 0) orphanBefore += 1;

    const hasFleetRef = refs.some(
      (r) => r.marcaId.startsWith("fleet-") || (r.modelloId?.startsWith("fleet-") ?? false),
    );
    const needsRepair =
      audit.diff.orphanCount > 0 ||
      hasFleetRef ||
      audit.issues.includes("refs_legacy_mismatch") ||
      audit.issues.includes("legacy_only_no_refs");

    if (!needsRepair) {
      skipped += 1;
      continue;
    }

    const adapted = legacyToSSOTWriteAdapter(
      {
        compatibilitaRefs: refs,
        compatibilitaMezzi: legacy,
        ricambioId: row.id,
      },
      mezziListe,
    );

    const compatMeta = writeCompatibilitaRicambio(adapted, mezziListe, "repair-magazzino-compat-refs", {
      prefsListe: mezziListePrefs,
      auditPreview: true,
    });

    const afterAudit = auditCompatConsistency(
      {
        id: row.id,
        compatibilitaRefs: compatMeta.compatibilitaRefs ?? [],
        compatibilitaMezzi: compatMeta.compatibilitaMezzi ?? [],
      },
      mezziListe,
    );

    console.log(
      `${apply ? "REPAIR" : "DRY"} ${row.id} ${row.nome}: issues=${audit.issues.join(",") || "ok"} → orphan=${afterAudit.diff.orphanCount}`,
    );

    if (!apply) continue;

    const prevMeta =
      row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
        ? { ...(row.meta as Record<string, unknown>) }
        : {};
    const nextMeta = {
      ...prevMeta,
      compatibilitaRefs: compatMeta.compatibilitaRefs,
      compatibilitaMezzi: compatMeta.compatibilitaMezzi,
    };
    const { error: upErr } = await sb.from("magazzino_ricambi").update({ meta: nextMeta }).eq("id", row.id);
    if (upErr) {
      console.error(`FAIL ${row.id}: ${upErr.message}`);
      continue;
    }
    repaired += 1;
  }

  console.log(
    `\n=== Repair compat refs: orphanBefore=${orphanBefore} repaired=${repaired} skipped=${skipped} mode=${apply ? "apply" : "dry-run"} ===`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
