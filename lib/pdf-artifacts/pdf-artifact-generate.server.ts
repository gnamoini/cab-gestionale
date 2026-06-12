import "server-only";

import { loadBrandingLogoDataUrlServer } from "@/lib/branding/branding-logo-for-pdf.server";
import { fetchBunderDocumentServer } from "@/lib/bunder/bunder-fetch-server";
import { totaleDocumento } from "@/lib/bunder/bunder-generate-default";
import { bunderPdfFileName, generateBunderPdfBytes } from "@/lib/bunder/bunder-pdf-generate";
import { fetchDipendentiPdfContextServer } from "@/lib/dipendenti/dipendenti-pdf-data.server";
import {
  dipendentiComplessivoFileName,
  dipendentiDipendenteFileName,
  generateDipendentiComplessivoPdfBytes,
  generateDipendentiDipendentePdfBytes,
} from "@/lib/dipendenti/pdf/dipendenti-pdf-generate";
import { getLavorazioniAttiveLightServer } from "@/lib/lavorazioni/lavorazioni-list-fetch-server";
import {
  buildLavorazioniInCorsoPdfFileName,
  generateLavorazioniInCorsoPdfBytes,
} from "@/lib/lavorazioni/lavorazioni-list-pdf-generate";
import { mapLavorazioniListRowsToPdfRows } from "@/lib/lavorazioni/lavorazioni-pdf-map";
import { stableHashPayload, type PdfArtifactType } from "@/lib/pdf-artifacts/pdf-artifact-registry";
import {
  getCachedPdfArtifactBytes,
  resolvePdfArtifactRef,
  uploadPdfArtifact,
} from "@/lib/pdf-artifacts/pdf-artifact-storage.server";
import { verifyPdfArtifactReadAccess } from "@/lib/pdf-artifacts/pdf-artifact-rbac.server";
import { fetchPreventivoRecordServer } from "@/lib/preventivi/preventivi-fetch-server";
import {
  generatePreventivoPdfBytes,
  preventivoPdfFileName,
} from "@/lib/preventivi/preventivo-pdf-generate";
import { fetchReportPdfDataSnapshot } from "@/lib/report/report-pdf-data.server";
import {
  buildReportBundlePdfFileName,
  generateReportBundlePdfBytes,
} from "@/lib/report/report-bundle-pdf";
import { fetchSchedaPdfPayloadServer } from "@/lib/schede/schede-fetch-server";
import { generateSchedaPdfBytes, schedaPdfFileName } from "@/lib/schede/schede-pdf-generate";
import type { TimesheetMonthKey } from "@/lib/dipendenti/types";
import { recordAssetCacheAccess } from "@/lib/observability/asset-cache-telemetry.server";
import { traceRuntimeCoordinationServer } from "@/lib/observability/runtime-coordination-tracer.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";

export type PdfArtifactDelivery = {
  bytes: Uint8Array;
  fileName: string;
  cacheStatus: "HIT" | "MISS";
  generateMs: number;
  dataHash: string;
  scopeId: string;
};

export type PdfArtifactQuery = {
  id?: string;
  lavorazioneId?: string;
  month?: string;
  employeeId?: string;
  autore?: string;
};

async function resolvePdfAutore(override?: string): Promise<string> {
  const trimmed = override?.trim();
  if (trimmed) return trimmed;
  const sb = await createSupabaseServerUserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const metaName =
    typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  if (metaName) return metaName;
  const email = user?.email?.split("@")[0]?.trim();
  return email || "Operatore";
}

function reportHashInput(snapshot: Awaited<ReturnType<typeof fetchReportPdfDataSnapshot>>) {
  const { generatedAt: _omit, ...rest } = snapshot;
  return rest;
}

