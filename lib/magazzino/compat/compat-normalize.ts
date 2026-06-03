import { RICAMBIO_COMPAT_LEGACY_PLACEHOLDER } from "@/lib/magazzino/compat/compat-types";

export { RICAMBIO_COMPAT_LEGACY_PLACEHOLDER };

export function normalizeCompatList(list: readonly string[]): string[] {
  return list.map((x) => x.trim()).filter((x) => x && x !== RICAMBIO_COMPAT_LEGACY_PLACEHOLDER);
}

/** Nessuna compatibilità esplicita = universale (tutte le macchine). */
export function isRicambioCompatUniversal(list: readonly string[]): boolean {
  return normalizeCompatList(list).length === 0;
}

export function parseCompatInput(s: string): string[] {
  return s
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter((x) => x && x !== RICAMBIO_COMPAT_LEGACY_PLACEHOLDER);
}
