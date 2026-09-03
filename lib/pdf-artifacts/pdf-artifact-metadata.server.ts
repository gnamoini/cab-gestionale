import "server-only";

import { cache } from "react";
import { fetchClienteAnagraficaByLabelServer } from "@/lib/clienti/clienti-anagrafica-fetch.server";
import { DDT_DOCUMENTS_COLUMNS, INVOICES_COLUMNS } from "@/lib/db/table-select-columns";
import { invoiceDisplayNumber } from "@/lib/fatturazione/fatturazione-list-ui-filters";
import { fetchOrdineFornitoreRecordServer } from "@/lib/ordini-fornitori/ordine-fornitore-fetch-server";
import { PREVENTIVO_PDF_LAYOUT_STAMP } from "@/lib/pdf/preventivo-pdf-section-labels";
import { normalizePreventivoTipoDocumento } from "@/lib/preventivi/preventivi-tipo-documento";
import { fetchSchedaPdfPayloadServer } from "@/lib/schede/schede-fetch-server";
import type { PreventivoRecord, PreventivoManodopera } from "@/lib/preventivi/types";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { DdtDocumentRow, InvoiceRow, PreventivoRow } from "@/src/types/supabase-tables";

export type PreventivoPdfHashMeta = {
  id: string;
  cliente: string;
  updatedAt: string;
  totale: number;
  righeCount: number;
  descrizioneLavorazioniCliente: string;
  noteFinali: string;
  collaudoPrezzo: number | null;
  manodopera: PreventivoRecord["manodopera"];
  numero: string;
  dataCreazione: string;
  tipoDocumento: PreventivoRecord["tipoDocumento"];
};

export function buildPreventivoPdfHashInput(
  meta: PreventivoPdfHashMeta,
  anagUpdatedAt: string | null,
): Record<string, unknown> {
  return {
    id: meta.id,
    updatedAt: meta.updatedAt,
    totale: meta.totale,
    righeCount: meta.righeCount,
    anagUpdatedAt,
    descrizioneLavorazioniCliente: meta.descrizioneLavorazioniCliente,
    noteFinali: meta.noteFinali,
    collaudoPrezzo: meta.collaudoPrezzo,
    manodopera: meta.manodopera,
    tipoDocumento: meta.tipoDocumento,
    layoutStamp: PREVENTIVO_PDF_LAYOUT_STAMP,
  };
}

function preventivoMetaFromRow(row: PreventivoRow): PreventivoPdfHashMeta {
  const det = (row.dettagli ?? {}) as Record<string, unknown>;
  const righe = Array.isArray(det.righeRicambi) ? det.righeRicambi : [];
  const manodopera =
    det.manodopera && typeof det.manodopera === "object"
      ? (det.manodopera as PreventivoManodopera)
      : ({
          oreTotali: 0,
          righeAddetti: [],
          costoOrario: 0,
          prezzoOrario: 0,
          scontoPercent: 0,
        } satisfies PreventivoManodopera);
  return {
    id: row.id,
    cliente: row.cliente?.trim() || "—",
    updatedAt: row.updated_at ?? row.created_at,
    totale: row.totale ?? 0,
    righeCount: righe.length,
    descrizioneLavorazioniCliente:
      typeof det.descrizioneLavorazioniCliente === "string" ? det.descrizioneLavorazioniCliente : "",
    noteFinali: typeof det.noteFinali === "string" ? det.noteFinali : "",
    collaudoPrezzo: typeof det.collaudoPrezzo === "number" ? det.collaudoPrezzo : null,
    manodopera,
    numero: typeof det.numero === "string" ? det.numero : "",
    dataCreazione: row.created_at,
    tipoDocumento: normalizePreventivoTipoDocumento(det.tipoDocumento),
  };
}

/** ponytail: no mezzo join — sufficiente per hash + filename su storage HIT. */
export const fetchPreventivoPdfHashMetaServer = cache(
  async (id: string): Promise<PreventivoPdfHashMeta | null> => {
    const allowed = await verifyServerPageRead("preventivi");
    if (!allowed) return null;
    const sb = await createSupabaseServerUserClient();
    const { data, error } = await sb
      .from("preventivi")
      .select("id, cliente, totale, updated_at, created_at, dettagli")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return preventivoMetaFromRow(data as PreventivoRow);
  },
);

export type DdtPdfHashMeta = {
  id: string;
  updatedAt: string;
  status: string;
  clienteLabel: string;
  numero: number | null;
  anno: number;
  dataDocumento: string;
};

