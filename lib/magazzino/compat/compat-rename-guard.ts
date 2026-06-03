import { parseMagazzinoRicambioMeta, type MagazzinoRicambioMeta } from "@/lib/magazzino/magazzino-meta";
import {
  legacyToSSOTWriteAdapter,
  writeCompatibilitaRicambio,
} from "@/lib/magazzino/compat/compat-write-gate";
import { patchCompatMezziArray } from "@/lib/magazzino/ricambio-compat-rename";
import type { SettingsRenameEntry } from "@/lib/settings/settings-rename-types";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";

export function warnIfCompatImpact(entry: SettingsRenameEntry, affectedCount: number): void {
  if (affectedCount <= 0) return;
  if (process.env.NODE_ENV === "production") return;
  console.debug(
    `[compat-rename] ${entry.kind}: "${entry.from}" → "${entry.to}" impatta ${affectedCount} ricambi`,
  );
}

function compatMetaChanged(
  prev: Pick<MagazzinoRicambioMeta, "compatibilitaRefs" | "compatibilitaMezzi">,
  next: Pick<MagazzinoRicambioMeta, "compatibilitaRefs" | "compatibilitaMezzi">,
): boolean {
  const prevLegacy = prev.compatibilitaMezzi ?? [];
  const nextLegacy = next.compatibilitaMezzi ?? [];
  const legacyChanged =
    nextLegacy.length !== prevLegacy.length ||
    [...nextLegacy].sort().join("\0") !== [...prevLegacy].sort().join("\0");
  const prevRefs = prev.compatibilitaRefs ?? [];
  const nextRefs = next.compatibilitaRefs ?? [];
  const refsChanged =
    nextRefs.length !== prevRefs.length ||
    JSON.stringify(nextRefs) !== JSON.stringify(prevRefs);
  return legacyChanged || refsChanged;
}

/** Rigenera legacy da refs (IDs stabili); fallback patch stringhe se solo legacy. */
export function regenerateCompatLegacyFromRefs(
  meta: unknown,
  liste: MezziListePrefs,
  entry?: SettingsRenameEntry,
): { next: Record<string, unknown>; changed: boolean } {
  const parsed = parseMagazzinoRicambioMeta(meta);
  const base =
    meta && typeof meta === "object" && !Array.isArray(meta) ? { ...(meta as Record<string, unknown>) } : {};

  if (parsed.compatibilitaRefs && parsed.compatibilitaRefs.length > 0) {
    const built = writeCompatibilitaRicambio(
      {
        compatibilitaRefs: parsed.compatibilitaRefs,
        compatibilitaMezzi: parsed.compatibilitaMezzi ?? [],
      },
      liste,
      "compat-rename-guard.regenerateCompatLegacyFromRefs",
    );
    if (!compatMetaChanged(parsed, built)) return { next: base, changed: false };
    return {
      next: {
        ...base,
        compatibilitaRefs: built.compatibilitaRefs,
        compatibilitaMezzi: built.compatibilitaMezzi,
      },
      changed: true,
    };
  }

  if (!entry) return { next: base, changed: false };
  const arr = base.compatibilitaMezzi;
  if (!Array.isArray(arr)) return { next: base, changed: false };
  const { next: nextArr, changed } = patchCompatMezziArray(arr, {
    kind: entry.kind,
    from: entry.from,
    to: entry.to,
    marcaContext: entry.marcaContext,
    tree: entry.tree,
  });
  if (!changed) return { next: base, changed: false };

  const adapted = legacyToSSOTWriteAdapter({ compatibilitaMezzi: nextArr }, liste);
  const built = writeCompatibilitaRicambio(
    adapted,
    liste,
    "compat-rename-guard.regenerateCompatLegacyFromRefs.legacyOnly",
  );
  return {
    next: {
      ...base,
      compatibilitaRefs: built.compatibilitaRefs,
      compatibilitaMezzi: built.compatibilitaMezzi,
    },
    changed: true,
  };
}
