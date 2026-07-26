import { PREVENTIVI_LEARNING_STORAGE_KEY } from "@/lib/preventivi/constants";
import { queueDescriptionSuggestion } from "@/lib/preventivi/description-engine/learning-suggestions";
import type { PreventivoRecord } from "@/lib/preventivi/types";

export type PreventivoLearningStore = {
  version: 1;
  phraseMap: Record<string, string>;
  corrections: { fromNorm: string; to: string; at: string }[];
  finalVersions: { preventivoId: string; fromNorm: string; to: string; at: string }[];
};

const MAX_CORRECTIONS = 120;
const MAX_FINAL_VERSIONS = 80;
const MAX_PHRASE_KEYS = 400;

function defaultStore(): PreventivoLearningStore {
  return { version: 1, phraseMap: {}, corrections: [], finalVersions: [] };
}

export function loadPreventiviLearning(): PreventivoLearningStore {
  if (typeof window === "undefined") return defaultStore();
  try {
    const raw = window.localStorage.getItem(PREVENTIVI_LEARNING_STORAGE_KEY);
    if (!raw) return defaultStore();
    const p = JSON.parse(raw) as PreventivoLearningStore;
    if (!p || p.version !== 1) return defaultStore();
    return {
      version: 1,
      phraseMap: typeof p.phraseMap === "object" && p.phraseMap ? p.phraseMap : {},
      corrections: Array.isArray(p.corrections) ? p.corrections : [],
      finalVersions: Array.isArray(p.finalVersions) ? p.finalVersions : [],
    };
  } catch {
    return defaultStore();
  }
}

function mirrorLearningToSettings(s: PreventivoLearningStore): void {
  if (typeof window === "undefined") return;
  void import("@/lib/preventivi/preventivi-learning-sync").then(({ mirrorPreventiviLearningToSettings }) => {
    mirrorPreventiviLearningToSettings(s);
  });
}

export function savePreventiviLearning(s: PreventivoLearningStore): void {
  if (typeof window === "undefined") return;
  try {
    const keys = Object.keys(s.phraseMap);
    const trimmedMap =
      keys.length <= MAX_PHRASE_KEYS
        ? s.phraseMap
        : Object.fromEntries(keys.slice(-MAX_PHRASE_KEYS).map((k) => [k, s.phraseMap[k]!]));
    window.localStorage.setItem(
      PREVENTIVI_LEARNING_STORAGE_KEY,
      JSON.stringify({
        ...s,
        phraseMap: trimmedMap,
        corrections: s.corrections.slice(0, MAX_CORRECTIONS),
        finalVersions: s.finalVersions.slice(0, MAX_FINAL_VERSIONS),
      }),
    );
  } catch {
    /* ignore */
  }
  mirrorLearningToSettings(s);
}

export function normPhrase(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[""'']/g, "")
    .slice(0, 240);
}

export function lookupLearnedPhrase(technicalChunk: string): string | null {
  const n = normPhrase(technicalChunk);
  if (!n) return null;
  const st = loadPreventiviLearning();
  if (st.phraseMap[n]) return st.phraseMap[n]!;
  for (const [k, v] of Object.entries(st.phraseMap)) {
    if (n.includes(k) || k.includes(n)) return v;
  }
  for (const c of st.corrections) {
    if (n.includes(c.fromNorm) || c.fromNorm.includes(n)) return c.to;
  }
  return null;
}

export function recordDescriptionCorrection(technicalSourceNorm: string, customerFinal: string): void {
  const fromNorm = normPhrase(technicalSourceNorm).slice(0, 400);
  const to = customerFinal.trim();
  if (!fromNorm || !to) return;
  const st = loadPreventiviLearning();
  const phraseMap = { ...st.phraseMap, [fromNorm]: to };
  const corrections = [{ fromNorm, to, at: new Date().toISOString() }, ...st.corrections].slice(0, MAX_CORRECTIONS);
  savePreventiviLearning({ ...st, phraseMap, corrections });
}

function splitTechChunks(raw: string): string[] {
  return raw
    .split(/[+;,\n\r]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitClienteLines(raw: string): string[] {
  return raw
    .split(/\n+/)
    .map((l) => l.replace(/^-\s*/, "").trim())
    .filter(Boolean);
}

export function recordApprovedPreventivoVersion(p: PreventivoRecord): void {
  if (p.stato !== "confermato") return;
  const fromNorm = normPhrase(p.descrizioneLavorazioniTecnicaSorgente).slice(0, 400);
  const to = p.descrizioneLavorazioniCliente.trim();
  if (!fromNorm || !to) return;
  const st = loadPreventiviLearning();
  const at = new Date().toISOString();
  let phraseMap = { ...st.phraseMap, [fromNorm]: to };

  const techChunks = splitTechChunks(p.descrizioneLavorazioniTecnicaSorgente);
  const clientLines = splitClienteLines(p.descrizioneLavorazioniCliente);
  for (let i = 0; i < techChunks.length; i++) {
    const chunk = techChunks[i]!;
    const line = clientLines[i] ?? clientLines[clientLines.length - 1];
    if (!line) continue;
    const ck = normPhrase(chunk);
    if (ck.length >= 6) phraseMap = { ...phraseMap, [ck]: line };
  }

  const finalVersions = [
    { preventivoId: p.id, fromNorm, to, at },
    ...st.finalVersions.filter((x) => x.preventivoId !== p.id),
  ].slice(0, MAX_FINAL_VERSIONS);
  savePreventiviLearning({ ...st, phraseMap, finalVersions });
}

function recordLineLevelPhraseMap(p: PreventivoRecord): void {
  const techChunks = splitTechChunks(p.descrizioneLavorazioniTecnicaSorgente);
  const clientLines = splitClienteLines(p.descrizioneLavorazioniCliente);
  if (techChunks.length === 0 || clientLines.length === 0) return;

  const st = loadPreventiviLearning();
  let phraseMap = { ...st.phraseMap };
  let changed = false;
  for (let i = 0; i < techChunks.length; i++) {
    const chunk = techChunks[i]!;
    const line = clientLines[i] ?? clientLines[clientLines.length - 1];
    if (!line) continue;
    const ck = normPhrase(chunk);
    if (ck.length < 6) continue;
    if (phraseMap[ck] !== line) {
      phraseMap = { ...phraseMap, [ck]: line };
      changed = true;
    }
  }
  if (changed) savePreventiviLearning({ ...st, phraseMap });
}

/** Apprendimento anche da preventivi salvati con testo rivisto rispetto alla bozza auto. */
export function recordPreventivoDescriptionLearning(p: PreventivoRecord): void {
  const tech = p.descrizioneLavorazioniTecnicaSorgente.trim();
  const cliente = p.descrizioneLavorazioniCliente.trim();
  if (!tech || !cliente) return;
  if (cliente !== p.descrizioneGenerataAuto) {
    queueDescriptionSuggestion({
      preventivoId: p.id,
      technicalSourceNorm: normPhrase(tech),
      suggestedFrom: p.descrizioneGenerataAuto,
      suggestedTo: cliente,
      suggestionType: "full_mapping",
      createdBy: p.lastEditedBy,
    });
    recordLineLevelPhraseMap(p);
  }
  recordApprovedPreventivoVersion(p);
}