export function buildDdtPdfHashInput(meta: DdtPdfHashMeta, anagUpdatedAt: string | null): Record<string, unknown> {
  return {
    id: meta.id,
    updatedAt: meta.updatedAt,
    status: meta.status,
    anagUpdatedAt,
  };
}

export const fetchDdtPdfHashMetaServer = cache(async (id: string): Promise<DdtPdfHashMeta | null> => {
  const allowed = await verifyServerPageRead("preventivi");
  if (!allowed) return null;
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("ddt_documents")
    .select(DDT_DOCUMENTS_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as DdtDocumentRow;
  return {
    id: row.id,
    updatedAt: row.updated_at,
    status: row.status,
    clienteLabel: row.cliente_label,
    numero: row.numero,
    anno: row.anno,
    dataDocumento: row.data_documento,
  };
});

export function fatturaPdfFileNameFromMeta(meta: FatturaPdfHashMeta): string {
  const num = invoiceDisplayNumber({
    numero: meta.numero,
    anno: meta.anno,
  } as InvoiceRow);
  const safe = meta.clienteLabel.replace(/[^\w\-]+/g, "_").slice(0, 40);
  return `Fattura_${num.replace("/", "-")}_${safe}.pdf`;
}

export type FatturaPdfHashMeta = {
  id: string;
  updatedAt: string;
  totale: number;
  status: string;
  numero: number;
  anno: number;
  clienteLabel: string;
  dataEmissione: string;
};

export const fetchFatturaPdfHashMetaServer = cache(async (id: string): Promise<FatturaPdfHashMeta | null> => {
  const allowed = await verifyServerPageRead("fatturazione");
  if (!allowed) return null;
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.from("invoices").select(INVOICES_COLUMNS).eq("id", id).maybeSingle();
  if (error || !data) return null;
  const inv = data as InvoiceRow;
  return {
    id: inv.id,
    updatedAt: inv.updated_at,
    totale: inv.totale,
    status: inv.status,
    numero: inv.numero,
    anno: inv.anno,
    clienteLabel: inv.cliente_label,
    dataEmissione: inv.data_emissione,
  };
});

export type OrdineFornitorePdfHashMeta = {
  id: string;
  updatedAt: string;
  status: string;
  totale: number;
  righeCount: number;
  numero: string;
  fornitoreLabel: string;
};

export function ordineFornitorePdfFileNameFromMeta(meta: OrdineFornitorePdfHashMeta): string {
  const safeForn = meta.fornitoreLabel.replace(/[^\w\-]+/g, "_").slice(0, 30);
  const safeNum = (meta.numero || "ordine").replace("/", "-");
  return `Ordine_${safeNum}_${safeForn}.pdf`;
}

export const fetchOrdineFornitorePdfHashMetaServer = cache(
  async (id: string): Promise<OrdineFornitorePdfHashMeta | null> => {
    const record = await fetchOrdineFornitoreRecordServer(id);
    if (!record) return null;
    return {
      id: record.id,
      updatedAt: record.updatedAt,
      status: record.status,
      totale: record.totale,
      righeCount: record.righe.length,
      numero: record.numero,
      fornitoreLabel: record.fornitoreLabel,
    };
  },
);

export type SchedaPdfHashMeta = {
  lavorazioneId: string;
  kind: "ingresso" | "lavorazioni" | "ricambi";
  updatedAt: string;
  tipo: string;
  fileNameParts: {
    titoloScheda: string;
    codice: string | null;
  };
};

export async function fetchSchedaPdfHashMetaServer(
  lavorazioneId: string,
  kind: "ingresso" | "lavorazioni" | "ricambi",
): Promise<SchedaPdfHashMeta | null> {
  const schedaRes = await fetchSchedaPdfPayloadServer(lavorazioneId, kind);
  if (!schedaRes.success || !schedaRes.data) return null;
  const payload = schedaRes.data;
  return {
    lavorazioneId,
    kind,
    updatedAt: payload.doc.updatedAt ?? payload.doc.createdAt,
    tipo: payload.doc.tipo,
    fileNameParts: {
      titoloScheda: payload.titoloScheda,
      codice: payload.lavorazioneRow?.codice ?? null,
    },
  };
}

export async function resolveClienteAnagUpdatedAt(clienteLabel: string): Promise<string | null> {
  const clienteAnag = await fetchClienteAnagraficaByLabelServer(clienteLabel);
  return clienteAnag?.updatedAt ?? null;
}
