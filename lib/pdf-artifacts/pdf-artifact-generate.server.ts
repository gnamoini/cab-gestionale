import "server-only";

import { loadBrandingLogoDataUrlServer } from "@/lib/branding/branding-logo-for-pdf.server";
import { fetchDipendentiPdfContextServer } from "@/lib/dipendenti/dipendenti-pdf-data.server";
import {
  dipendentiComplessivoFileName,
  dipendentiDipendenteFileName,
  generateDipendentiComplessivoPdfBytes,
  generateDipendentiDipendentePdfBytes,
} from "@/lib/dipendenti/pdf/dipendenti-pdf-generate";
import { fetchCabAppSettingsPayloadServer } from "@/lib/app-settings/resolve-settings-for-server";
import { LAVORAZIONI_ATTIVE_LIGHT_FILTERS } from "@/lib/lavorazioni/lavorazioni-prefetch-filters";
import { fetchLavorazioniListAuthorizedServer } from "@/lib/lavorazioni/lavorazioni-list-fetch-server";
import {
  buildLavorazioniInCorsoPdfFileName,
  generateLavorazioniInCorsoPdfBytes,
} from "@/lib/lavorazioni/lavorazioni-list-pdf-generate";
import {
  LAVORAZIONI_IN_CORSO_PDF_MAP_VERSION,
  mapLavorazioniListRowsToPdfRows,
} from "@/lib/lavorazioni/lavorazioni-pdf-map";
import { createPdfPhaseTimer, type PdfDeliveryPhases } from "@/lib/pdf/core/pdf-delivery-phases";
import { stableHashPayload, type PdfArtifactType } from "@/lib/pdf-artifacts/pdf-artifact-registry";
import {
  buildDdtPdfHashInput,
  buildPreventivoPdfHashInput,
  fatturaPdfFileNameFromMeta,
  fetchDdtPdfHashMetaServer,
  fetchFatturaPdfHashMetaServer,
  fetchOrdineFornitorePdfHashMetaServer,
  fetchPreventivoPdfHashMetaServer,
  fetchSchedaPdfHashMetaServer,
  ordineFornitorePdfFileNameFromMeta,
  resolveClienteAnagUpdatedAt,
} from "@/lib/pdf-artifacts/pdf-artifact-metadata.server";
import {
  getCachedPdfArtifactBytes,
  resolvePdfArtifactRef,
  uploadPdfArtifactBestEffort,
} from "@/lib/pdf-artifacts/pdf-artifact-storage.server";
import { verifyPdfArtifactReadAccess } from "@/lib/pdf-artifacts/pdf-artifact-rbac.server";
import { fetchInvoiceDetailServer } from "@/lib/fatturazione/fatturazione-fetch-server";
import { generateInvoicePdfBytes, invoicePdfFileName } from "@/lib/fatturazione/invoice-pdf-generate";
import { fetchClienteAnagraficaByLabelServer } from "@/lib/clienti/clienti-anagrafica-fetch.server";
import { fetchDdtDetailServer } from "@/lib/ddt/ddt-fetch-server";
import { ddtPdfFileName, generateDdtPdfBytes } from "@/lib/ddt/ddt-pdf-generate";
import { ddtDisplayNumber } from "@/lib/ddt/ddt-list-ui-filters";
import { fetchOrdineFornitoreRecordServer } from "@/lib/ordini-fornitori/ordine-fornitore-fetch-server";
import {
  generateOrdineFornitorePdfBytes,
  ordineFornitorePdfFileName,
} from "@/lib/ordini-fornitori/ordine-fornitore-pdf-generate";
import { buildPreventivoPdfDownloadFileName } from "@/lib/preventivi/preventivo-pdf-filename";
import { fetchPreventivoRecordServer } from "@/lib/preventivi/preventivi-fetch-server";
import {
  generatePreventivoPdfBytes,
} from "@/lib/preventivi/preventivo-pdf-generate";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import { fetchReportPdfDataSnapshot } from "@/lib/report/report-pdf-data.server";
import {
  buildReportBundlePdfFileName,
  generateReportBundlePdfBytes,
} from "@/lib/report/report-bundle-pdf";
import { fetchSchedeBundlesStoreServer } from "@/lib/schede/schede-bundles-fetch-server";
import { fetchSchedaPdfPayloadServer } from "@/lib/schede/schede-fetch-server";
import { generateSchedaPdfBytes, schedaPdfFileName } from "@/lib/schede/schede-pdf-generate";
import type { TimesheetMonthKey } from "@/lib/dipendenti/types";
import { recordAssetCacheAccess } from "@/lib/observability/asset-cache-telemetry.server";
import { traceRuntimeCoordinationServer } from "@/lib/observability/runtime-coordination-tracer.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import { err, success, type ServiceResult } from "@/src/services/service-result";

