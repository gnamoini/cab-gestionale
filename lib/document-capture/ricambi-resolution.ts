import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import { resolveRawFieldValue } from "@/lib/document-capture/capture-field-mapper";
import type { RicambiRowResolution } from "@/lib/document-capture/capture-field-resolution-types";
import { findDuplicateByCodici } from "@/lib/magazzino/duplicates";
import { ricambioCodiceForUi } from "@/lib/magazzino/ricambio-codice";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { shouldAutoApply } from "@/lib/entity-resolution/entity-resolution-confidence";

const MAX_RICAMBI_RIGHE = 34;

function normCodice(v: string): string {
  return v.trim().toUpperCase();
}

function fuzzyRicambioCandidates(
  codice: string,
  nome: string,
  magazzino: readonly RicambioMagazzino[],
): Array<{ id: string; label: string; score: number }> {
  const needle = normCodice(codice || nome);
  if (!needle) return [];
  const out: Array<{ id: string; label: string; score: number }> = [];
  for (const r of magazzino) {
    const codes = [r.codiceFornitoreOriginale, r.codiceFornitoreOriginaleSecondario, r.codiceFornitoreNonOriginale]
      .map((c) => ricambioCodiceForUi(String(c)))
      .filter(Boolean)
      .map((c) => normCodice(c));
    const desc = [r.descrizione, r.marca].filter(Boolean).join(" ").toLowerCase();
    let score = 0;
    if (codes.some((c) => c === needle)) score = 1;
    else if (codes.some((c) => c.includes(needle) || needle.includes(c))) score = 0.85;
    else if (desc && desc.includes(nome.toLowerCase().trim())) score = 0.7;
    if (score > 0) {
      const codiceUi = ricambioCodiceForUi(r.codiceFornitoreOriginale);
      const labelParts = [codiceUi, r.descrizione].filter(Boolean);
      out.push({
        id: r.id,
        label: labelParts.join(" — "),
        score,
      });
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 5);
}

/** ponytail: heuristic ricambi match — upgrade path: reuse entity-resolver RICAMBIO graph. */
export function resolveRicambiRowsFromCaptureFields(
  fields: readonly CaptureFieldRow[],
  magazzino: readonly RicambioMagazzino[],
): RicambiRowResolution[] {
  const out: RicambiRowResolution[] = [];
  for (let n = 1; n <= MAX_RICAMBI_RIGHE; n += 1) {
    const codice = resolveRawFieldValue(fields, `riga_${n}_codice`);
    const nome = resolveRawFieldValue(fields, `riga_${n}_nome`);
    const descrizione = resolveRawFieldValue(fields, `riga_${n}_descrizione`);
    if (!codice && !nome && !descrizione) continue;

    const fieldKey = `riga_${n}_codice`;
    const dup = codice && magazzino.length ? findDuplicateByCodici([...magazzino], codice) : null;
    if (dup) {
      out.push({
        rowIndex: n,
        fieldKey,
        status: "MATCHED",
        ricambioId: dup.id,
        label: dup.descrizione || ricambioCodiceForUi(dup.codiceFornitoreOriginale) || codice,
        confidence: 1,
      });
      continue;
    }

    const candidates = fuzzyRicambioCandidates(codice, nome || descrizione, magazzino);
    const top = candidates[0];
    const second = candidates[1]?.score ?? 0;
    if (
      top &&
      shouldAutoApply("RICAMBIO", top.score, top.score, second)
    ) {
      out.push({
        rowIndex: n,
        fieldKey,
        status: "MATCHED",
        ricambioId: top.id,
        label: top.label,
        confidence: top.score,
      });
      continue;
    }

    if (candidates.length >= 2 && top && top.score - second < 0.2) {
      out.push({
        rowIndex: n,
        fieldKey,
        status: "AMBIGUOUS",
        ricambioId: null,
        label: codice || nome || descrizione,
        confidence: top.score,
        candidates,
      });
      continue;
    }

    out.push({
      rowIndex: n,
      fieldKey,
      status: "NOT_FOUND",
      ricambioId: null,
      label: codice || nome || descrizione,
      confidence: 0,
      candidates: candidates.length ? candidates : undefined,
    });
  }
  return out;
}

export function ricambiResolutionBlocksApply(rows: readonly RicambiRowResolution[]): boolean {
  return rows.some((r) => r.status === "AMBIGUOUS" || r.status === "NOT_FOUND");
}

/** NOT_FOUND non può essere bypassato con forceReview — operatore deve correggere o escludere la riga. */
export function ricambiNotFoundBlocksForceReview(rows: readonly RicambiRowResolution[]): boolean {
  return rows.some((r) => r.status === "NOT_FOUND");
}
