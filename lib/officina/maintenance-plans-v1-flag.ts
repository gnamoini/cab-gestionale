/**
 * Modulo tagliandi operativi (ore-based).
 * ponytail: attivo di default; kill switch emergenza solo via env `NEXT_PUBLIC_MAINTENANCE_PLANS_V1=0`.
 * Dominio separato da asset_compliance (scadenze legali/calendario).
 */

export function isMaintenancePlansV1Enabled(): boolean {
  return process.env.NEXT_PUBLIC_MAINTENANCE_PLANS_V1?.trim() !== "0";
}
