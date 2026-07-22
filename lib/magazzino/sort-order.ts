import { ricambioCodiceForUi } from "@/lib/magazzino/ricambio-codice";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { RicambioMagazzino, SortKeyMagazzino } from "@/lib/magazzino/types";
import { readCompatSortKeyForUi } from "@/lib/magazzino/compat/compat-read-guard";
export type SortPhaseMagazzino = "asc" | "desc" | "natural";

export function nextSortPhase(p: SortPhaseMagazzino): SortPhaseMagazzino {
  if (p === "asc") return "desc";
  if (p === "desc") return "natural";
  return "asc";
}

export function compareNaturalOrder(
  a: RicambioMagazzino,
  b: RicambioMagazzino,
  orderIndex: Map<string, number>,
): number {
  const ia = orderIndex.get(a.id);
  const ib = orderIndex.get(b.id);
  const na = ia === undefined ? Number.MAX_SAFE_INTEGER : ia;
  const nb = ib === undefined ? Number.MAX_SAFE_INTEGER : ib;
  if (na !== nb) return na - nb;
  return a.id.localeCompare(b.id);
}

/** Ordinamento predefinito lista magazzino (marca ↑) senza stato sort attivo in header. */
export function compareMagazzinoDefaultOrder(
  a: RicambioMagazzino,
  b: RicambioMagazzino,
  orderIndex: Map<string, number>,
  mezziListe?: MezziListePrefs,
): number {
  const byMarca = compareByColumn(a, b, "marca", "asc", undefined, mezziListe);
  if (byMarca !== 0) return byMarca;
  return compareNaturalOrder(a, b, orderIndex);
}

/** Card mobile: ultima modifica ↓ (più recente in alto), poi ordine naturale. */
export function compareMagazzinoMobileDefaultOrder(
  a: RicambioMagazzino,
  b: RicambioMagazzino,
  orderIndex: Map<string, number>,
  mezziListe?: MezziListePrefs,
): number {
  const byModifica = compareByColumn(a, b, "dataUltimaModifica", "desc", undefined, mezziListe);
  if (byModifica !== 0) return byModifica;
  return compareNaturalOrder(a, b, orderIndex);
}

export function sortValueForKey(
  r: RicambioMagazzino,
  key: SortKeyMagazzino,
  mezziListe?: import("@/lib/mezzi/mezzi-liste-prefs-storage").MezziListePrefs,
): string | number {
  switch (key) {
    case "prezzoVendita":
      return r.prezzoVendita;
    case "scorta":
      return r.scorta;
    case "scortaMinima":
      return r.scortaMinima;
    case "marca":
      return r.marca.toLowerCase();
    case "categoria":
      return r.categoria.toLowerCase();
    case "codiceFornitoreOriginale": {
      const primary = ricambioCodiceForUi(r.codiceFornitoreOriginale).toLowerCase() || "~";
      const secondary = r.codiceFornitoreOriginaleSecondario.toLowerCase();
      return secondary ? `${primary}\0${secondary}` : primary;
    }
    case "descrizione":
      return r.descrizione.toLowerCase();
    case "compatibilitaMezzi":
      return readCompatSortKeyForUi(r, mezziListe, "sort-order.compatibilitaMezzi");
    case "dataUltimaModifica":
      return r.dataUltimaModifica;
    case "autoreUltimaModifica":
      return r.autoreUltimaModifica.toLowerCase();
    case "consumoMedioMensile":
      return 0;
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

export function compareByColumn(
  a: RicambioMagazzino,
  b: RicambioMagazzino,
  key: SortKeyMagazzino,
  phase: "asc" | "desc",
  consumoMedioById?: Map<string, number | null>,
  mezziListe?: import("@/lib/mezzi/mezzi-liste-prefs-storage").MezziListePrefs,
): number {  if (key === "consumoMedioMensile" && consumoMedioById) {
    const va = consumoMedioById.get(a.id);
    const vb = consumoMedioById.get(b.id);
    const ma = va == null || !Number.isFinite(va);
    const mb = vb == null || !Number.isFinite(vb);
    if (ma && mb) return 0;
    if (ma) return 1;
    if (mb) return -1;
    const cmp = va - vb;
    return phase === "asc" ? cmp : -cmp;
  }
  const va = sortValueForKey(a, key, mezziListe);
  const vb = sortValueForKey(b, key, mezziListe);  let cmp = 0;
  if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
  else cmp = String(va).localeCompare(String(vb), "it");
  return phase === "asc" ? cmp : -cmp;
}
