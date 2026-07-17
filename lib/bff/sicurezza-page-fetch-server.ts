import "server-only";

import { cache } from "react";
import { getAppSettingsPayloadReadServer } from "@/lib/app-settings/app-settings-fetch-server";
import { fetchSecurityUsersPermissionsServer } from "@/lib/security/security-users-permissions-fetch-server";
import type { CabAppSettingsQueryPayload } from "@/src/hooks/gestionale/use-settings-queries";
import type { SecurityUsersQueryData } from "@/src/hooks/use-security-users-permissions-query";
import { resolveCabAppSettingsFallbackServer } from "@/lib/app-settings/settings-fallback-server";
import type { ServiceResult } from "@/src/services/service-result";

export type SicurezzaPageDTO = {
  settings: CabAppSettingsQueryPayload;
  usersPermissions: SecurityUsersQueryData;
};

function unwrapSettings(result: ServiceResult<CabAppSettingsQueryPayload>): CabAppSettingsQueryPayload {
  return result.success
    ? (result.data ?? { rows: [], resolved: resolveCabAppSettingsFallbackServer() })
    : { rows: [], resolved: resolveCabAppSettingsFallbackServer() };
}

/** BFF pagina Sicurezza — settings read + users permissions in parallelo. */
export const fetchSicurezzaPageDTOServer = cache(async (): Promise<SicurezzaPageDTO | { error: string }> => {
  const [settingsRes, usersRes] = await Promise.all([
    getAppSettingsPayloadReadServer(),
    fetchSecurityUsersPermissionsServer(),
  ]);
  if (!usersRes.success) return { error: usersRes.error ?? "Errore utenti sicurezza" };
  return {
    settings: unwrapSettings(settingsRes),
    usersPermissions: usersRes.data ?? {
      users: [],
      userPageOverrideRows: [],
      rolePageAccessByRole: {},
      assignableRoles: [],
    },
  };
});
