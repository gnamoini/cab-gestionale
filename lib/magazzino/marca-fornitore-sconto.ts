import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";
import {
  removeFornitoreAnagraficaFromMagazzinoMaster,
  renameFornitoreAnagraficaInMagazzinoMaster,
} from "@/lib/magazzino/fornitore-anagrafica";
import {
  removeMarcaBadgeColor,
  renameMarcaBadgeColor,
} from "@/lib/magazzino/marca-badge-color";

function clampScontoFornitorePercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n * 10) / 10));
}

/** Normalizza chiave marca per mappa sconti (trim + lowercase). */
export function normMarcaKey(nome: string): string {
  return nome.trim().toLowerCase();
}

export function parseScontoFornitoreByMarca(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const key = normMarcaKey(k);
    if (!key) continue;
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    out[key] = clampScontoFornitorePercent(n);
  }
  return out;
}

/** Sconto % fornitore su listino OE configurato per marca (0 se assente). */
export function getScontoFornitoreMarca(mag: MagazzinoMasterPrefs, marcaNome: string): number {
  const key = normMarcaKey(marcaNome);
  if (!key) return 0;
  const map = mag.scontoFornitoreByMarca ?? {};
  return clampScontoFornitorePercent(map[key] ?? 0);
}

export function setScontoFornitoreMarca(
  mag: MagazzinoMasterPrefs,
  marcaNome: string,
  percent: number,
): MagazzinoMasterPrefs {
  const key = normMarcaKey(marcaNome);
  if (!key) return mag;
  return {
    ...mag,
    scontoFornitoreByMarca: {
      ...(mag.scontoFornitoreByMarca ?? {}),
      [key]: clampScontoFornitorePercent(percent),
    },
  };
}

export function removeScontoFornitoreMarca(mag: MagazzinoMasterPrefs, marcaNome: string): MagazzinoMasterPrefs {
  const key = normMarcaKey(marcaNome);
  if (!key || !mag.scontoFornitoreByMarca) return mag;
  const next = { ...mag.scontoFornitoreByMarca };
  delete next[key];
  return { ...mag, scontoFornitoreByMarca: next };
}

export function registerMarcaInMagazzinoMaster(mag: MagazzinoMasterPrefs, marcaNome: string): MagazzinoMasterPrefs {
  const trimmed = marcaNome.trim();
  if (!trimmed) return mag;
  const marche = mag.marche.includes(trimmed) ? mag.marche : [...mag.marche, trimmed];
  const key = normMarcaKey(trimmed);
  const scontoFornitoreByMarca = { ...(mag.scontoFornitoreByMarca ?? {}) };
  if (!(key in scontoFornitoreByMarca)) scontoFornitoreByMarca[key] = 0;
  return { ...mag, marche, scontoFornitoreByMarca };
}

export function renameMarcaInMagazzinoMaster(mag: MagazzinoMasterPrefs, from: string, to: string): MagazzinoMasterPrefs {
  const t = to.trim();
  if (!t || from === t) return mag;
  const oldKey = normMarcaKey(from);
  const newKey = normMarcaKey(t);
  const marche = mag.marche.map((m) => (m === from ? t : m));
  const scontoFornitoreByMarca = { ...(mag.scontoFornitoreByMarca ?? {}) };
  if (oldKey in scontoFornitoreByMarca) {
    scontoFornitoreByMarca[newKey] = scontoFornitoreByMarca[oldKey]!;
    delete scontoFornitoreByMarca[oldKey];
  } else if (!(newKey in scontoFornitoreByMarca)) {
    scontoFornitoreByMarca[newKey] = 0;
  }
  return renameFornitoreAnagraficaInMagazzinoMaster(
    renameMarcaBadgeColor({ ...mag, marche, scontoFornitoreByMarca }, from, t),
    from,
    t,
  );
}

export function removeMarcaFromMagazzinoMaster(mag: MagazzinoMasterPrefs, marcaNome: string): MagazzinoMasterPrefs {
  const next = removeMarcaBadgeColor(removeScontoFornitoreMarca(mag, marcaNome), marcaNome);
  return removeFornitoreAnagraficaFromMagazzinoMaster(
    { ...next, marche: next.marche.filter((m) => m !== marcaNome) },
    marcaNome,
  );
}
