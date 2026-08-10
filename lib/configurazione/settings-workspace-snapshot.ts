import {
  defaultDipendentiRecords,
  serializeDipendentiRecordsForPayload,
  type DipendenteRecord,
} from "@/lib/dipendenti/dipendente-record";
import { syncAddettoColorMapById } from "@/lib/lavorazioni/addetto-colors-assign";
import { resolveAddettiRecordsFromDipendenti } from "@/lib/dipendenti/dipendente-record";
import { normalizeStatiList } from "@/lib/lavorazioni/stati-normalize";
import { defaultTipiAssenza } from "@/lib/dipendenti/tipi-assenza-model";
import {
  DEFAULT_CAB_BRANDING_SETTINGS,
  type CabBrandingSettings,
} from "@/lib/branding/branding-settings-model";
import type { ConfigurazioneSettingsSnapshot } from "@/lib/configurazione/settings-snapshot-log";
import { migrateMezziListePrefs } from "@/lib/mezzi/attrezzature-prefs";
import {
  DEFAULT_PRIORITA_LAVORAZIONI_DB,
  type CabAppSettingsResolved,
} from "@/src/lib/app-settings/resolve-from-rows";
import { DEFAULT_STATI_LAVORAZIONI_DB } from "@/src/shared/selectors";

export type SettingsWorkspaceSnapshot = ConfigurazioneSettingsSnapshot;

export function buildResolvedFromModalSnapshot(s: SettingsWorkspaceSnapshot): CabAppSettingsResolved {
  const dipendentiRecords = serializeDipendentiRecordsForPayload(s.dipendentiRecords);
  const addettiRecords = resolveAddettiRecordsFromDipendenti(dipendentiRecords);
  return {
    lavorazioni: {
      stati: normalizeStatiList(s.stati),
      addettiRecords,
      addetti: addettiRecords.map((r) => r.nome.trim()).filter(Boolean),
      addettoColors: s.addettoColors,
      prioritaColors: s.prioritaColors,
      prioritaDb: s.prioritaDb,
    },
    mezziListe: migrateMezziListePrefs(s.liste),
    magazzinoMaster: s.mag,
    preventiviDefaults: s.eco,
    dipendenti: { dipendentiRecords, tipiAssenza: s.tipiAssenza },
    branding: s.branding,
  };
}

export function snapshotFromResolved(r: CabAppSettingsResolved): SettingsWorkspaceSnapshot {
  const dipendentiRecords =
    r.dipendenti.dipendentiRecords?.length &&
    r.dipendenti.dipendentiRecords.some((a) => a.nome.trim().length > 0)
      ? serializeDipendentiRecordsForPayload(r.dipendenti.dipendentiRecords)
      : defaultDipendentiRecords();
  const addettiRecords = resolveAddettiRecordsFromDipendenti(dipendentiRecords);
  return {
    stati: r.lavorazioni.stati?.length ? normalizeStatiList(r.lavorazioni.stati) : [...DEFAULT_STATI_LAVORAZIONI_DB],
    dipendentiRecords,
    addettoColors: syncAddettoColorMapById(addettiRecords, r.lavorazioni.addettoColors),
    prioritaColors: r.lavorazioni.prioritaColors ?? {},
    prioritaDb: r.lavorazioni.prioritaDb?.length ? [...r.lavorazioni.prioritaDb] : [...DEFAULT_PRIORITA_LAVORAZIONI_DB],
    mag: {
      marche: [...r.magazzinoMaster.marche],
      scontoFornitoreByMarca: { ...(r.magazzinoMaster.scontoFornitoreByMarca ?? {}) },
      colorByMarca: { ...(r.magazzinoMaster.colorByMarca ?? {}) },
      categorie: [...r.magazzinoMaster.categorie],
      mezziCompatibili: [...r.magazzinoMaster.mezziCompatibili],
      fornitori: [...(r.magazzinoMaster.fornitori ?? [])],
      scontoFornitoreByFornitore: { ...(r.magazzinoMaster.scontoFornitoreByFornitore ?? {}) },
      produttori: [...(r.magazzinoMaster.produttori ?? [])],
    },
    liste: migrateMezziListePrefs(r.mezziListe),
    eco: { ...r.preventiviDefaults },
    tipiAssenza: r.dipendenti.tipiAssenza?.length ? [...r.dipendenti.tipiAssenza] : defaultTipiAssenza(),
    branding: r.branding ? { ...r.branding } : ({ ...DEFAULT_CAB_BRANDING_SETTINGS } satisfies CabBrandingSettings),
  };
}
