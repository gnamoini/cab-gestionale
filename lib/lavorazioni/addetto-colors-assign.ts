import { normalizeHex } from "@/lib/lavorazioni/color-utils";
import {
  addettoColorKey,
  findAddettoById,
  findAddettoByStoredName,
  type AddettoRecord,
} from "@/lib/lavorazioni/addetto-model";
import { addettoThemeColorFromId } from "@/lib/lavorazioni/lavorazioni-theme";

/** Palette base gestionale — 12 colori frequenti (assegnazione automatica + picker impostazioni). */
export const ADDETTO_COLOR_POOL = [
  "#dc2626", // rosso
  "#ea580c", // arancione
  "#ca8a04", // giallo
  "#16a34a", // verde
  "#0d9488", // teal
  "#0891b2", // ciano
  "#2563eb", // blu
  "#4f46e5", // indigo
  "#7c3aed", // viola
  "#c026d3", // fucsia
  "#db2777", // rosa
  "#64748b", // grigio
] as const;

function hslToHex(h: number, s: number, l: number): string {
  const s1 = s / 100;
  const l1 = l / 100;
  const a = s1 * Math.min(l1, 1 - l1);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const col = l1 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.min(255, Math.max(0, Math.round(255 * col)));
  };
  return `#${[f(0), f(8), f(4)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")}`;
}

function usedHexSet(map: Record<string, string>): Set<string> {
  const u = new Set<string>();
  for (const v of Object.values(map)) {
    const n = normalizeHex(v);
    if (n) u.add(n);
  }
  return u;
}

/** Colore univoco non ancora in `used` (palette mescolata da salt, poi varianti HSL). */
export function nextUniqueAddettoColor(used: Set<string>, salt: number): string {
  const pool = [...ADDETTO_COLOR_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.abs((salt + i * 31) >>> 0) % (i + 1);
    const t = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = t;
  }
  for (const c of pool) {
    const n = normalizeHex(c);
    if (n && !used.has(n)) return n;
  }
  for (let step = 0; step < 500; step++) {
    const hue = ((salt >>> 0) + step * 19) % 360;
    const sat = 46 + (step % 6) * 2.5;
    const light = 43 + ((step >> 2) % 5) * 2.2;
    const hex = hslToHex(hue, sat, light);
    const n = normalizeHex(hex);
    if (n && !used.has(n)) return n;
  }
  const fallback = `#${((salt >>> 0) & 0xffffff).toString(16).padStart(6, "0")}`;
  return normalizeHex(fallback) ?? "#52525b";
}

/**
 * Allinea la mappa ai nomi correnti: mantiene colori validi, elimina orfani,
 * assegna colori univoci ai nomi senza voce (o con collisione su stesso hex).
 */
export function syncAddettoColorMap(
  addetti: string[],
  existing: Record<string, string> | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  const used = new Set<string>();

  for (const name of addetti) {
    const nh = normalizeHex(existing?.[name]);
    if (nh && !used.has(nh)) {
      out[name] = nh;
      used.add(nh);
    }
  }

  for (const name of addetti) {
    if (out[name]) continue;
    const hex = nextUniqueAddettoColor(used, (name.length + 1) * 1315423911 + addetti.indexOf(name) * 97);
    const n = normalizeHex(hex)!;
    out[name] = n;
    used.add(n);
  }

  return out;
}

/**
 * Allinea mappa colori ai record per chiave stabile (colorKey / id).
 * Migra colori legacy keyed per nome se presenti in `existing`.
 */
