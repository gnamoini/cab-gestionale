import { auditCompatConsistency, type CompatAuditReport } from "@/lib/magazzino/compat/compat-consistency-auditor";
import { healMagazzinoCompatBatch } from "@/lib/magazzino/compat/compat-auto-heal";
import { readCompatLabelsForUi } from "@/lib/magazzino/compat/compat-read-guard";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

/** Feature flag — repair in-memory runtime (default off). */
export const COMPAT_AUTO_REPAIR_ENABLED = process.env.NEXT_PUBLIC_COMPAT_AUTO_REPAIR === "1";

export type CompatRepairResult = {
  ricambio: RicambioMagazzino;
  report: CompatAuditReport;
  changed: boolean;
};

export type CompatRepairOpts = {
  source?: string;
  /** Persist esplicito su DB — default false. */
  persist?: boolean;
  /** Riga DB per persist (richiesta se persist=true). */
  row?: MagazzinoRicambioRow;
};

function applySuggestedFix(ricambio: RicambioMagazzino, report: CompatAuditReport, liste?: MezziListePrefs): RicambioMagazzino {
  const fix = report.suggestedFix;
  if (!fix) return ricambio;

  const next: RicambioMagazzino = {
    ...ricambio,
    compatibilitaRefs: fix.compatibilitaRefs,
    compatibilitaMezzi: fix.compatibilitaMezzi ?? [],
  };

  if (liste) {
    next.compatibilitaMezzi = readCompatLabelsForUi(
      next,
      liste,
      "compat-auto-repair-engine.applySuggestedFix",
    );
  }

  return next;
}

export function simulateRepair(
  ricambio: RicambioMagazzino,
  liste?: MezziListePrefs,
  source = "compat-auto-repair-engine.simulateRepair",
): CompatRepairResult {
  const report = auditCompatConsistency(ricambio, liste, source);
  return { ricambio, report, changed: false };
}

/** Repair in-memory; persist solo se opts.persist + row. */
export async function repairCompatIfNeeded(
  ricambio: RicambioMagazzino,
  liste?: MezziListePrefs,
  opts?: CompatRepairOpts,
): Promise<CompatRepairResult> {
  const source = opts?.source ?? "compat-auto-repair-engine.repairCompatIfNeeded";
  const report = auditCompatConsistency(ricambio, liste, source);

  if (report.status === "ok") {
    return { ricambio, report, changed: false };
  }

  if (report.status === "warn" && !report.suggestedFix) {
    return { ricambio, report, changed: false };
  }

  if (!report.suggestedFix) {
    return { ricambio, report, changed: false };
  }

  const repaired = applySuggestedFix(ricambio, report, liste);
  const changed =
    repaired.compatibilitaMezzi.join("\0") !== ricambio.compatibilitaMezzi.join("\0") ||
    JSON.stringify(repaired.compatibilitaRefs ?? []) !== JSON.stringify(ricambio.compatibilitaRefs ?? []);

  if (opts?.persist && opts.row && liste && changed) {
    await healMagazzinoCompatBatch([opts.row], liste, { dryRun: false });
  }

  return { ricambio: repaired, report, changed };
}

export function repairCompatIfNeededSync(
  ricambio: RicambioMagazzino,
  liste?: MezziListePrefs,
  opts?: Omit<CompatRepairOpts, "persist" | "row">,
): CompatRepairResult {
  const source = opts?.source ?? "compat-auto-repair-engine.repairCompatIfNeededSync";
  const report = auditCompatConsistency(ricambio, liste, source);

  if (report.status === "ok") {
    return { ricambio, report, changed: false };
  }

  if (!report.suggestedFix) {
    return { ricambio, report, changed: false };
  }

  if (report.status === "warn" && report.issues.includes("orphan_refs") && !report.issues.includes("refs_legacy_mismatch")) {
    const onlyOrphan = report.issues.every((i) => i === "orphan_refs");
    if (onlyOrphan) {
      return { ricambio, report, changed: false };
    }
  }

  const repaired = applySuggestedFix(ricambio, report, liste);
  const changed =
    repaired.compatibilitaMezzi.join("\0") !== ricambio.compatibilitaMezzi.join("\0") ||
    JSON.stringify(repaired.compatibilitaRefs ?? []) !== JSON.stringify(ricambio.compatibilitaRefs ?? []);

  return { ricambio: repaired, report, changed };
}

export function repairBatchCompat(
  list: readonly RicambioMagazzino[],
  liste?: MezziListePrefs,
  opts?: Omit<CompatRepairOpts, "persist" | "row">,
): CompatRepairResult[] {
  return list.map((r) => repairCompatIfNeededSync(r, liste, opts));
}
