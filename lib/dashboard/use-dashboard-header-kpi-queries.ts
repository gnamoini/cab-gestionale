"use client";

import { usePreventiviRecordsQuery } from "@/src/hooks/gestionale/use-preventivi-records-query";
import { useInvoicesQuery } from "@/src/hooks/gestionale/use-invoices-query";

/** KPI header dashboard — query isolate per defer/gate dal widget header. */
export function useDashboardHeaderKpiQueries(opts: {
  enabled: boolean;
  canPreventivi: boolean;
  canFatturazione: boolean;
}) {
  const { enabled, canPreventivi, canFatturazione } = opts;
  const preventiviQ = usePreventiviRecordsQuery(enabled && canPreventivi);
  const invoicesQ = useInvoicesQuery(enabled && canFatturazione);
  return { preventiviQ, invoicesQ };
}
