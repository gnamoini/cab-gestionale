import "server-only";

import type {
  EinvoiceNotification,
  EinvoiceRemoteStatus,
  EinvoiceSubmitInput,
  EinvoiceSubmitResult,
  ElectronicInvoicingProvider,
} from "@/lib/fatturazione/fe-sdi/electronic-invoicing-provider";
import { parseSdiEvent } from "@/lib/fatturazione/fe-sdi/sdi-event-parser";

/**
 * Aruba Fatturazione Elettronica Web Service adapter.
 * ponytail: exact WS paths depend on CAB Aruba contract; configure via ARUBA_FE_* env.
 * Primary mode: REST/WS upload + notification polling (not assumed HTTP webhook).
 */
export class ArubaElectronicInvoicingProvider implements ElectronicInvoicingProvider {
  constructor(private readonly baseUrl: string) {}

  private credentialsConfigured(): boolean {
    return Boolean(process.env.ARUBA_FE_USERNAME && process.env.ARUBA_FE_PASSWORD && this.baseUrl);
  }

  private authHeaders(): Record<string, string> {
    const user = process.env.ARUBA_FE_USERNAME ?? "";
    const pass = process.env.ARUBA_FE_PASSWORD ?? "";
    return {
      accept: "application/json",
      authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`,
    };
  }

  async findSubmissionByCorrelation(correlationKey: string): Promise<EinvoiceRemoteStatus> {
    if (!this.credentialsConfigured()) {
      return { found: false, providerReference: null, remoteStatus: null };
    }
    const url = `${this.baseUrl.replace(/\/$/, "")}/services/invoice/out/getByCorrelation?correlation=${encodeURIComponent(correlationKey)}`;
    const res = await fetch(url, { method: "GET", headers: this.authHeaders() });
    if (!res.ok) return { found: false, providerReference: null, remoteStatus: null };
    const body = (await res.json()) as { id?: string; status?: string; uploadFileName?: string };
    if (!body.id) return { found: false, providerReference: null, remoteStatus: null };
    return { found: true, providerReference: body.id, remoteStatus: body.status ?? "SUBMITTED" };
  }

  async submitInvoice(input: EinvoiceSubmitInput): Promise<EinvoiceSubmitResult> {
    const existing = await this.findSubmissionByCorrelation(input.correlationKey);
    if (existing.found) {
      return {
        accepted: true,
        providerReference: existing.providerReference,
        remoteStatus: "SUBMITTED",
        errorCode: "ALREADY_SUBMITTED",
      };
    }
    if (!this.credentialsConfigured()) {
      throw new Error("ARUBA_CREDENTIALS_MISSING");
    }
    const url = `${this.baseUrl.replace(/\/$/, "")}/services/invoice/out/upload`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...this.authHeaders(),
        "content-type": "application/xml",
        "x-idempotency-key": input.idempotencyKey,
        "x-correlation-key": input.correlationKey,
        "x-filename": input.filename,
      },
      body: input.xml,
    });
    if (!res.ok) {
      throw Object.assign(new Error(`ARUBA_${res.status}`), { status: res.status });
    }
    const body = (await res.json()) as { id?: string; status?: string };
    return {
      accepted: true,
      providerReference: body.id ?? null,
      remoteStatus: "SUBMITTED",
    };
  }

  async getInvoiceStatus(providerReference: string): Promise<EinvoiceRemoteStatus> {
    if (!this.credentialsConfigured()) {
      return { found: false, providerReference: null, remoteStatus: null };
    }
    const res = await fetch(
      `${this.baseUrl.replace(/\/$/, "")}/services/invoice/out/${encodeURIComponent(providerReference)}`,
      { headers: this.authHeaders() },
    );
    if (!res.ok) return { found: false, providerReference: null, remoteStatus: null };
    const body = (await res.json()) as { status?: string };
    return { found: true, providerReference, remoteStatus: body.status ?? null };
  }

  async getNotifications(since?: string): Promise<EinvoiceNotification[]> {
    if (!this.credentialsConfigured()) return [];
    const qs = since ? `?since=${encodeURIComponent(since)}` : "";
    const res = await fetch(
      `${this.baseUrl.replace(/\/$/, "")}/services/invoice/out/notifications${qs}`,
      { headers: this.authHeaders() },
    );
    if (!res.ok) return [];
    const body = (await res.json()) as { notifications?: Array<Record<string, unknown>> };
    return (body.notifications ?? []).map((n) => {
      const rawCode = String(n.eventCode ?? n.type ?? "");
      const parsed = parseSdiEvent(String(n.outcome ?? n.status ?? rawCode), rawCode, String(n.message ?? ""));
      const outcome =
        parsed.canonicalEventType === "DELIVERY"
          ? "DELIVERED"
          : parsed.canonicalEventType === "DELIVERY_UNAVAILABLE"
            ? "DELIVERY_FAILED"
            : parsed.canonicalEventType === "REJECTED"
              ? "REJECTED"
              : parsed.canonicalEventType === "SUBMITTED"
                ? "SUBMITTED"
                : "ACCEPTED";
      return {
        id: String(n.id ?? n.notificationId ?? ""),
        invoiceCorrelation: String(n.correlationKey ?? n.correlation ?? ""),
        outcome: outcome as EinvoiceNotification["outcome"],
        payload: n,
      };
    });
  }

  async downloadInvoice(providerReference: string): Promise<string | null> {
    if (!this.credentialsConfigured()) return null;
    const res = await fetch(
      `${this.baseUrl.replace(/\/$/, "")}/services/invoice/out/${encodeURIComponent(providerReference)}/xml`,
      { headers: this.authHeaders() },
    );
    if (!res.ok) return null;
    return res.text();
  }

  async downloadNotification(notificationId: string): Promise<string | null> {
    if (!this.credentialsConfigured()) return null;
    const res = await fetch(
      `${this.baseUrl.replace(/\/$/, "")}/services/invoice/out/notifications/${encodeURIComponent(notificationId)}`,
      { headers: this.authHeaders() },
    );
    if (!res.ok) return null;
    return res.text();
  }
}

export function createArubaProvider(): ArubaElectronicInvoicingProvider {
  return new ArubaElectronicInvoicingProvider(process.env.ARUBA_FE_BASE_URL ?? "");
}
