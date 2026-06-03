import {
  buildCompatMetaForSave,
  compatRefsFromExpandedLabels,
  diffCompatLegacy,
} from "@/lib/magazzino/compat/build-compat-meta";
import { normalizeCompatList } from "@/lib/magazzino/compat/compat-normalize";
import { resolveCompatibilitaRicambio } from "@/lib/magazzino/compat/resolve-compatibilita-ricambio";
import {
  detectLegacyWriteRisk,
  legacyToSSOTWriteAdapter,
  writeCompatibilitaRicambio,
} from "@/lib/magazzino/compat/compat-write-gate";
import type { MagazzinoRicambioMeta } from "@/lib/magazzino/magazzino-meta";
import type { CompatInput } from "@/lib/magazzino/compat/compat-types";
import {
  dedupeCompatRefs,
  type RicambioCompatRef,
} from "@/lib/magazzino/ricambio-compat-resolver";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";

export type CompatAuditStatus = "ok" | "warn" | "repairable";

export type CompatAuditIssue =
  | "refs_legacy_mismatch"
  | "legacy_only_no_refs"
  | "orphan_refs"
  | "duplicate_refs"
  | "legacy_not_derivable";

export type CompatAuditInput = CompatInput & { id?: string };

export type CompatAuditReport = {
  status: CompatAuditStatus;
  ricambioId?: string;
  issues: CompatAuditIssue[];
  diff: {
    storedLegacy: string[];
    expectedLegacy: string[];
    storedRefs: RicambioCompatRef[];
    orphanCount: number;
  };
  suggestedFix?: Pick<MagazzinoRicambioMeta, "compatibilitaRefs" | "compatibilitaMezzi">;
};

function deriveStatus(issues: CompatAuditIssue[]): CompatAuditStatus {
  if (issues.length === 0) return "ok";
  const repairableIssues: CompatAuditIssue[] = [
    "refs_legacy_mismatch",
    "legacy_only_no_refs",
    "duplicate_refs",
  ];
  if (issues.some((i) => repairableIssues.includes(i))) return "repairable";
  return "warn";
}

function computeSuggestedFix(
  ricambio: CompatAuditInput,
  liste: MezziListePrefs | undefined,
  issues: CompatAuditIssue[],
  source: string,
): Pick<MagazzinoRicambioMeta, "compatibilitaRefs" | "compatibilitaMezzi"> | undefined {
  if (!liste) return undefined;
  if (issues.includes("legacy_not_derivable")) return undefined;

  const storedLegacy = normalizeCompatList(ricambio.compatibilitaMezzi ?? []);
  const storedRefs = ricambio.compatibilitaRefs?.length ? dedupeCompatRefs(ricambio.compatibilitaRefs) : [];

  if (
    issues.includes("refs_legacy_mismatch") ||
    issues.includes("duplicate_refs") ||
    (issues.includes("orphan_refs") && issues.includes("refs_legacy_mismatch"))
  ) {
    if (storedRefs.length === 0) return undefined;
    return writeCompatibilitaRicambio(
      { compatibilitaRefs: storedRefs, compatibilitaMezzi: storedLegacy, ricambioId: ricambio.id },
      liste,
      `${source}.suggestedFix.refsFirst`,
      { auditPreview: true },
    );
  }

  if (issues.includes("legacy_only_no_refs") && storedLegacy.length > 0) {
    const adapted = legacyToSSOTWriteAdapter(
      { compatibilitaMezzi: storedLegacy, ricambioId: ricambio.id },
      liste,
    );
    const inferred = adapted.compatibilitaRefs ?? [];
    if (inferred.length === 0) return undefined;
    return writeCompatibilitaRicambio(adapted, liste, `${source}.suggestedFix.legacyInfer`, {
      auditPreview: true,
    });
  }

  return undefined;
}

/** Audit coerenza refs/legacy su modello UI ricambio. */
export function auditCompatConsistency(
  ricambio: CompatAuditInput,
  liste?: MezziListePrefs,
  source = "compat-consistency-auditor.auditCompatConsistency",
): CompatAuditReport {
  const issues: CompatAuditIssue[] = [];
  const storedLegacy = normalizeCompatList(ricambio.compatibilitaMezzi ?? []);
  const rawRefs = ricambio.compatibilitaRefs ?? [];
  const storedRefs = rawRefs.length ? dedupeCompatRefs(rawRefs) : [];
  let expectedLegacy = storedLegacy;
  let orphanCount = 0;

  if (rawRefs.length > 0 && storedRefs.length !== rawRefs.length) {
    issues.push("duplicate_refs");
  }

  const writeRisk = detectLegacyWriteRisk(
    { compatibilitaMezzi: storedLegacy, compatibilitaRefs: storedRefs },
    liste,
  );
  if (writeRisk.risk === "legacy_mismatch_refs") {
    issues.push("refs_legacy_mismatch");
  } else if (writeRisk.risk === "missing_mezzi_liste" && storedLegacy.length > 0 && storedRefs.length === 0) {
    issues.push("legacy_not_derivable");
  } else if (writeRisk.risk === "legacy_only" && storedLegacy.length > 0 && storedRefs.length === 0) {
    if (liste) {
      const inferred = compatRefsFromExpandedLabels(storedLegacy, liste);
      if (inferred.length > 0) {
        issues.push("legacy_only_no_refs");
      } else {
        issues.push("legacy_not_derivable");
      }
    } else {
      issues.push("legacy_only_no_refs");
    }
  }

  if (liste) {
    const resolved = resolveCompatibilitaRicambio(
      { compatibilitaMezzi: storedLegacy, compatibilitaRefs: storedRefs },
      liste,
    );
    orphanCount = resolved.orphanLabels.length;
    if (orphanCount > 0) {
      issues.push("orphan_refs");
    }

    if (storedRefs.length > 0) {
      expectedLegacy = buildCompatMetaForSave(storedRefs, liste).compatibilitaMezzi ?? [];
    }
  } else if (storedRefs.length > 0 && storedLegacy.length > 0) {
    issues.push("refs_legacy_mismatch");
  }

  if (liste && storedRefs.length > 0) {
    const { mismatch } = diffCompatLegacy(storedRefs, storedLegacy, liste);
    if (mismatch && !issues.includes("refs_legacy_mismatch")) {
      issues.push("refs_legacy_mismatch");
    }
    if (mismatch) {
      expectedLegacy = diffCompatLegacy(storedRefs, storedLegacy, liste).expected;
    }
  }

  const status = deriveStatus(issues);
  const suggestedFix = computeSuggestedFix(ricambio, liste, issues, source);

  return {
    status,
    ricambioId: ricambio.id,
    issues: [...new Set(issues)],
    diff: {
      storedLegacy,
      expectedLegacy,
      storedRefs,
      orphanCount,
    },
    suggestedFix,
  };
}

export function auditCompatBatch(
  list: readonly CompatAuditInput[],
  liste?: MezziListePrefs,
  source?: string,
): CompatAuditReport[] {
  return list.map((r) => auditCompatConsistency(r, liste, source));
}
