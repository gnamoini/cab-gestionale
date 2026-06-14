import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";

function clampScontoFornitorePercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n * 10) / 10));
}

/** Normalizza chiave fornitore alternativo per mappa sconti (trim + lowercase). */
export function normFornitoreAlternativoKey(nome: string): string {
  return nome.trim().toLowerCase();
}

export function parseScontoFornitoreByFornitore(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const key = normFornitoreAlternativoKey(k);
    if (!key) continue;
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    out[key] = clampScontoFornitorePercent(n);
  }
  return out;
}

/** Sconto % listino fornitore alternativo configurato (0 se assente). */
export function getScontoFornitoreAlternativo(mag: MagazzinoMasterPrefs, fornitoreNome: string): number {
  const key = normFornitoreAlternativoKey(fornitoreNome);
  if (!key) return 0;
  const map = mag.scontoFornitoreByFornitore ?? {};
  return clampScontoFornitorePercent(map[key] ?? 0);
}

export function setScontoFornitoreAlternativo(
  mag: MagazzinoMasterPrefs,
  fornitoreNome: string,
  percent: number,
): MagazzinoMasterPrefs {
  const key = normFornitoreAlternativoKey(fornitoreNome);
  if (!key) return mag;
  return {
    ...mag,
    scontoFornitoreByFornitore: {
      ...(mag.scontoFornitoreByFornitore ?? {}),
      [key]: clampScontoFornitorePercent(percent),
    },
  };
}

export function removeScontoFornitoreAlternativo(
  mag: MagazzinoMasterPrefs,
  fornitoreNome: string,
): MagazzinoMasterPrefs {
  const key = normFornitoreAlternativoKey(fornitoreNome);
  if (!key || !mag.scontoFornitoreByFornitore) return mag;
  const next = { ...mag.scontoFornitoreByFornitore };
  delete next[key];
  return { ...mag, scontoFornitoreByFornitore: next };
}

export function registerFornitoreInMagazzinoMaster(
  mag: MagazzinoMasterPrefs,
  fornitoreNome: string,
): MagazzinoMasterPrefs {
  const trimmed = fornitoreNome.trim();
  if (!trimmed) return mag;
  const fornitori = mag.fornitori.includes(trimmed) ? mag.fornitori : [...mag.fornitori, trimmed];
  const key = normFornitoreAlternativoKey(trimmed);
  const scontoFornitoreByFornitore = { ...(mag.scontoFornitoreByFornitore ?? {}) };
  if (!(key in scontoFornitoreByFornitore)) scontoFornitoreByFornitore[key] = 0;
  return { ...mag, fornitori, scontoFornitoreByFornitore };
}

export function renameFornitoreInMagazzinoMaster(
  mag: MagazzinoMasterPrefs,
  from: string,
  to: string,
): MagazzinoMasterPrefs {
  const t = to.trim();
  if (!t || from === t) return mag;
  const oldKey = normFornitoreAlternativoKey(from);
  const newKey = normFornitoreAlternativoKey(t);
  const fornitori = mag.fornitori.map((f) => (f === from ? t : f));
  const scontoFornitoreByFornitore = { ...(mag.scontoFornitoreByFornitore ?? {}) };
  if (oldKey in scontoFornitoreByFornitore) {
    scontoFornitoreByFornitore[newKey] = scontoFornitoreByFornitore[oldKey]!;
    delete scontoFornitoreByFornitore[oldKey];
  } else if (!(newKey in scontoFornitoreByFornitore)) {
    scontoFornitoreByFornitore[newKey] = 0;
  }
  return { ...mag, fornitori, scontoFornitoreByFornitore };
}

export function removeFornitoreFromMagazzinoMaster(
  mag: MagazzinoMasterPrefs,
  fornitoreNome: string,
): MagazzinoMasterPrefs {
  const next = removeScontoFornitoreAlternativo(mag, fornitoreNome);
  return { ...next, fornitori: next.fornitori.filter((f) => f !== fornitoreNome) };
}
