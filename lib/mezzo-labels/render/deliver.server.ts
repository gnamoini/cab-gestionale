import "server-only";

import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildMezzoQrUrl } from "@/lib/mezzo-labels/domain/tokens";
import { ensureActiveMezzoQrToken } from "@/lib/mezzo-labels/domain/tokens.server";
import type { MezzoLabelFormat, MezzoLabelPayload } from "@/lib/mezzo-labels/domain/types";
import { writeMezzoLabelEvent } from "@/lib/mezzo-labels/audit/events.server";
import { renderMezzoLabelsPdf, renderSingleMezzoLabelPdf } from "@/lib/mezzo-labels/render/pdf";
import { renderMezzoLabelPng } from "@/lib/mezzo-labels/render/png";
import { renderMezzoLabelSvgBytes } from "@/lib/mezzo-labels/render/svg";

export type DeliverMezzoLabelInput = {
  sb: SupabaseClient;
  mezzoId: string;
  payload: MezzoLabelPayload;
  format: MezzoLabelFormat;
  origin: string;
  userId?: string | null;
  device?: string | null;
};

export type DeliverMezzoLabelResult = {
  bytes: Uint8Array;
  contentType: string;
  fileName: string;
  token: string;
};

function contentTypeForFormat(format: MezzoLabelFormat): string {
  if (format === "pdf") return "application/pdf";
  if (format === "svg") return "image/svg+xml";
  return "image/png";
}

function fileNameForMezzo(payload: MezzoLabelPayload, format: MezzoLabelFormat): string {
  const safe = (payload.targa || "mezzo").replace(/[^\w.-]+/g, "_").slice(0, 32);
  return `etichetta-mezzo-${safe}.${format}`;
}

export async function deliverMezzoLabel(input: DeliverMezzoLabelInput): Promise<DeliverMezzoLabelResult> {
  const tokenRow = await ensureActiveMezzoQrToken(input.sb, input.mezzoId, input.userId);
  const qrUrl = buildMezzoQrUrl(tokenRow.token, input.origin);
  const slot = { payload: input.payload, qrUrl };

  let bytes: Uint8Array;
  if (input.format === "pdf") {
    bytes = await renderSingleMezzoLabelPdf(slot);
  } else if (input.format === "svg") {
    bytes = new Uint8Array(await renderMezzoLabelSvgBytes(input.payload, qrUrl));
  } else {
    bytes = new Uint8Array(await renderMezzoLabelPng(input.payload, qrUrl));
  }

  scheduleMezzoLabelPrintedAudit(input.sb, {
    mezzoId: input.mezzoId,
    userId: input.userId,
    device: input.device,
    format: input.format,
    token: tokenRow.token,
  });

  return {
    bytes,
    contentType: contentTypeForFormat(input.format),
    fileName: fileNameForMezzo(input.payload, input.format),
    token: tokenRow.token,
  };
}

function scheduleMezzoLabelPrintedAudit(
  sb: SupabaseClient,
  input: Pick<DeliverMezzoLabelInput, "mezzoId" | "userId" | "device" | "format"> & { token: string },
): void {
  after(() => {
    void writeMezzoLabelEvent(sb, {
      eventType: "MEZZO_LABEL_PRINTED",
      mezzoId: input.mezzoId,
      userId: input.userId,
      device: input.device,
      payload: { format: input.format, token: input.token },
    });
  });
}

function scheduleMezzoLabelBulkPrintedAudit(
  sb: SupabaseClient,
  input: Pick<DeliverMezzoLabelInput, "userId" | "device"> & { mezzoIds: string[]; batchSize: number },
): void {
  after(() => {
    for (const mezzoId of input.mezzoIds) {
      void writeMezzoLabelEvent(sb, {
        eventType: "MEZZO_LABEL_BULK_PRINTED",
        mezzoId,
        userId: input.userId,
        device: input.device,
        payload: { batchSize: input.batchSize },
      });
    }
  });
}

export type MezzoLabelBulkItem = {
  mezzoId: string;
  payload: MezzoLabelPayload;
};

export async function deliverMezzoLabelsBulk(input: {
  sb: SupabaseClient;
  items: MezzoLabelBulkItem[];
  origin: string;
  userId?: string | null;
  device?: string | null;
}): Promise<{ bytes: Uint8Array; count: number }> {
  const slots = [];
  for (const item of input.items) {
    const tokenRow = await ensureActiveMezzoQrToken(input.sb, item.mezzoId, input.userId);
    slots.push({
      payload: item.payload,
      qrUrl: buildMezzoQrUrl(tokenRow.token, input.origin),
    });
  }

  const bytes = await renderMezzoLabelsPdf(slots);

  scheduleMezzoLabelBulkPrintedAudit(input.sb, {
    mezzoIds: input.items.map((item) => item.mezzoId),
    userId: input.userId,
    device: input.device,
    batchSize: input.items.length,
  });

  return { bytes, count: input.items.length };
}

export function mezzoLabelPayloadFromRow(row: {
  targa: string | null;
  numero_scuderia: string | null;
}): MezzoLabelPayload {
  return {
    targa: row.targa?.trim() ?? "",
    numeroScuderia: row.numero_scuderia?.trim() || null,
  };
}
