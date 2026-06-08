/** Opt-out globale: `NEXT_PUBLIC_FORM_ENGINE=0` disabilita ios guard nei path FSE (flush resta attivo). */
export function isFormEngineEnabled(override?: boolean): boolean {
  if (override !== undefined) return override;
  return process.env.NEXT_PUBLIC_FORM_ENGINE !== "0";
}
