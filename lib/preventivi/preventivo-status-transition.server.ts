import "server-only";

import { loadBrandingLogoDataUrlServer } from "@/lib/branding/branding-logo-for-pdf.server";
import { fetchClienteAnagraficaByLabelServer } from "@/lib/clienti/clienti-anagrafica-fetch.server";
import { emitPreventivoStatusChanged } from "@/lib/preventivi/events/emit-preventivo-status-changed";
import { canTransitionPreventivoStato } from "@/lib/preventivi/preventivo-transitions";
import { fetchPreventivoRecordServer } from "@/lib/preventivi/preventivi-fetch-server";
import {
  generatePreventivoPdfBytes,
  preventivoPdfFileName,
} from "@/lib/preventivi/preventivo-pdf-generate";
import type { PreventivoStato } from "@/lib/preventivi/types";
import { stableHashPayload } from "@/lib/pdf-artifacts/pdf-artifact-registry";
import { buildPdfArtifactObjectPath } from "@/lib/pdf-artifacts/pdf-artifact-paths";
import { uploadPdfArtifact } from "@/lib/pdf-artifacts/pdf-artifact-storage.server";
import { verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { auditContext, auditDiff, writeModificaLog } from "@/src/services/internal/audit-log";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { PreventivoRow } from "@/src/types/supabase-tables";

const ENTITA = "preventivi";

export type TransitionPreventivoStatusInput = {
  preventivoId: string;
  to: PreventivoStato;
  autore?: string;
};

export async function transitionPreventivoStatusServer(
  input: TransitionPreventivoStatusInput,
): Promise<ServiceResult<PreventivoRow>> {
  const allowed = await verifyServerPageWrite("preventivi");
  if (!allowed) return err("Permesso richiesto.");

  const { preventivoId, to, autore } = input;
  if (to === "bozza") return err("Transizione a bozza non consentita.");

  const recordRes = await fetchPreventivoRecordServer(preventivoId);
  if (!recordRes.success || !recordRes.data) {
    return err(recordRes.error ?? "Preventivo non trovato.");
  }
  const record = recordRes.data;
  const from = record.stato;

  if (!canTransitionPreventivoStato(from, to)) {
    return err(`Transizione non consentita: ${from} → ${to}`);
  }

  const sb = await createSupabaseServerUserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  const { data: before, error: beforeErr } = await sb
    .from("preventivi")
    .select("id, stato, numero, dettagli, updated_at")
    .eq("id", preventivoId)
    .maybeSingle();
  if (beforeErr) return err(beforeErr.message);
  if (!before) return err("Preventivo non trovato.");

  let artifactPayload: { storage_path: string; hash: string } | null = null;

  if (to === "inviato") {
    try {
      const logo = await loadBrandingLogoDataUrlServer();
      const clientePdf = await fetchClienteAnagraficaByLabelServer(record.cliente);
      const bytes = generatePreventivoPdfBytes(record, autore?.trim() || "Operatore", logo, clientePdf ?? undefined);
      const hash = stableHashPayload({
        id: record.id,
        numero: record.numero,
        totale: record.totaleFinale,
        righe: record.righeRicambi,
        stato: "inviato",
      });
      const storagePath = buildPdfArtifactObjectPath("preventivo", record.id, hash);
      await uploadPdfArtifact(storagePath, bytes);
      artifactPayload = { storage_path: storagePath, hash };
      void preventivoPdfFileName(record);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Generazione PDF non riuscita";
      return err(message);
    }
  }

  const { data: row, error: rpcErr } = await sb.rpc("commit_preventivo_status_transition", {
    p_preventivo_id: preventivoId,
    p_to_stato: to,
    p_artifact: artifactPayload,
    p_confermato_by: to === "confermato" ? user?.id ?? null : null,
  });

  if (rpcErr) return err(rpcErr.message);
  if (!row) return err("Transizione stato non riuscita.");

  const after = row as PreventivoRow;
  const numero =
    typeof (after.dettagli as Record<string, unknown>)?.numero === "string"
      ? String((after.dettagli as Record<string, unknown>).numero)
      : preventivoId;

  await writeModificaLog(sb, {
    entita: ENTITA,
    entita_id: preventivoId,
    azione: "UPDATE",
    payload: auditDiff({ stato: from }, { stato: to }, auditContext(numero)),
  });

  emitPreventivoStatusChanged({
    preventivo_id: preventivoId,
    from,
    to,
    user_id: user?.id ?? "",
    timestamp: new Date().toISOString(),
    pdf_artifact_id: after.current_pdf_artifact_id ?? undefined,
    confermato_by: to === "confermato" ? after.confermato_by ?? user?.id ?? undefined : undefined,
  });

  return success(after);
}
