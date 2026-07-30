import { parseCompatMarcaModello } from "@/lib/mezzi/attrezzature-prefs";
import { normalizeCompatList } from "@/lib/magazzino/compat/compat-normalize";

/** Nessuna compat esplicita = universale (vedi compat-normalize.isRicambioCompatUniversal). */
export const COMPAT_UNIVERSAL_LABEL = "Compatibilità universale";

function compactKeyPart(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

/** Chiave dedupe: stessa marca+modello con spazi diversi (es. «500 ET» vs «500ET»). */
export function compatLabelDedupeKey(label: string): string {
  const { marca, modello } = parseCompatMarcaModello(label.trim());
  const m = marca.trim();
  if (m && modello.trim()) return `${compactKeyPart(m)}|${compactKeyPart(modello)}`;
  if (m) return `${compactKeyPart(m)}|*`;
  return compactKeyPart(label);
}

/** Chiave dedupe su testo già formattato per UI (`Marca Modello` / universale). */
export function compatDisplayDedupeKey(displayLine: string): string {
  const t = displayLine.trim();
  const uni = t.match(/^(.+?)\s+\(universale\)$/i);
  if (uni) return `${compactKeyPart(uni[1]!)}|*`;
  return compactKeyPart(t);
}

export function dedupeCompatLabels(labels: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const label of labels) {
    const k = compatLabelDedupeKey(label);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(label);
  }
  return out;
}

export function dedupeCompatDisplayLines(lines: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const k = compatDisplayDedupeKey(line);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(line);
  }
  return out;
}

/** Testo compatibilità in UI: «Marca Modello» o «Marca (universale)». */
export function compatLineDisplayText(line: string): string {
  const t = line.trim();
  if (!t) return t;
  const { marca, modello } = parseCompatMarcaModello(t);
  if (marca && !modello) return `${marca} (universale)`;
  if (marca && modello) return `${marca} ${modello}`;
  return marca || modello || t;
}

/** Sottotitolo lista magazzino: modello, oppure «Marca (Universale)» se solo marca. */
export function compatLineModelDisplayText(line: string): string {
  const t = line.trim();
  if (!t) return t;
  const { marca, modello } = parseCompatMarcaModello(t);
  if (marca && !modello) return `${marca} (Universale)`;
  if (modello) return modello;
  return marca || t;
}

/** Valore di sort/display per colonna compatibilità. */
export function compatSortKey(list: readonly string[]): string {
  const lines = dedupeCompatDisplayLines(
    dedupeCompatLabels(normalizeCompatList(list)).map(compatLineDisplayText),
  );
  return lines.join(", ").toLowerCase();
}

export function compatDisplayLabel(list: readonly string[]): string {
  const compat = dedupeCompatLabels(normalizeCompatList(list));
  if (compat.length === 0) return COMPAT_UNIVERSAL_LABEL;
  return dedupeCompatDisplayLines(compat.map(compatLineDisplayText)).join(", ");
}

export function compatDisplayModelsLabel(list: readonly string[]): string {
  const compat = dedupeCompatLabels(normalizeCompatList(list));
  if (compat.length === 0) return COMPAT_UNIVERSAL_LABEL;
  return dedupeCompatDisplayLines(compat.map(compatLineModelDisplayText)).join(", ");
}
