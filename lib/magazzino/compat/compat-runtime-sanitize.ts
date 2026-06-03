import {
  COMPAT_AUTO_REPAIR_ENABLED,
  repairCompatIfNeededSync,
} from "@/lib/magazzino/compat/compat-auto-repair-engine";
import { auditCompatConsistency } from "@/lib/magazzino/compat/compat-consistency-auditor";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";

const warnedAuditKeys = new Set<string>();

function logCompatAuditDev(
  report: ReturnType<typeof auditCompatConsistency>,
  source: string,
): void {
  if (process.env.NODE_ENV === "production") return;
  if (report.status === "ok") return;

  const key = `${source}:${report.ricambioId ?? "unknown"}:${report.issues.join(",")}`;
  if (warnedAuditKeys.has(key)) return;
  warnedAuditKeys.add(key);

  const msg = `[compat-runtime] ${report.status} @ ${source} id=${report.ricambioId ?? "?"} issues=${report.issues.join(",")}`;
  const benignLegacyOnly =
    report.status === "warn" &&
    report.issues.length === 1 &&
    report.issues[0] === "legacy_not_derivable" &&
    report.diff.orphanCount === 0;
  if (report.status === "warn" && !benignLegacyOnly) console.warn(msg, report.diff);
  else if (report.status === "warn") console.debug(msg, report.diff);
  else console.debug(msg, report.diff);
}

/** @internal Solo test. */
export function resetCompatRuntimeAuditWarningsForTest(): void {
  warnedAuditKeys.clear();
}

export function sanitizeCompatRicambioUi(
  ricambio: RicambioMagazzino,
  liste: MezziListePrefs | undefined,
  source: string,
): RicambioMagazzino {
  const report = auditCompatConsistency(ricambio, liste, source);
  logCompatAuditDev(report, source);

  if (COMPAT_AUTO_REPAIR_ENABLED && report.status === "repairable") {
    const { ricambio: repaired } = repairCompatIfNeededSync(ricambio, liste, { source });
    return repaired;
  }

  return ricambio;
}

export function sanitizeCompatRicambioUiBatch(
  list: readonly RicambioMagazzino[],
  liste: MezziListePrefs | undefined,
  source: string,
): RicambioMagazzino[] {
  return list.map((r) => sanitizeCompatRicambioUi(r, liste, source));
}

/** Audit non-blocking in background (DEV log + optional repair flag via sanitize on next read). */
export function scheduleCompatBackgroundAudit(
  list: readonly RicambioMagazzino[],
  liste: MezziListePrefs | undefined,
  source: string,
): void {
  if (list.length === 0) return;

  const run = () => {
    for (const r of list) {
      const report = auditCompatConsistency(r, liste, source);
      logCompatAuditDev(report, source);
    }
  };

  if (typeof queueMicrotask === "function") {
    queueMicrotask(run);
  } else {
    setTimeout(run, 0);
  }
}
