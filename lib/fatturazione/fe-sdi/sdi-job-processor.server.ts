import "server-only";

import { createArubaProvider } from "@/lib/fatturazione/fe-sdi/aruba-provider.server";
import { applySdiEventFromOutcome } from "@/lib/fatturazione/fe-sdi/sdi-event-applier.server";
import { generateInvoiceXmlFilename } from "@/lib/accounting/einvoice/filename/invoice-filename";
import { buildCanonicalFromSnapshot } from "@/lib/fatturazione/einvoice/build-canonical-from-snapshot";
import { buildFatturapaXmlFromSnapshot, type InvoiceEmissionSnapshot } from "@/lib/fatturazione/fe-sdi/fatturapa-xml.server";
import { simulatorElectronicInvoicingProvider } from "@/lib/fatturazione/fe-sdi/simulator-provider";
import type { ElectronicInvoicingProvider } from "@/lib/fatturazione/fe-sdi/electronic-invoicing-provider";

function resolveProvider(): ElectronicInvoicingProvider {
  if (process.env.ARUBA_FE_USERNAME && process.env.ARUBA_FE_PASSWORD) return createArubaProvider();
  return simulatorElectronicInvoicingProvider;
}

function isTimeoutError(msg: string): boolean {
  return /timeout|ETIMEDOUT|ECONNRESET|ARUBA_408/i.test(msg);
}

type JobClient = {
  from: (table: string) => unknown;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type Sb = {
  from: (t: string) => {
    select: (c: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null }>;
        limit: (n: number) => Promise<{ data: Array<Record<string, unknown>> | null }>;
      };
    };
    update: (row: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<unknown> };
    insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  };
  rpc: JobClient["rpc"];
};

async function updateTransmission(sb: Sb, transmissionId: string | null | undefined, row: Record<string, unknown>) {
  if (!transmissionId) return;
  await sb.from("invoice_transmissions").update({ ...row, last_event_at: new Date().toISOString() }).eq("id", transmissionId);
}

