/**
 * Larghezze colonne — solo Portale Clienti (11 col).
 * Solo `width` su `<col>` (no min-width: causa overlap in table-fixed).
 * Percentuali più alte di Lavorazioni: qui mancano Note e Priorità.
 */
export const clientPortalColIngressoClass = "w-[7%]";
export const clientPortalColClienteClass = "w-[10%]";
export const clientPortalColCantiereClass = "w-[8%]";
export const clientPortalColOggettoClass = "w-[14%]";
/** Larghezze ident portale — uniformi (scuderia, targa, matricola). */
const clientPortalColIdentUniformClass = "w-[5.25rem] gestionale-list-table-col-ident";
export const clientPortalColScuderiaClass = clientPortalColIdentUniformClass;
export const clientPortalColTargaClass = clientPortalColIdentUniformClass;
export const clientPortalColMatricolaClass = clientPortalColIdentUniformClass;

/** Stato portale — larghezza fissa (evita espansione table-fixed). */
export const clientPortalColStatoClass = "gestionale-client-portal-col-stato";

/** 3 pulsanti icona — portale compatto. */
export const clientPortalColAzioniClass = "w-[6rem]";

export const gestionaleClientPortalDenseTableClass =
  "gestionale-lavorazioni-dense-table gestionale-client-portal-dense-table";