export type PdfArtifactDelivery = {
  bytes: Uint8Array;
  fileName: string;
  cacheStatus: "HIT" | "MISS";
  generateMs: number;
  dataHash: string;
  scopeId: string;
  phases: PdfDeliveryPhases;
};

export type PdfArtifactQuery = {
  id?: string;
  lavorazioneId?: string;
  month?: string;
  employeeId?: string;
  autore?: string;
  skipRbac?: boolean;
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
  const { generatedAt: _generatedAt, ...rest } = snapshot;
  void _generatedAt;
  return rest;
}

function codiciMapFromLavorazioneRows(rows: readonly LavorazioneListRow[]): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const row of rows) out[row.id] = row.codice ?? null;
  return out;
}

function ddtPdfFileNameFromMeta(meta: {
  clienteLabel: string;
  numero: number | null;
  anno: number;
}): string {
  const safe = meta.clienteLabel.replace(/[^\w\-]+/g, "_").slice(0, 40);
  const display = ddtDisplayNumber({ numero: meta.numero, anno: meta.anno });
  return `DDT_${display.replace("/", "-")}_${safe}.pdf`;
}

function preventivoFileNameFromMeta(meta: {
  numero: string;
  cliente: string;
  dataCreazione: string;
  tipoDocumento: PreventivoRecord["tipoDocumento"];
}): string {
  return buildPreventivoPdfDownloadFileName({
    numero: meta.numero,
    cliente: meta.cliente,
    dataCreazione: meta.dataCreazione,
    tipoDocumento: meta.tipoDocumento,
  } as PreventivoRecord);
}

async function loadStorageArtifact(objectPath: string): Promise<Uint8Array | null> {
  return getCachedPdfArtifactBytes(objectPath);
}

export async function deliverPdfArtifact(
  type: PdfArtifactType,
  query: PdfArtifactQuery,
): Promise<ServiceResult<PdfArtifactDelivery>> {
  try {
    return await deliverPdfArtifactInner(type, query);
  } catch (error) {
    console.error("[pdf-artifact] deliver failed:", error);
    return err(error instanceof Error ? error.message : "Generazione PDF non riuscita");
  }
}