export async function deliverPdfArtifact(
  type: PdfArtifactType,
  query: PdfArtifactQuery,
): Promise<ServiceResult<PdfArtifactDelivery>> {
  const allowed = await verifyPdfArtifactReadAccess(type);
  if (!allowed) return err("Permesso richiesto.");

  const autore = await resolvePdfAutore(query.autore);
  let scopeId = "global";
  let dataHash = "";
  let fileName = "documento.pdf";
  let objectPath = "";

  const t0 = performance.now();
  let cacheStatus: "HIT" | "MISS" = "MISS";
  let bytes: Uint8Array | null = null;

  switch (type) {
    case "lavorazioni-in-corso": {
      const lavRes = await getLavorazioniAttiveLightServer();
      if (!lavRes.success) return err(lavRes.error ?? "Errore caricamento lavorazioni");
      const pdfRows = mapLavorazioniListRowsToPdfRows(lavRes.data ?? []);
      dataHash = stableHashPayload(pdfRows);
      scopeId = "global";
      fileName = buildLavorazioniInCorsoPdfFileName();
      objectPath = resolvePdfArtifactRef(type, scopeId, dataHash).objectPath;
      bytes = await getCachedPdfArtifactBytes(objectPath);
      if (bytes) {
        cacheStatus = "HIT";
        break;
      }
      const logo = await loadBrandingLogoDataUrlServer();
      bytes = generateLavorazioniInCorsoPdfBytes(pdfRows, logo);
      await uploadPdfArtifact(objectPath, bytes);
      break;
    }
    case "report-bundle": {
      const snapshot = await fetchReportPdfDataSnapshot();
      dataHash = stableHashPayload(reportHashInput(snapshot));
      scopeId = "global";
      fileName = buildReportBundlePdfFileName();
      objectPath = resolvePdfArtifactRef(type, scopeId, dataHash).objectPath;
      bytes = await getCachedPdfArtifactBytes(objectPath);
      if (bytes) {
        cacheStatus = "HIT";
        break;
      }
      const logo = await loadBrandingLogoDataUrlServer();
      bytes = generateReportBundlePdfBytes(snapshot, logo);
      await uploadPdfArtifact(objectPath, bytes);
      break;
    }
    case "preventivo": {
      const id = query.id?.trim();
      if (!id) return err("Parametro id mancante");
      const prevRes = await fetchPreventivoRecordServer(id);
      if (!prevRes.success || !prevRes.data) return err(prevRes.error ?? "Preventivo non trovato");
      const p = prevRes.data;
      dataHash = stableHashPayload({
        id: p.id,
        updatedAt: p.aggiornatoAt ?? p.dataCreazione,
        totale: p.totaleFinale,
        righeCount: p.righeRicambi.length,
      });
      scopeId = id;
      fileName = preventivoPdfFileName(p);
      objectPath = resolvePdfArtifactRef(type, scopeId, dataHash).objectPath;
      bytes = await getCachedPdfArtifactBytes(objectPath);
      if (bytes) {
        cacheStatus = "HIT";
        break;
      }
      const logo = await loadBrandingLogoDataUrlServer();
      bytes = generatePreventivoPdfBytes(p, autore, logo);
      await uploadPdfArtifact(objectPath, bytes);
      break;
    }
    case "scheda-ingresso":
    case "scheda-lavorazioni":
    case "scheda-ricambi": {
      const lavorazioneId = query.lavorazioneId?.trim();
      if (!lavorazioneId) return err("Parametro lavorazioneId mancante");
      const kind =
        type === "scheda-ingresso" ? "ingresso" : type === "scheda-lavorazioni" ? "lavorazioni" : "ricambi";
      const schedaRes = await fetchSchedaPdfPayloadServer(lavorazioneId, kind);
      if (!schedaRes.success || !schedaRes.data) return err(schedaRes.error ?? "Scheda non disponibile");
      const payload = schedaRes.data;
      dataHash = stableHashPayload({
        lavorazioneId,
        kind,
        updatedAt: payload.doc.updatedAt ?? payload.doc.createdAt,
        tipo: payload.doc.tipo,
      });
      scopeId = lavorazioneId;
      fileName = schedaPdfFileName({
        doc: payload.doc,
        bundle: payload.bundle,
        titoloScheda: payload.titoloScheda,
      });
      objectPath = resolvePdfArtifactRef(type, scopeId, dataHash).objectPath;
      bytes = await getCachedPdfArtifactBytes(objectPath);
      if (bytes) {
        cacheStatus = "HIT";
        break;
      }
      const logo = await loadBrandingLogoDataUrlServer();
      bytes = generateSchedaPdfBytes({
        titoloScheda: payload.titoloScheda,
        identificazioneLine: payload.identificazioneLine,
        bundle: payload.bundle,
        doc: payload.doc,
        autore,
        logoDataUrl: logo,
        lavorazioneRow: payload.lavorazioneRow,
        mezzoRow: payload.mezzoRow,
      });
      await uploadPdfArtifact(objectPath, bytes);
      break;
    }
    case "dipendenti-aziendale": {
      const month = query.month?.trim() as TimesheetMonthKey | undefined;
      if (!month) return err("Parametro month mancante");
      const ctxRes = await fetchDipendentiPdfContextServer(month);
      if (!ctxRes.success || !ctxRes.data) return err(ctxRes.error ?? "Dati timesheet non disponibili");
      const ctx = ctxRes.data;
      if (ctx.employees.length === 0) return err("Nessun dipendente da esportare");
      dataHash = stableHashPayload({
        month,
        employees: ctx.employees.map((e) => e.id),
        entries: ctx.entries.map((e) => ({
          id: e.id,
          dipendente_id: e.dipendente_id,
          work_date: e.work_date,
          ore_ordinarie: e.ore_ordinarie,
          ore_straordinarie: e.ore_straordinarie,
          ore_assenza: e.ore_assenza,
          tipo_assenza_id: e.tipo_assenza_id,
        })),
      });
      scopeId = month;
      fileName = dipendentiComplessivoFileName(ctx);
      objectPath = resolvePdfArtifactRef(type, scopeId, dataHash).objectPath;
      bytes = await getCachedPdfArtifactBytes(objectPath);
      if (bytes) {
        cacheStatus = "HIT";
        break;
      }
      const logo = await loadBrandingLogoDataUrlServer();
      bytes = await generateDipendentiComplessivoPdfBytes(ctx, logo);
      await uploadPdfArtifact(objectPath, bytes);
      break;
    }
    case "dipendenti-dipendente": {
      const month = query.month?.trim() as TimesheetMonthKey | undefined;
      const employeeId = query.employeeId?.trim();
      if (!month || !employeeId) return err("Parametri month e employeeId richiesti");
      const ctxRes = await fetchDipendentiPdfContextServer(month);
      if (!ctxRes.success || !ctxRes.data) return err(ctxRes.error ?? "Dati timesheet non disponibili");
      const ctx = ctxRes.data;
      const employee = ctx.employees.find((e) => e.id === employeeId);
      if (!employee) return err("Dipendente non trovato");
      dataHash = stableHashPayload({
        month,
        employeeId,
        entries: ctx.entries
          .filter((e) => e.dipendente_id === employeeId)
          .map((e) => ({
            id: e.id,
            work_date: e.work_date,
            ore_ordinarie: e.ore_ordinarie,
            ore_straordinarie: e.ore_straordinarie,
            ore_assenza: e.ore_assenza,
            tipo_assenza_id: e.tipo_assenza_id,
          })),
      });
      scopeId = `${month}/${employeeId}`;
      fileName = dipendentiDipendenteFileName(ctx, employee);
      objectPath = resolvePdfArtifactRef(type, scopeId, dataHash).objectPath;
      bytes = await getCachedPdfArtifactBytes(objectPath);
      if (bytes) {
        cacheStatus = "HIT";
        break;
      }
      const logo = await loadBrandingLogoDataUrlServer();
      bytes = await generateDipendentiDipendentePdfBytes(ctx, employee, logo);
      await uploadPdfArtifact(objectPath, bytes);
      break;
    }
    case "bunder": {
      const id = query.id?.trim();
      if (!id) return err("Parametro id mancante");
      const docRes = await fetchBunderDocumentServer(id);
      if (!docRes.success || !docRes.data) return err(docRes.error ?? "Documento non trovato");
      const doc = docRes.data;
      dataHash = stableHashPayload({
        id: doc.id,
        updatedAt: doc.updatedAt,
        totale: totaleDocumento(doc),
        righeCount: doc.righe.length,
      });
      scopeId = id;
      fileName = bunderPdfFileName(doc);
      objectPath = resolvePdfArtifactRef(type, scopeId, dataHash).objectPath;
      bytes = await getCachedPdfArtifactBytes(objectPath);
      if (bytes) {
        cacheStatus = "HIT";
        break;
      }
      bytes = generateBunderPdfBytes(doc, autore);
      await uploadPdfArtifact(objectPath, bytes);
      break;
    }
    default: {
      const _exhaustive: never = type;
      return err(`Tipo artifact non supportato: ${String(_exhaustive)}`);
    }
  }

  const generateMs = Math.round(performance.now() - t0);
  if (!bytes) return err("Generazione PDF non riuscita");

  traceRuntimeCoordinationServer({
    type: cacheStatus === "HIT" ? "server_cache_hit" : "server_cache_miss",
    entityType: "pdf",
    entityId: scopeId,
    scope: "pdf",
    layer: "pdf",
    meta: { pdfType: type, generateMs, dataHash },
  });
  if (cacheStatus === "MISS") {
    traceRuntimeCoordinationServer({
      type: "asset_regenerated",
      entityType: "pdf",
      entityId: scopeId,
      scope: "pdf",
      layer: "pdf",
      meta: { pdfType: type, generateMs },
    });
  }

  recordAssetCacheAccess({
    assetType: "pdf",
    cacheStatus,
    entityType: "pdf",
    entityId: scopeId,
    latencyMs: generateMs,
    source: cacheStatus === "HIT" ? "storage" : "generated",
    meta: { pdfType: type, dataHash },
  });

  return success({ bytes, fileName, cacheStatus, generateMs, dataHash, scopeId });
}
