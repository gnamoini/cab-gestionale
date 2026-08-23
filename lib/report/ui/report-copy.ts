/**
 * User-facing copy for Report analytics — titles as questions, not component types.
 */

export const REPORT_FORBIDDEN_TITLE_TERMS = [
  "WIP",
  "SLA",
  "MTBF",
  "MTTR",
  "backlog",
  "funnel",
  "throughput",
  "cross-domain",
  "aging",
  "pipeline",
  "Trend —",
  "Performance",
  "Overview",
] as const;

export type ReportStorySectionId =
  | "lav-situazione"
  | "lav-andamento"
  | "lav-concentrazione"
  | "lav-attenzione"
  | "lav-dettaglio"
  | "lav-strumenti"
  | "mag-situazione"
  | "mag-andamento"
  | "mag-distribuzione"
  | "mag-criticita"
  | "mag-dettaglio"
  | "dip-situazione"
  | "dip-andamento"
  | "dip-dettaglio"
  | "dip-officina"
  | "prev-situazione"
  | "prev-andamento"
  | "prev-distribuzione"
  | "prev-dettaglio"
  | "mez-situazione"
  | "mez-guasti"
  | "mez-dettaglio"
  | "eco-situazione"
  | "eco-andamento"
  | "eco-incassi"
  | "eco-distribuzione"
  | "eco-dettaglio"
  | "cli-situazione"
  | "cli-distribuzione"
  | "cli-andamento"
  | "cli-dettaglio"
  | "cross-situazione"
  | "cross-confronto"
  | "cross-catena"
  | "cross-andamento"
  | "cross-dettaglio"
  | "contesto-eventi"
  | "contesto-timeline"
  | "ai-report"
  | "ai-ask"
  | "ai-decisions"
  | "pan-situazione"
  | "pan-andamento"
  | "pan-cambiamenti"
  | "pan-storico"
  | "pan-dettaglio";

export const REPORT_STORY_COPY: Readonly<
  Record<ReportStorySectionId, { title: string; subtitle?: string }>
