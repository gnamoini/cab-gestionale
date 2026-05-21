export function isSchedeDbPrimary(): boolean {
  return process.env.NEXT_PUBLIC_SCHEDE_DB_PRIMARY === "true";
}
