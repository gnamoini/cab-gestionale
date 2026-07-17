/**
 * Facade PWA per policy React Query — non duplica numeri, re-esporta SSOT esistenti.
 */

import {
  GESTIONALE_SEMI_QUERY_POLICY,
  GESTIONALE_STATIC_QUERY_POLICY,
  dynamicCoreQueryOpts,
  dynamicReportQueryOpts,
} from "@/lib/react-query/data-cache-tiers";
import {
  GESTIONALE_CORE_QUERY_POLICY,
  GESTIONALE_REPORT_QUERY_POLICY,
  GESTIONALE_VIEW_QUERY_POLICY,
} from "@/lib/react-query/query-layer-policies";

export type PwaQueryGroup =
  | "staticCatalog"
  | "semiCatalog"
  | "operationalCore"
  | "reportAggregates"
  | "securityAudit"
  | "permissionsTruth";

export const PWA_QUERY_CLIENT_DEFAULTS = {
  staleTime: GESTIONALE_CORE_QUERY_POLICY.staleTime,
  gcTime: 300_000,
  retry: 1,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
} as const;

const SECURITY_AUDIT_POLICY = {
  staleTime: 120_000,
  gcTime: 900_000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchOnMount: true,
  retry: 1,
} as const;

const PERMISSIONS_TRUTH_POLICY = {
  staleTime: Number.POSITIVE_INFINITY,
  gcTime: 86_400_000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  retry: 1,
} as const;

export const PWA_QUERY_GROUP_POLICIES: Record<
  PwaQueryGroup,
  {
    staleTime: number;
    gcTime?: number;
    refetchOnReconnect: boolean;
    refetchOnWindowFocus: boolean;
  }
> = {
  staticCatalog: {
    staleTime: GESTIONALE_STATIC_QUERY_POLICY.staleTime,
    gcTime: GESTIONALE_STATIC_QUERY_POLICY.gcTime,
    refetchOnReconnect: GESTIONALE_STATIC_QUERY_POLICY.refetchOnReconnect,
    refetchOnWindowFocus: GESTIONALE_STATIC_QUERY_POLICY.refetchOnWindowFocus,
  },
  semiCatalog: {
    staleTime: GESTIONALE_SEMI_QUERY_POLICY.staleTime,
    gcTime: GESTIONALE_SEMI_QUERY_POLICY.gcTime,
    refetchOnReconnect: GESTIONALE_SEMI_QUERY_POLICY.refetchOnReconnect,
    refetchOnWindowFocus: GESTIONALE_SEMI_QUERY_POLICY.refetchOnWindowFocus,
  },
  operationalCore: {
    staleTime: dynamicCoreQueryOpts().staleTime,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
  },
  reportAggregates: {
    staleTime: dynamicReportQueryOpts().staleTime,
    gcTime: dynamicReportQueryOpts().gcTime,
    refetchOnReconnect: dynamicReportQueryOpts().refetchOnReconnect,
    refetchOnWindowFocus: dynamicReportQueryOpts().refetchOnWindowFocus,
  },
  securityAudit: {
    staleTime: SECURITY_AUDIT_POLICY.staleTime,
    gcTime: SECURITY_AUDIT_POLICY.gcTime,
    refetchOnReconnect: SECURITY_AUDIT_POLICY.refetchOnReconnect,
    refetchOnWindowFocus: SECURITY_AUDIT_POLICY.refetchOnWindowFocus,
  },
  permissionsTruth: {
    staleTime: PERMISSIONS_TRUTH_POLICY.staleTime,
    gcTime: PERMISSIONS_TRUTH_POLICY.gcTime,
    refetchOnReconnect: PERMISSIONS_TRUTH_POLICY.refetchOnReconnect,
    refetchOnWindowFocus: PERMISSIONS_TRUTH_POLICY.refetchOnWindowFocus,
  },
};

export function shouldRefetchPwaGroupOnReconnect(group: PwaQueryGroup): boolean {
  return PWA_QUERY_GROUP_POLICIES[group].refetchOnReconnect;
}

export function pwaQueryGroupMeta(group: PwaQueryGroup) {
  return { pwaQueryGroup: group } as const;
}

export {
  GESTIONALE_CORE_QUERY_POLICY,
  GESTIONALE_REPORT_QUERY_POLICY,
  GESTIONALE_VIEW_QUERY_POLICY,
  GESTIONALE_STATIC_QUERY_POLICY,
  GESTIONALE_SEMI_QUERY_POLICY,
};