> = {
  "lav-situazione": {
    title: "Come stanno andando le lavorazioni?",
    subtitle: "Numeri principali del periodo selezionato",
  },
  "lav-andamento": {
    title: "Il volume di lavoro sta cambiando?",
    subtitle: "Andamento nel tempo rispetto al periodo precedente",
  },
  "lav-concentrazione": {
    title: "Dove si concentra il lavoro aperto?",
    subtitle: "Distribuzione per stato e da quanto tempo sono aperti",
  },
  "lav-attenzione": {
    title: "Quali situazioni meritano attenzione?",
    subtitle: "Lavori oltre il termine previsto",
  },
  "lav-dettaglio": {
    title: "Come si distribuiscono tempi e stati?",
    subtitle: "Dettaglio per priorità e avanzamento",
  },
  "lav-strumenti": {
    title: "Import dati storici",
    subtitle: "Caricamento dati legacy da Excel per analisi storiche",
  },
  "mag-situazione": { title: "Com'è la situazione del magazzino?", subtitle: "Stock e consumi nel periodo" },
  "mag-andamento": { title: "I consumi stanno aumentando o diminuendo?", subtitle: "Andamento mensile" },
  "mag-distribuzione": { title: "Dove si concentra il valore in magazzino?", subtitle: "Per categoria e articoli" },
  "mag-criticita": { title: "Quali articoli sono a rischio?", subtitle: "Sotto scorta e copertura bassa" },
  "mag-dettaglio": { title: "Dettaglio mensile e ranking consumi", subtitle: "Matrice e classifiche" },
  "dip-situazione": { title: "Come stanno le risorse dell'officina?", subtitle: "Ore e presenze nel periodo" },
  "dip-andamento": { title: "Come sono distribuite le ore?", subtitle: "Per dipendente nel periodo" },
  "dip-dettaglio": { title: "Dettaglio ore per dipendente", subtitle: "Tabella completa" },
  "dip-officina": { title: "Come sta andando la produttività in officina?", subtitle: "Presenze e scostamenti" },
  "prev-situazione": { title: "Come vanno i preventivi?", subtitle: "Volume, valore e accettazione nel periodo" },
  "prev-andamento": { title: "Come sta cambiando la situazione?", subtitle: "Andamento mensile nel periodo" },
  "prev-distribuzione": { title: "Dove si concentrano i risultati?", subtitle: "Preventivi accettati e non accettati" },
  "prev-dettaglio": { title: "Dettaglio preventivi", subtitle: "Ripartizione per esito" },
  "mez-situazione": { title: "Come sta performando la flotta?", subtitle: "Disponibilità e affidabilità" },
  "mez-guasti": { title: "Quali mezzi hanno avuto più guasti?", subtitle: "Recidività e tempi tra guasti" },
  "mez-dettaglio": { title: "Dettaglio recidività mezzi", subtitle: "Analisi approfondita" },
  "eco-situazione": { title: "Come stanno andando i risultati?", subtitle: "Fatturato, incassi, costi e margine" },
  "eco-andamento": { title: "Come sono cambiati nel tempo?", subtitle: "Andamento e confronto con il periodo precedente" },
  "eco-incassi": { title: "Qual è la situazione degli incassi?", subtitle: "Crediti, tempi e distribuzione" },
  "eco-distribuzione": { title: "Dove si concentrano i risultati?", subtitle: "Componenti principali del periodo" },
  "eco-dettaglio": { title: "Dettaglio economico", subtitle: "Crediti per cliente e note" },
  "cli-situazione": { title: "Quanto contribuiscono i clienti?", subtitle: "Indicatori principali del periodo" },
  "cli-distribuzione": { title: "Quali clienti hanno il peso maggiore?", subtitle: "Concentrazione del fatturato" },
  "cli-andamento": { title: "Come è cambiata la situazione?", subtitle: "Confronto con il periodo precedente" },
  "cli-dettaglio": { title: "Dettaglio clienti", subtitle: "Elenco e approfondimento" },
  "cross-situazione": { title: "Come si collegano i diversi ambiti?", subtitle: "Indicatori principali del periodo" },
  "cross-confronto": { title: "Come si confrontano tra loro?", subtitle: "Confronti tra aree operative" },
  "cross-catena": { title: "Come si collegano le attività?", subtitle: "Dal preventivo all'incasso" },
  "cross-andamento": { title: "Come cambiano nel tempo?", subtitle: "Andamento comparato nel periodo" },
  "cross-dettaglio": { title: "Dettaglio confronti", subtitle: "Riepilogo metriche trasversali" },
  "contesto-eventi": { title: "Cosa è successo in officina?", subtitle: "Eventi operativi nel periodo" },
  "contesto-timeline": { title: "Come si è sviluppata l'attività?", subtitle: "Cronologia degli eventi nel periodo" },
  "ai-report": { title: "Report generato con intelligenza artificiale", subtitle: "Sintesi automatica del periodo" },
  "ai-ask": { title: "Hai domande sui dati?", subtitle: "Chiedi al Report" },
  "ai-decisions": { title: "Quali decisioni emergono dai dati?", subtitle: "Centro decisioni" },
  "pan-situazione": { title: "Come sta andando l'attività?", subtitle: "Indicatori principali del periodo" },
  "pan-andamento": { title: "Come è cambiato il risultato?", subtitle: "Andamento principale e confronto" },
  "pan-cambiamenti": { title: "Quali sono i principali cambiamenti?", subtitle: "Segnali rilevanti del periodo" },
  "pan-storico": { title: "Com'è l'andamento storico?", subtitle: "Evoluzione nelle ultime settimane o mesi" },
  "pan-dettaglio": { title: "Dettaglio", subtitle: "Informazioni aggiuntive" },
};

export const REPORT_EMPTY_STATE_COPY = {
  insufficient: "Non ci sono dati sufficienti per mostrare questo andamento.",
  noData: "Non ci sono dati per il periodo selezionato.",
  noCompare: "Il confronto con il periodo precedente non è disponibile per questo dato.",
  loading: "Caricamento dati in corso…",
  error: "Impossibile caricare i dati. Riprova.",
} as const;

export function getReportStoryCopy(id: ReportStorySectionId): { title: string; subtitle?: string } {
  return REPORT_STORY_COPY[id];
}
