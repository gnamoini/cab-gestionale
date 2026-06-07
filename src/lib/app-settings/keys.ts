/** Moduli `app_settings.module` */
export const CAB_SETTINGS_MODULE = {
  lavorazioni: "lavorazioni",
  mezzi: "mezzi",
  magazzino: "magazzino",
  preventivi: "preventivi",
  dipendenti: "dipendenti",
  system: "system",
} as const;

/** Chiavi `app_settings.key` per modulo */
export const CAB_SETTINGS_KEY = {
  prefs: "prefs",
  liste: "liste",
  master: "master",
  defaults: "defaults",
  branding: "branding",
} as const;

export type CabSettingsModule = (typeof CAB_SETTINGS_MODULE)[keyof typeof CAB_SETTINGS_MODULE];
export type CabSettingsKey = (typeof CAB_SETTINGS_KEY)[keyof typeof CAB_SETTINGS_KEY];