export async function processInvoiceSdiJob(
  client: JobClient,
  job: {
    id: string;
    invoice_id: string;
    transmission_id?: string | null;
    idempotency_key: string;
    correlation_key: string;
    attempt_count: number;
  },
): Promise<{ ok: boolean; error?: string }> {
  const sb = client as Sb;
  const provider = resolveProvider();
  const providerName = process.env.ARUBA_FE_USERNAME ? "aruba" : "simulator";

  const remote = await provider.findSubmissionByCorrelation(job.correlation_key);
  if (remote.found && remote.remoteStatus) {
    await applySdiEventFromOutcome(sb, {
      invoiceId: job.invoice_id,
      transmissionId: job.transmission_id,
      outcome: remote.remoteStatus,
      providerEventId: remote.providerReference,
    });
    await updateTransmission(sb, job.transmission_id, { transport_status: "synced", provider_request_id: remote.providerReference });
    await sb.from("invoice_sdi_jobs").update({ status: "SYNCED", provider_reference: remote.providerReference }).eq("id", job.id);
    return { ok: true };
  }

  const { data: inv } = await sb.from("invoices").select("invoice_snapshot, numero, anno, company_id").eq("id", job.invoice_id).maybeSingle();
  if (!inv) return { ok: false, error: "INVOICE_NOT_FOUND" };

  const built = buildFatturapaXmlFromSnapshot(
    (inv.invoice_snapshot ?? {}) as InvoiceEmissionSnapshot,
    undefined,
    job.invoice_id,
    String(inv.company_id ?? ""),
  );
  if (!built.ok) {
    await sb.from("invoice_sdi_jobs").update({ status: "BLOCKED", last_error_code: "XML_SCHEMA_INVALID", last_error: built.errors.join(",") }).eq("id", job.id);
    await updateTransmission(sb, job.transmission_id, { transport_status: "failed", error_code: "XML_SCHEMA_INVALID" });
    return { ok: false, error: "XML_SCHEMA_INVALID" };
  }

  await sb.rpc("store_invoice_xml_document", {
    p_payload: { invoice_id: job.invoice_id, xml_content: built.xml, xml_sha256: built.xmlHash, schema_version: built.schemaVersion },
  });

  const filename = generateInvoiceXmlFilename(
    buildCanonicalFromSnapshot(job.invoice_id, String(inv.company_id ?? ""), (inv.invoice_snapshot ?? {}) as InvoiceEmissionSnapshot),
  );
  await updateTransmission(sb, job.transmission_id, { transport_status: "processing", xml_hash: built.xmlHash, transport_provider: providerName });

  try {
    const submitted = await provider.submitInvoice({
      invoiceId: job.invoice_id,
      xml: built.xml,
      xmlHash: built.xmlHash,
      filename,
      idempotencyKey: job.idempotency_key,
      correlationKey: job.correlation_key,
    });

    await updateTransmission(sb, job.transmission_id, {
      transport_status: "provider_accepted",
      provider_request_id: submitted.providerReference,
      submitted_at: new Date().toISOString(),
    });

    const { data: existing } = await sb.from("invoice_fatturapa_snapshots").select("id, version").eq("invoice_id", job.invoice_id).limit(50);
    const prev = (existing ?? []).reduce<{ id: string; version: number } | null>((acc, s) => {
      const v = Number(s.version ?? 0);
      return !acc || v > acc.version ? { id: String(s.id), version: v } : acc;
    }, null);
    await sb.from("invoice_fatturapa_snapshots").insert({
      invoice_id: job.invoice_id,
      xml_hash: built.xmlHash,
      payload_json: { filename },
      version: (prev?.version ?? 0) + 1,
      correction_of: prev?.id ?? null,
    });

    await applySdiEventFromOutcome(sb, {
      invoiceId: job.invoice_id,
      transmissionId: job.transmission_id,
      outcome: "SUBMITTED",
      providerEventId: submitted.providerReference,
      payload: { provider: providerName },
    });

    await sb.from("invoice_sdi_jobs").update({
      status: submitted.remoteStatus === "REJECTED" ? "BLOCKED" : "SYNCED",
      provider_reference: submitted.providerReference,
      xml_hash: built.xmlHash,
      filename,
      provider: providerName,
    }).eq("id", job.id);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "PROVIDER_UNAVAILABLE";
    if (isTimeoutError(msg)) {
      await updateTransmission(sb, job.transmission_id, { transport_status: "pending_reconciliation", error_code: "TIMEOUT", error_message: msg });
      await sb.from("invoice_sdi_jobs").update({ status: "PENDING_RECONCILIATION", last_error: msg, last_error_code: "TIMEOUT" }).eq("id", job.id);
      return { ok: false, error: "PENDING_RECONCILIATION" };
    }
    const retry = job.attempt_count < 8;
    await updateTransmission(sb, job.transmission_id, { transport_status: retry ? "provider_error" : "failed", error_message: msg });
    await sb.from("invoice_sdi_jobs").update({
      status: retry ? "RETRY" : "FAILED",
      last_error: msg,
      next_attempt_at: new Date(Date.now() + Math.min(2 ** job.attempt_count, 60) * 60_000).toISOString(),
    }).eq("id", job.id);
    return { ok: false, error: msg };
  }
}

export async function reconcilePendingTransmissions(client: JobClient): Promise<number> {
  const sb = client as Sb;
  const provider = resolveProvider();
  const { data } = await sb.from("invoice_transmissions").select("id, invoice_id, attempt_number").eq("transport_status", "pending_reconciliation").limit(20);
  let resolved = 0;
  for (const t of data ?? []) {
    const corr = `${String(t.invoice_id)}:attempt:${String(t.attempt_number)}`;
    const remote = await provider.findSubmissionByCorrelation(corr);
    if (remote.found) {
      await applySdiEventFromOutcome(sb, {
        invoiceId: String(t.invoice_id),
        transmissionId: String(t.id),
        outcome: remote.remoteStatus ?? "SUBMITTED",
        providerEventId: remote.providerReference,
      });
      await updateTransmission(sb, String(t.id), { transport_status: "synced" });
      resolved++;
    }
  }
  return resolved;
}