async function deliverPdfArtifactInner(
  type: PdfArtifactType,
  query: PdfArtifactQuery,
): Promise<ServiceResult<PdfArtifactDelivery>> {
  const phases = createPdfPhaseTimer();

  const allowed = query.skipRbac === true || (await verifyPdfArtifactReadAccess(type));
  if (!allowed) return err("Permesso richiesto.");
  phases.markAuthEnd();

  let scopeId = "global";
  let dataHash = "";
  let fileName = "documento.pdf";
  let cacheStatus: "HIT" | "MISS" = "MISS";
  let bytes: Uint8Array | null = null;

  switch (type) {
    case "lavorazioni-in-corso": {
      const [lavRes, settingsPayload] = await Promise.all([
        fetchLavorazioniListAuthorizedServer(LAVORAZIONI_ATTIVE_LIGHT_FILTERS),
        fetchCabAppSettingsPayloadServer(),
      ]);
      phases.markDataFetchEnd();
      if (!lavRes.success) return err(lavRes.error ?? "Errore caricamento lavorazioni");
      const lavRows = lavRes.data ?? [];
      const schedeRes =
        lavRows.length > 0
          ? await fetchSchedeBundlesStoreServer(lavRows.map((r) => r.id), codiciMapFromLavorazioneRows(lavRows))
          : { success: true as const, data: {} };
      const pdfRows = mapLavorazioniListRowsToPdfRows(lavRows, {
        stati: settingsPayload.resolved.lavorazioni.stati,
        schedeStore: schedeRes.success ? (schedeRes.data ?? {}) : {},
        addettiRecords: settingsPayload.resolved.lavorazioni.addettiRecords,
      });
      dataHash = stableHashPayload({ v: LAVORAZIONI_IN_CORSO_PDF_MAP_VERSION, rows: pdfRows });
      phases.markHashEnd();
      scopeId = "global";
      fileName = buildLavorazioniInCorsoPdfFileName();
      const objectPath = resolvePdfArtifactRef(type, scopeId, dataHash).objectPath;
      bytes = await loadStorageArtifact(objectPath);
      phases.markStorageEnd();
      if (bytes) {
        cacheStatus = "HIT";
        break;
      }
      const logo = await loadBrandingLogoDataUrlServer();
      bytes = generateLavorazioniInCorsoPdfBytes(pdfRows, logo);
      phases.markGenerateEnd();
      await uploadPdfArtifactBestEffort(objectPath, bytes);
      phases.markUploadEnd();
      break;
    }
    case "report-bundle": {
      const snapshot = await fetchReportPdfDataSnapshot();
      phases.markDataFetchEnd();
      dataHash = stableHashPayload(reportHashInput(snapshot));
      phases.markHashEnd();
      scopeId = "global";
      fileName = buildReportBundlePdfFileName();
      const objectPath = resolvePdfArtifactRef(type, scopeId, dataHash).objectPath;
      bytes = await loadStorageArtifact(objectPath);
      phases.markStorageEnd();
      if (bytes) {
        cacheStatus = "HIT";
        break;
      }
      const logo = await loadBrandingLogoDataUrlServer();
      bytes = generateReportBundlePdfBytes(snapshot, logo);
      phases.markGenerateEnd();
      await uploadPdfArtifactBestEffort(objectPath, bytes);
      phases.markUploadEnd();
      break;
    }
    case "preventivo": {
      const id = query.id?.trim();
      if (!id) return err("Parametro id mancante");
      const meta = await fetchPreventivoPdfHashMetaServer(id);
      if (!meta) return err("Preventivo non trovato");
      const anagUpdatedAt = await resolveClienteAnagUpdatedAt(meta.cliente);
      phases.markDataFetchEnd();
      dataHash = stableHashPayload(buildPreventivoPdfHashInput(meta, anagUpdatedAt));
      phases.markHashEnd();
      scopeId = id;
      fileName = preventivoFileNameFromMeta(meta);
      const objectPath = resolvePdfArtifactRef(type, scopeId, dataHash).objectPath;
      bytes = await loadStorageArtifact(objectPath);
      phases.markStorageEnd();
      if (bytes) {
        cacheStatus = "HIT";
        break;
      }
      const [autore, prevRes, logo] = await Promise.all([
        resolvePdfAutore(query.autore),
        fetchPreventivoRecordServer(id),
        loadBrandingLogoDataUrlServer(),
      ]);
      if (!prevRes.success || !prevRes.data) return err(prevRes.error ?? "Preventivo non trovato");
      const p = prevRes.data;
      const clienteAnag = await fetchClienteAnagraficaByLabelServer(p.cliente);
      bytes = generatePreventivoPdfBytes(p, autore, logo, {
        clienteAnagrafica: clienteAnag?.anagrafica ?? null,
        codiceFiscale: clienteAnag?.codiceFiscale,
      });
      phases.markGenerateEnd();
      await uploadPdfArtifactBestEffort(objectPath, bytes);
      phases.markUploadEnd();
      break;
    }
    case "fattura": {
      const id = query.id?.trim();
      if (!id) return err("Parametro id mancante");
      const meta = await fetchFatturaPdfHashMetaServer(id);
      if (!meta) return err("Fattura non trovata");
      phases.markDataFetchEnd();
      dataHash = stableHashPayload({
        id: meta.id,
        updatedAt: meta.updatedAt,
        totale: meta.totale,
        status: meta.status,
      });
      phases.markHashEnd();
      scopeId = id;
      fileName = fatturaPdfFileNameFromMeta(meta);
      const objectPath = resolvePdfArtifactRef(type, scopeId, dataHash).objectPath;
      bytes = await loadStorageArtifact(objectPath);
      phases.markStorageEnd();
      if (bytes) {
        cacheStatus = "HIT";
        break;
      }
      const invRes = await fetchInvoiceDetailServer(id);
      if (!invRes.success || !invRes.data) return err(invRes.error ?? "Fattura non trovata");
      const detail = invRes.data;
      fileName = invoicePdfFileName(detail);
      const logo = await loadBrandingLogoDataUrlServer();
      bytes = generateInvoicePdfBytes(detail, logo);
      phases.markGenerateEnd();
      await uploadPdfArtifactBestEffort(objectPath, bytes);
      phases.markUploadEnd();
      break;
    }
    case "ddt": {
      const id = query.id?.trim();
      if (!id) return err("Parametro id mancante");
      const meta = await fetchDdtPdfHashMetaServer(id);
      if (!meta) return err("DDT non trovato");
      const anagUpdatedAt = await resolveClienteAnagUpdatedAt(meta.clienteLabel);
      phases.markDataFetchEnd();
      dataHash = stableHashPayload(buildDdtPdfHashInput(meta, anagUpdatedAt));
      phases.markHashEnd();
      scopeId = id;
      fileName = ddtPdfFileNameFromMeta({
        clienteLabel: meta.clienteLabel,
        numero: meta.numero,
        anno: meta.anno,
      });
      const objectPath = resolvePdfArtifactRef(type, scopeId, dataHash).objectPath;
      bytes = await loadStorageArtifact(objectPath);
      phases.markStorageEnd();
      if (bytes) {
        cacheStatus = "HIT";
        break;
      }
      const detail = await fetchDdtDetailServer(id);
      if (!detail) return err("DDT non trovato");
      fileName = ddtPdfFileName(detail);
      const [clienteAnag, logo] = await Promise.all([
        fetchClienteAnagraficaByLabelServer(detail.document.cliente_label),
        loadBrandingLogoDataUrlServer(),
      ]);
      bytes = generateDdtPdfBytes(detail, logo, {
        clienteAnagrafica: clienteAnag?.anagrafica ?? null,
        codiceFiscale: clienteAnag?.codiceFiscale,
      });
      phases.markGenerateEnd();
      await uploadPdfArtifactBestEffort(objectPath, bytes);
      phases.markUploadEnd();
      break;
    }
    case "ordine-fornitore": {
      const id = query.id?.trim();
      if (!id) return err("Parametro id mancante");
      const meta = await fetchOrdineFornitorePdfHashMetaServer(id);
      if (!meta) return err("Ordine non trovato");
      phases.markDataFetchEnd();
      dataHash = stableHashPayload({
        id: meta.id,
        updatedAt: meta.updatedAt,
        status: meta.status,
        totale: meta.totale,
        righeCount: meta.righeCount,
      });
      phases.markHashEnd();
      scopeId = id;
      fileName = ordineFornitorePdfFileNameFromMeta(meta);
      const objectPath = resolvePdfArtifactRef(type, scopeId, dataHash).objectPath;
      bytes = await loadStorageArtifact(objectPath);
      phases.markStorageEnd();
      if (bytes) {
        cacheStatus = "HIT";
        break;
      }
      const record = await fetchOrdineFornitoreRecordServer(id);
      if (!record) return err("Ordine non trovato");
      fileName = ordineFornitorePdfFileName(record);
      const logo = await loadBrandingLogoDataUrlServer();
      bytes = generateOrdineFornitorePdfBytes(record, logo);
      phases.markGenerateEnd();
      await uploadPdfArtifactBestEffort(objectPath, bytes);
      phases.markUploadEnd();
      break;
    }
    case "scheda-ingresso":
    case "scheda-lavorazioni":
    case "scheda-ricambi": {
      const lavorazioneId = query.lavorazioneId?.trim();
      if (!lavorazioneId) return err("Parametro lavorazioneId mancante");
      const kind =
        type === "scheda-ingresso" ? "ingresso" : type === "scheda-lavorazioni" ? "lavorazioni" : "ricambi";
      const hashMeta = await fetchSchedaPdfHashMetaServer(lavorazioneId, kind);
      if (!hashMeta) return err("Scheda non disponibile");
      phases.markDataFetchEnd();
      dataHash = stableHashPayload({
        lavorazioneId,
        kind,
        updatedAt: hashMeta.updatedAt,
        tipo: hashMeta.tipo,
      });
      phases.markHashEnd();
      scopeId = lavorazioneId;
      const objectPath = resolvePdfArtifactRef(type, scopeId, dataHash).objectPath;
      bytes = await loadStorageArtifact(objectPath);
      phases.markStorageEnd();
      if (bytes) {
        cacheStatus = "HIT";
        const schedaRes = await fetchSchedaPdfPayloadServer(lavorazioneId, kind);
        if (schedaRes.success && schedaRes.data) {
          fileName = schedaPdfFileName({
            doc: schedaRes.data.doc,
            bundle: schedaRes.data.bundle,
            titoloScheda: schedaRes.data.titoloScheda,
          });
        }
        break;
      }
      const schedaRes = await fetchSchedaPdfPayloadServer(lavorazioneId, kind);
      if (!schedaRes.success || !schedaRes.data) return err(schedaRes.error ?? "Scheda non disponibile");
      const payload = schedaRes.data;
      fileName = schedaPdfFileName({
        doc: payload.doc,
        bundle: payload.bundle,
        titoloScheda: payload.titoloScheda,
      });
      const [autore, logo] = await Promise.all([
        resolvePdfAutore(query.autore),
        loadBrandingLogoDataUrlServer(),
      ]);
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
      phases.markGenerateEnd();
      await uploadPdfArtifactBestEffort(objectPath, bytes);
      phases.markUploadEnd();
      break;
    }
    case "dipendenti-aziendale": {
      const month = query.month?.trim() as TimesheetMonthKey | undefined;
      if (!month) return err("Parametro month mancante");
      const ctxRes = await fetchDipendentiPdfContextServer(month);
      phases.markDataFetchEnd();
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
      phases.markHashEnd();
      scopeId = month;
      fileName = dipendentiComplessivoFileName(ctx);
      const objectPath = resolvePdfArtifactRef(type, scopeId, dataHash).objectPath;
      bytes = await loadStorageArtifact(objectPath);
      phases.markStorageEnd();
      if (bytes) {
        cacheStatus = "HIT";
        break;
      }
      const logo = await loadBrandingLogoDataUrlServer();
      bytes = await generateDipendentiComplessivoPdfBytes(ctx, logo);
      phases.markGenerateEnd();
      await uploadPdfArtifactBestEffort(objectPath, bytes);
      phases.markUploadEnd();
      break;
    }
    case "dipendenti-dipendente": {
      const month = query.month?.trim() as TimesheetMonthKey | undefined;
      const employeeId = query.employeeId?.trim();
      if (!month || !employeeId) return err("Parametri month e employeeId richiesti");
      const ctxRes = await fetchDipendentiPdfContextServer(month);
      phases.markDataFetchEnd();
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
      phases.markHashEnd();
      scopeId = `${month}/${employeeId}`;
      fileName = dipendentiDipendenteFileName(ctx, employee);
      const objectPath = resolvePdfArtifactRef(type, scopeId, dataHash).objectPath;
      bytes = await loadStorageArtifact(objectPath);
      phases.markStorageEnd();
      if (bytes) {
        cacheStatus = "HIT";
        break;
      }
      const logo = await loadBrandingLogoDataUrlServer();
      bytes = await generateDipendentiDipendentePdfBytes(ctx, employee, logo);
      phases.markGenerateEnd();
      await uploadPdfArtifactBestEffort(objectPath, bytes);
      phases.markUploadEnd();
      break;
    }
    default: {
      const _exhaustive: never = type;
      return err(`Tipo artifact non supportato: ${String(_exhaustive)}`);
    }
  }

  const finishedPhases = phases.finish();
  const generateMs = finishedPhases.totalMs;
  if (!bytes) return err("Generazione PDF non riuscita");

  traceRuntimeCoordinationServer({
    type: cacheStatus === "HIT" ? "server_cache_hit" : "server_cache_miss",
    entityType: "pdf",
    entityId: scopeId,
    scope: "pdf",
    layer: "pdf",
    meta: { pdfType: type, generateMs, dataHash, phases: finishedPhases },
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

  return success({ bytes, fileName, cacheStatus, generateMs, dataHash, scopeId, phases: finishedPhases });
}
