/** Moduli `app_settings.module` */
export const CAB_SETTINGS_MODULE = {
  lavorazioni: "lavorazioni",
  mezzi: "mezzi",
  magazzino: "magazzino",
  preventivi: "preventivi",
  dipendenti: "dipendenti",
  system: "system",
  entityResolution: "entity_resolution",
} as const;

/** Chiavi `app_settings.key` per modulo */
export const CAB_SETTINGS_KEY = {
  prefs: "prefs",
  liste: "liste",
  master: "master",
  stockPolicy: "stock_policy",
  defaults: "defaults",
  branding: "branding",
  aliases: "aliases",
} as const;

export type CabSettingsModule = (typeof CAB_SETTINGS_MODULE)[keyof typeof CAB_SETTINGS_MODULE];
export type CabSettingsKey = (typeof CAB_SETTINGS_KEY)[keyof typeof CAB_SETTINGS_KEY];
