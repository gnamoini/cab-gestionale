import {
  readMaintenancePlansV1FromRows,
  resolveMaintenancePlansV1Flags,
  type MaintenancePlansV1Flags,
} from "@/lib/officina/maintenance-plans-v1-flag";

let cachedFlags: MaintenancePlansV1Flags | null = null;

export function seedMaintenancePlansV1Flags(rows: Parameters<typeof readMaintenancePlansV1FromRows>[0]): void {
  cachedFlags = resolveMaintenancePlansV1Flags(readMaintenancePlansV1FromRows(rows));
}

export function resolveMaintenancePlansV1EnabledClient(
  dbRows?: Parameters<typeof readMaintenancePlansV1FromRows>[0],
): MaintenancePlansV1Flags {
  if (dbRows) {
    cachedFlags = resolveMaintenancePlansV1Flags(readMaintenancePlansV1FromRows(dbRows));
    return cachedFlags;
  }
  return cachedFlags ?? resolveMaintenancePlansV1Flags(null);
}
