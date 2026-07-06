import "server-only";

import {
  LAVORAZIONI_LIST_LIGHT_COLUMNS,
  MEZZI_LIST_EMBED_COLUMNS,
  SCHEDA_LAVORAZIONE_COLUMNS,
} from "@/lib/db/table-select-columns";
import { schedaRowsToBundle } from "@/lib/schede/schede-db-mapper";
import { dbTipoToBundleKey } from "@/lib/schede/scheda-tipo-db-mapper";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { LavorazioneSchedeBundle, SchedaIngressoDoc, SchedaLavorazioniDoc, SchedaRicambiDoc } from "@/types/schede";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneRow, MezzoRow, SchedaLavorazioneRow } from "@/src/types/supabase-tables";

export type SchedaPdfServerPayload = {
  bundle: LavorazioneSchedeBundle;
  doc: SchedaIngressoDoc | SchedaLavorazioniDoc | SchedaRicambiDoc;
  identificazioneLine: string;
  titoloScheda: string;
  lavorazioneRow?: LavorazioneListRow;
  mezzoRow?: MezzoRow | null;
};

const SCHEDA_TITLES: Record<string, string> = {
  ingresso: "Scheda ingresso",
  lavorazioni: "Scheda lavorazioni",
  ricambi: "Scheda ricambi",
};

export async function fetchSchedaPdfPayloadServer(
  lavorazioneId: string,
  schedaKind: "ingresso" | "lavorazioni" | "ricambi",
): Promise<ServiceResult<SchedaPdfServerPayload>> {
  const allowed = await verifyServerPageRead("lavorazioni");
  if (!allowed) return err("Permesso richiesto.");
  const sb = await createSupabaseServerUserClient();
  const { data: lav, error: lavErr } = await sb
    .from("lavorazioni")
    .select(LAVORAZIONI_LIST_LIGHT_COLUMNS)
    .eq("id", lavorazioneId)
    .maybeSingle();
  if (lavErr) return err(lavErr.message);
  if (!lav) return err("Lavorazione non trovata");

  const { data: rows, error } = await sb
    .from("scheda_lavorazione")
    .select(SCHEDA_LAVORAZIONE_COLUMNS)
    .eq("lavorazione_id", lavorazioneId);
  if (error) return err(error.message);

  const bundle = schedaRowsToBundle(lavorazioneId, (rows ?? []) as SchedaLavorazioneRow[], (lav as LavorazioneRow).codice);
  const doc =
    schedaKind === "ingresso"
      ? bundle.ingresso
      : schedaKind === "lavorazioni"
        ? bundle.lavorazioni
        : bundle.ricambi;
  if (!doc) return err("Scheda non disponibile.");

  const lavRow = lav as LavorazioneRow;
  let mezzoRow: MezzoRow | null = null;
  if (lavRow.mezzo_id?.trim()) {
    const { data: mezzo, error: mezzoErr } = await sb
      .from("mezzi")
      .select(MEZZI_LIST_EMBED_COLUMNS)
      .eq("id", lavRow.mezzo_id.trim())
      .maybeSingle();
    if (mezzoErr) return err(mezzoErr.message);
    mezzoRow = (mezzo as MezzoRow | null) ?? null;
  }

  const listRow: LavorazioneListRow = { ...lavRow, mezzo: mezzoRow };
  const identParts = [lavRow.codice, lavRow.stato].filter(Boolean);
  return success({
    bundle,
    doc,
    identificazioneLine: identParts.join(" · "),
    titoloScheda: SCHEDA_TITLES[schedaKind] ?? "Scheda",
    lavorazioneRow: listRow,
    mezzoRow,
  });
}

export function schedaArtifactTypeFromKind(kind: string): "scheda-ingresso" | "scheda-lavorazioni" | "scheda-ricambi" | null {
  const key = dbTipoToBundleKey(kind as never);
  if (key === "ingresso") return "scheda-ingresso";
  if (key === "lavorazioni") return "scheda-lavorazioni";
  if (key === "ricambi") return "scheda-ricambi";
  return null;
}
