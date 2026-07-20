import type {
  OperationalDiaryCategory,
  OperationalDiaryEntry,
} from "@/lib/operational-intelligence/types";

const CATEGORY_PATTERNS: { category: OperationalDiaryCategory; patterns: RegExp[] }[] = [
  { category: "supplier", patterns: [/ricambio/i, /fornitore/i, /ordine/i, /consegna/i, /pompa/i] },
  { category: "machine", patterns: [/mezzo/i, /spazzatrice/i, /macchina/i, /veicolo/i, /targa/i] },
  { category: "customer", patterns: [/cliente/i, /commessa/i] },
  { category: "staff", patterns: [/dipendente/i, /operatore/i, /personale/i, /assenza/i] },
  { category: "improvement", patterns: [/miglior/i, /risolto/i, /completato/i, /ottimizz/i] },
  { category: "warning", patterns: [/attenzione/i, /monitorare/i, /verificare/i] },
  { category: "issue", patterns: [/problema/i, /guasto/i, /fermo/i, /rotto/i, /errore/i] },
];

const HIGH_SEVERITY = [/critico/i, /urgente/i, /fermo/i, /guasto/i, /scadut/i];
const MEDIUM_SEVERITY = [/attenzione/i, /ritardo/i, /problema/i, /attesa/i];

/** ponytail: heuristic keyword classifier — upgrade path: DB columns P2 */
export function classifyDiaryEntry(
  workDate: string,
  text: string,
  id?: string,
): OperationalDiaryEntry {
  const trimmed = text.trim();
  let category: OperationalDiaryCategory = "issue";
  for (const { category: cat, patterns } of CATEGORY_PATTERNS) {
    if (patterns.some((p) => p.test(trimmed))) {
      category = cat;
      break;
    }
  }

  let severity: "low" | "medium" | "high" = "low";
  if (HIGH_SEVERITY.some((p) => p.test(trimmed))) severity = "high";
  else if (MEDIUM_SEVERITY.some((p) => p.test(trimmed))) severity = "medium";

  return {
    id,
    workDate,
    text: trimmed,
    category,
    severity,
    source: "user",
  };
}
