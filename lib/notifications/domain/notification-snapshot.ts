/** Immutable snapshot at publish time — survives entity renames. */
export type NotificationSnapshot = {
  customerName?: string;
  vehicleCode?: string;
  partName?: string;
  amount?: string;
  workOrderCode?: string;
  vehicleLabel?: string;
  [key: string]: string | undefined;
};

export function emptySnapshot(): NotificationSnapshot {
  return {};
}
