"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useSecurityUsersPermissionsQuery } from "@/src/hooks/use-security-users-permissions-query";
import { QK } from "@/src/lib/react-query/query-keys";

/** Sicurezza page: hydration dedup su `security.usersPermissions` (SERVER_OWNER /sicurezza). */
export function useSicurezzaUsersPermissionsQuery(enabled = true) {
  const qc = useQueryClient();
  // ponytail: tier static — skip mount refetch when SSR BFF seeded the cache
  const hasHydratedUsers = qc.getQueryData(QK.securityUsersPermissions) != null;
  return useSecurityUsersPermissionsQuery(enabled, { skipMountRefetch: hasHydratedUsers });
}
