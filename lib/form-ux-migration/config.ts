/** Opt-out globale: `NEXT_PUBLIC_FORM_UX_MIGRATION=0` forza legacy su tutti i campi. */
export function isFormUxMigrationEnabled(override?: boolean): boolean {
  if (override !== undefined) return override;
  return process.env.NEXT_PUBLIC_FORM_UX_MIGRATION !== "0";
}
