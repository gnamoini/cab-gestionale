import { resolveMezziListeWithFleetCatalog } from "@/lib/attrezzature/attrezzature-catalog";
import { migrateMezziListePrefs, type AttrezzaturaMarca } from "@/lib/mezzi/attrezzature-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { RicambioCompatExpandOptions } from "@/lib/magazzino/form";

export type RicambioCompatMezziListeInput = {
  mezziListe: MezziListePrefs;
  fleetAttrezzatureTree?: readonly AttrezzaturaMarca[];
};

/** SSOT: albero mezzi per validazione/espansione compat (prefs + fleet catalog). */
export function resolveMezziListeForCompat(input: RicambioCompatMezziListeInput): MezziListePrefs {
  const base = migrateMezziListePrefs(input.mezziListe);
  return resolveMezziListeWithFleetCatalog(base, input.fleetAttrezzatureTree ?? []);
}

/** Unico builder per `ricambioFromFormLenient` / `validateRicambioListFields` compat. */
export function buildRicambioCompatExpandOptions(
  input: RicambioCompatMezziListeInput,
): RicambioCompatExpandOptions {
  return { mezziListe: resolveMezziListeForCompat(input) };
}
