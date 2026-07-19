import "server-only";

import { cache } from "react";
import { sanitizeClientLavorazioneRow } from "@/lib/lavorazioni/client-portal-stati";
import { fetchEnrichedLavorazioneListRow } from "@/lib/lavorazioni/fetch-enriched-lavorazione-row";
import { resolveLavorazioniStatiForServer } from "@/lib/app-settings/resolve-settings-for-server";
import { verifyClientLavorazioniAccessServer } from "@/src/lib/auth/client-lavorazioni-access-server";
import { loadServerCallerClienteRef } from "@/src/lib/auth/cliente-portal-scope.server";
import { lavorazioneMatchesClienteScope } from "@/src/lib/auth/cliente-portal-scope";
import { resolveRole } from "@/lib/auth/rbac";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { ClientLavorazioneDetail } from "@/src/services/client-lavorazioni.service";
import { err, success, type ServiceResult } from "@/src/services/service-result";

/** BFF detail portale clienti — singola lavorazione + scope cliente. */
export const fetchClientPortalDetailDTOServer = cache(
  async (lavorazioneId: string): Promise<ServiceResult<ClientLavorazioneDetail>> => {
    const allowed = await verifyClientLavorazioniAccessServer();
    if (!allowed) return err("Permesso richiesto.");

    const id = lavorazioneId.trim();
    if (!id) return err("Lavorazione non valida.");

    const sb = await createSupabaseServerUserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user?.id) return err("Permesso richiesto.");

    const enriched = await fetchEnrichedLavorazioneListRow(sb, id);
    if (!enriched) return err("Lavorazione non trovata.");

    const settingsStati = await resolveLavorazioniStatiForServer();
    const row = sanitizeClientLavorazioneRow(enriched, settingsStati);

    const { data: prof } = await sb.from("profiles").select("role_key").eq("id", user.id).maybeSingle();
    const role = resolveRole(prof?.role_key);
    const clienteRef = await loadServerCallerClienteRef(sb);
    if (
      !lavorazioneMatchesClienteScope(row, clienteRef, {
        failClosedForClienteRole: true,
        role,
      })
    ) {
      return err("Lavorazione non trovata.");
    }

    return success({ row });
  },
);
