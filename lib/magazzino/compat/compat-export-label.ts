import { resolveCompatibilitaRicambio } from "@/lib/magazzino/compat/resolve-compatibilita-ricambio";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";

/** Export PDF/Excel futuro — mai usare meta.compatibilitaMezzi raw. */
export function exportCompatLabel(ricambio: RicambioMagazzino, liste?: MezziListePrefs): string {
  return resolveCompatibilitaRicambio(ricambio, liste).display;
}
