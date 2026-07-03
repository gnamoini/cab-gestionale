/**
 * Larghezze colonne — solo Portale Clienti (11 col).
 * Solo `width` su `<col>` (no min-width: causa overlap in table-fixed).
 * Percentuali più alte di Lavorazioni: qui mancano Note e Priorità.
 */
export const clientPortalColIngressoClass = "w-[7%]";
export const clientPortalColClienteClass = "w-[10%]";
export const clientPortalColCantiereClass = "w-[8%]";
export const clientPortalColOggettoClass = "w-[10%]";
/** Larghezza uniforme colonne ident — scuderia, targa, matricola. */
export const clientPortalColIdentClass = "w-[6.5rem] gestionale-list-table-col-ident";
export const clientPortalColScuderiaClass = clientPortalColIdentClass;
export const clientPortalColTargaClass = clientPortalColIdentClass;
export const clientPortalColMatricolaClass = clientPortalColIdentClass;

/** 3 pulsanti icona — portale compatto. */
export const clientPortalColAzioniClass = "w-[6rem]";

export const gestionaleClientPortalDenseTableClass =
  "gestionale-lavorazioni-dense-table gestionale-client-portal-dense-table";
