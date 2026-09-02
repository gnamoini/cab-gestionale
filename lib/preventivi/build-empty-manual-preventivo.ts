import { PREVENTIVO_LIFECYCLE_DEFAULTS } from "@/lib/preventivi/preventivo-lifecycle-defaults";
import { localCalendarDayIsoFromDate } from "@/lib/lavorazioni/date-day-only";
import { inferEconomiciClientePreventivi } from "@/lib/preventivi/preventivi-cliente-infer";
import { nextPreventivoNumeroManualeFromRecords } from "@/lib/preventivi/preventivo-numero-manuale";
import { nextPreventivoId } from "@/lib/preventivi/preventivi-records-from-cache";
import { ensurePreventivoStruttura } from "@/lib/preventivi/preventivi-struttura";
import { PREVENTIVO_TIPO_DOCUMENTO_DEFAULT } from "@/lib/preventivi/preventivi-tipo-documento";
import { normalizePreventivoRigaAddettoWrite } from "@/lib/lavorazioni/addetto-write-freeze";
import { calcolaTotaliPreventivo } from "@/lib/preventivi/preventivi-totals";
import type { PreventivoCategoria, PreventivoRecord, PreventivoRigaAddetto } from "@/lib/preventivi/types";
import { getScontoRicambiCliente } from "@/lib/mezzi/cliente-commerciale";
import { migrateMezziListePrefs } from "@/lib/mezzi/attrezzature-prefs";
import { createMezziListePrefsDefault } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { getRuntimeCabAppSettings, getRuntimeCabAppSettingsPayload } from "@/src/lib/app-settings/runtime-settings-cache";
import {
  defaultTargetTypeForProfilo,
  readOfficinaProfiloFromRows,
} from "@/lib/officina/officina-profilo-operativo";

export type BuildEmptyManualPreventivoOptions = {
  cliente?: string;
  tipoDocumento?: PreventivoRecord["tipoDocumento"];
  categoria?: PreventivoCategoria;
};

/** Bozza vuota senza lavorazione collegata (salvataggio alla prima conferma in modale). */
export function buildEmptyManualPreventivo(
  autore: string,
  existingRecords: readonly PreventivoRecord[],
  options: BuildEmptyManualPreventivoOptions = {},
): PreventivoRecord {
  const categoria = options.categoria ?? "lavorazione";
  const cliente = options.cliente ?? "";
  const tipoDocumento = options.tipoDocumento ?? PREVENTIVO_TIPO_DOCUMENTO_DEFAULT;
  const mezziListe = migrateMezziListePrefs(getRuntimeCabAppSettings()?.mezziListe ?? createMezziListePrefsDefault());
  const profilo = readOfficinaProfiloFromRows(getRuntimeCabAppSettingsPayload()?.rows);
  const targetType = defaultTargetTypeForProfilo(profilo);
  const defaultSconto = getScontoRicambiCliente(mezziListe, cliente);
  const infer = inferEconomiciClientePreventivi(cliente, existingRecords, undefined, defaultSconto);
  const prezzoOrario = infer.prezzoOrario;
  const now = new Date().toISOString();
  const dataCreazione = localCalendarDayIsoFromDate();
  const isVendita = categoria === "vendita";
  const draft: PreventivoRecord = {
    id: nextPreventivoId(),
    numero: nextPreventivoNumeroManualeFromRecords(existingRecords),
    dataCreazione,
    aggiornatoAt: now,
    ...PREVENTIVO_LIFECYCLE_DEFAULTS,
    tipoDocumento,
    categoriaPreventivo: categoria,
    targetType,
    attrezzaturaId: "",
    lavorazioneId: "",
    lavorazioneOrigine: "attiva",
    cliente: "",
    cantiere: "",
    utilizzatore: "",
    macchinaRiassunto: "",
    targa: "",
    matricola: "",
    nScuderia: "",
    marcaAttrezzatura: "",
    modelloAttrezzatura: "",
    tipoAttrezzatura: "",
    oreLavoro: "",
    tipoTelaio: "",
    marcaTelaio: "",
    modelloTelaio: "",
    km: "",
    livelloCarburante: "",
    richiedente: "",
    descrizioneLavorazioniCliente: "",
    descrizioneLavorazioniTecnicaSorgente: "",
    descrizioneGenerataAuto: "",
    righeRicambi: [],
    sanificazionePrezzo: isVendita ? 0 : prezzoOrario,
    sanificazioneOre: isVendita ? 0 : 1,
    collaudoPrezzo: isVendita ? 0 : prezzoOrario,
    collaudoOre: isVendita ? 0 : 1,
    manodopera: isVendita
      ? {
          oreTotali: 0,
          righeAddetti: [],
          costoOrario: infer.costoOrario,
          prezzoOrario: infer.prezzoOrario,
          scontoPercent: infer.manodoperaScontoPercent,
        }
      : {
          oreTotali: 1,
          righeAddetti: [
            normalizePreventivoRigaAddettoWrite({
              addettoId: null,
              ore: 1,
              addettoLegacy: "Officina",
              legacyWarning: "Addetto storico non convertibile: Officina",
            }) as PreventivoRigaAddetto,
          ],
          costoOrario: infer.costoOrario,
          prezzoOrario: infer.prezzoOrario,
          scontoPercent: infer.manodoperaScontoPercent,
        },
    noteFinali: infer.noteFinaliTipiche,
    totaleRicambi: 0,
    totaleManodopera: 0,
    totaleFinale: 0,
    createdBy: autore,
    lastEditedBy: autore,
  };
  const strutturato = ensurePreventivoStruttura(draft);
  return { ...strutturato, ...calcolaTotaliPreventivo(strutturato) };
}
