import "server-only";

import { cache } from "react";
import { clienteAnagraficaRowsToUi } from "@/lib/clienti/clienti-anagrafica-db-adapter";
import type { ClienteAnagrafica } from "@/lib/clienti/clienti-anagrafica-types";
import {
  CLIENTI_ANAGRAFICHE_COLUMNS_WITH_META,
  CLIENTI_CONTATTI_COLUMNS,
  CLIENTI_SEDI_COLUMNS,
} from "@/lib/db/table-select-columns";
import { buildClienteEntityKey } from "@/lib/validation/entity-keys";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type {
  ClienteAnagraficaRow,
  ClienteContattoRow,
  ClienteSedeRow,
} from "@/src/types/supabase-tables";

export type ClienteAnagraficaPdfData = {
  anagrafica: ClienteAnagrafica;
  codiceFiscale: string;
  updatedAt: string;
};

function codiceFiscaleFromMeta(meta: Record<string, unknown> | null | undefined): string {
  const v = meta?.codice_fiscale;
  return typeof v === "string" ? v.trim().toUpperCase() : "";
}

export const fetchClienteAnagraficaByLabelServer = cache(
  async (clienteLabel: string): Promise<ClienteAnagraficaPdfData | null> => {
    const trimmed = clienteLabel.trim();
    if (!trimmed) return null;
    const entityKey = buildClienteEntityKey(trimmed);
    if (!entityKey) return null;

    const sb = await createSupabaseServerUserClient();
    const { data: header, error } = await sb
      .from("clienti_anagrafiche")
      .select(CLIENTI_ANAGRAFICHE_COLUMNS_WITH_META)
      .eq("entity_key", entityKey)
      .maybeSingle();
    if (error || !header) return null;

    const row = header as ClienteAnagraficaRow;
    const [sediRes, contRes] = await Promise.all([
      sb.from("clienti_sedi").select(CLIENTI_SEDI_COLUMNS).eq("cliente_id", row.id),
      sb.from("clienti_contatti").select(CLIENTI_CONTATTI_COLUMNS).eq("cliente_id", row.id).order("ordine"),
    ]);
    if (sediRes.error || contRes.error) return null;

    return {
      anagrafica: clienteAnagraficaRowsToUi(
        row,
        (sediRes.data ?? []) as ClienteSedeRow[],
        (contRes.data ?? []) as ClienteContattoRow[],
      ),
      codiceFiscale: codiceFiscaleFromMeta(row.meta),
      updatedAt: row.updated_at,
    };
  },
);