export function syncAddettoColorMapById(
  records: readonly AddettoRecord[],
  existing: Record<string, string> | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  const used = new Set<string>();

  for (const rec of records) {
    const key = addettoColorKey(rec);
    const fromKey = normalizeHex(existing?.[key]) ?? normalizeHex(existing?.[rec.id]);
    const fromNome = normalizeHex(existing?.[rec.nome.trim()]);
    const nh = fromKey ?? fromNome;
    if (nh && !used.has(nh)) {
      out[key] = nh;
      used.add(nh);
    }
  }

  for (const rec of records) {
    const key = addettoColorKey(rec);
    if (out[key]) continue;
    const hex = nextUniqueAddettoColor(
      used,
      (key.length + 1) * 1315423911 + records.indexOf(rec) * 97,
    );
    const n = normalizeHex(hex)!;
    out[key] = n;
    used.add(n);
  }

  return out;
}

/** Migra mappa legacy nome → id; mantiene hex per record matchati. */
export function migrateAddettoColorMapNomeToId(
  records: readonly AddettoRecord[],
  existing: Record<string, string> | undefined,
): Record<string, string> {
  return syncAddettoColorMapById(records, existing);
}

function addettoColorLookupKeys(
  colorKey: string,
  records?: readonly AddettoRecord[],
): string[] {
  const k = colorKey.trim();
  if (!k) return [];
  const keys = new Set<string>([k]);
  if (records?.length) {
    const rec = findAddettoById(records, k) ?? findAddettoByStoredName(records, k);
    if (rec) {
      keys.add(addettoColorKey(rec));
      keys.add(rec.id);
      const nome = rec.nome.trim();
      if (nome) keys.add(nome);
    }
  }
  return [...keys];
}

/** Colore per UI da chiave stabile id/colorKey (con fallback nome legacy se `records` è fornito). */
export function addettoDisplayColorById(
  colorKey: string,
  map: Record<string, string>,
  records?: readonly AddettoRecord[],
): string {
  const k = colorKey.trim();
  if (!k) return addettoThemeColorFromId("empty");
  for (const key of addettoColorLookupKeys(k, records)) {
    const n = normalizeHex(map[key]);
    if (n) return n;
  }
  const rec = records?.length
    ? findAddettoById(records, k) ?? findAddettoByStoredName(records, k)
    : undefined;
  return addettoThemeColorFromId(rec ? addettoColorKey(rec) : k);
}

export function assignColorForNewAddettoById(
  prev: Record<string, string>,
  record: Pick<AddettoRecord, "id" | "colorKey">,
): Record<string, string> {
  const key = addettoColorKey(record);
  const used = usedHexSet(prev);
  const salt = (Date.now() + Math.floor(Math.random() * 0x7fffffff)) >>> 0;
  const hex = nextUniqueAddettoColor(used, salt);
  return { ...prev, [key]: hex };
}

export function removeAddettoFromColorMapById(
  prev: Record<string, string>,
  record: Pick<AddettoRecord, "id" | "colorKey">,
): Record<string, string> {
  const key = addettoColorKey(record);
  const { [key]: _, ...rest } = prev;
  return rest;
}

/** Colore per UI: da mappa persistita, altrimenti fallback deterministico (righe legacy). */
export function addettoDisplayColor(
  nome: string,
  map: Record<string, string>,
  records?: readonly AddettoRecord[],
): string {
  return addettoDisplayColorById(nome, map, records);
}

export function assignColorForNewAddetto(prev: Record<string, string>, newName: string): Record<string, string> {
  const used = usedHexSet(prev);
  const salt = (Date.now() + Math.floor(Math.random() * 0x7fffffff)) >>> 0;
  const hex = nextUniqueAddettoColor(used, salt);
  return { ...prev, [newName]: hex };
}

export function renameAddettoInColorMap(
  prev: Record<string, string>,
  previousName: string,
  nextName: string,
): Record<string, string> {
  const col = normalizeHex(prev[previousName]);
  const { [previousName]: _, ...rest } = prev;
  if (col) return { ...rest, [nextName]: col };
  const used = usedHexSet(rest);
  return { ...rest, [nextName]: nextUniqueAddettoColor(used, nextName.length * 999983) };
}

export function removeAddettoFromColorMap(prev: Record<string, string>, name: string): Record<string, string> {
  const { [name]: _, ...rest } = prev;
  return rest;
}
