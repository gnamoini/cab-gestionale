import { localCalendarDayIsoFromDate } from "@/lib/lavorazioni/date-day-only";
import { inferEconomiciClientePreventivi } from "@/lib/preventivi/preventivi-cliente-infer";
import { ensurePreventivoStruttura } from "@/lib/preventivi/preventivi-struttura";
import { PREVENTIVO_TIPO_DOCUMENTO_DEFAULT } from "@/lib/preventivi/preventivi-tipo-documento";
import { calcolaTotaliPreventivo } from "@/lib/preventivi/preventivi-totals";
import { loadPreventivi, nextPreventivoId, nextPreventivoNumero } from "@/lib/preventivi/preventivi-storage";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import { getScontoRicambiCliente } from "@/lib/mezzi/cliente-commerciale";
import { migrateMezziListePrefs } from "@/lib/mezzi/attrezzature-prefs";
import { createMezziListePrefsDefault } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { getRuntimeCabAppSettings } from "@/src/lib/app-settings/runtime-settings-cache";

/** Bozza vuota senza lavorazione collegata (salvataggio alla prima conferma in modale). */
export function buildEmptyManualPreventivo(
  autore: string,
  cliente = "",
  tipoDocumento: PreventivoRecord["tipoDocumento"] = PREVENTIVO_TIPO_DOCUMENTO_DEFAULT,
): PreventivoRecord {
  const tutti = loadPreventivi();
  const mezziListe = migrateMezziListePrefs(getRuntimeCabAppSettings()?.mezziListe ?? createMezziListePrefsDefault());
  const defaultSconto = getScontoRicambiCliente(mezziListe, cliente);
  const infer = inferEconomiciClientePreventivi(cliente, tutti, undefined, defaultSconto);
  const now = new Date().toISOString();
  const dataCreazione = localCalendarDayIsoFromDate();
  const draft: PreventivoRecord = {
    id: nextPreventivoId(),
    numero: nextPreventivoNumero(tutti),
    dataCreazione,
    aggiornatoAt: now,
    stato: "bozza",
    tipoDocumento,
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
    descrizioneLavorazioniCliente: "",
    descrizioneLavorazioniTecnicaSorgente: "",
    descrizioneGenerataAuto: "",
    righeRicambi: [],
    sanificazionePrezzo: 0,
    collaudoPrezzo: 0,
    manodopera: {
      oreTotali: 1,
      righeAddetti: [{ addetto: "Officina", ore: 1 }],
      costoOrario: infer.costoOrario,
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
