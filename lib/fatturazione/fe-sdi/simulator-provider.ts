import type {
  EinvoiceNotification,
  EinvoiceRemoteStatus,
  EinvoiceSubmitInput,
  EinvoiceSubmitResult,
  ElectronicInvoicingProvider,
} from "@/lib/fatturazione/fe-sdi/electronic-invoicing-provider";

/** In-process DEMO simulator. scenario via correlation suffix or xml marker. */
const remoteByCorrelation = new Map<string, EinvoiceRemoteStatus & { xmlHash: string }>();
const notifications: EinvoiceNotification[] = [];

function scenarioOf(input: EinvoiceSubmitInput): string {
  if (input.xml.includes("SIM-REJECT")) return "reject";
  if (input.xml.includes("SIM-DELIVERY-FAILED")) return "delivery_failed";
  if (input.xml.includes("SIM-TIMEOUT")) return "timeout";
  if (input.xml.includes("SIM-500")) return "error_500";
  if (input.xml.includes("SIM-429")) return "error_429";
  if (input.correlationKey.endsWith(":reject")) return "reject";
  return "delivered";
}

export class SimulatorElectronicInvoicingProvider implements ElectronicInvoicingProvider {
  async findSubmissionByCorrelation(correlationKey: string): Promise<EinvoiceRemoteStatus> {
    const hit = remoteByCorrelation.get(correlationKey);
    if (!hit) return { found: false, providerReference: null, remoteStatus: null };
    return { found: true, providerReference: hit.providerReference, remoteStatus: hit.remoteStatus };
  }

  async submitInvoice(input: EinvoiceSubmitInput): Promise<EinvoiceSubmitResult> {
    const existing = await this.findSubmissionByCorrelation(input.correlationKey);
    if (existing.found) {
      return {
        accepted: existing.remoteStatus !== "REJECTED",
        providerReference: existing.providerReference,
        remoteStatus: existing.remoteStatus ?? "UNKNOWN",
        errorCode: "ALREADY_SUBMITTED",
      };
    }
    const scenario = scenarioOf(input);
    if (scenario === "timeout") {
      throw new Error("PROVIDER_TIMEOUT");
    }
    if (scenario === "error_500") {
      throw Object.assign(new Error("PROVIDER_500"), { status: 500 });
    }
    if (scenario === "error_429") {
      throw Object.assign(new Error("PROVIDER_429"), { status: 429 });
    }
    const ref = `sim-${input.invoiceId}-${input.idempotencyKey.slice(-8)}`;
    const remoteStatus =
      scenario === "reject" ? "REJECTED" : scenario === "delivery_failed" ? "DELIVERY_FAILED" : "DELIVERED";
    remoteByCorrelation.set(input.correlationKey, {
      found: true,
      providerReference: ref,
      remoteStatus,
      xmlHash: input.xmlHash,
    });
    const outcome =
      remoteStatus === "REJECTED"
        ? "REJECTED"
        : remoteStatus === "DELIVERY_FAILED"
          ? "DELIVERY_FAILED"
          : "DELIVERED";
    notifications.push({
      id: `ntf-${ref}`,
      invoiceCorrelation: input.correlationKey,
      outcome,
      payload: { filename: input.filename },
    });
    return {
      accepted: remoteStatus !== "REJECTED",
      providerReference: ref,
      remoteStatus,
    };
  }

  async getInvoiceStatus(providerReference: string): Promise<EinvoiceRemoteStatus> {
    for (const v of remoteByCorrelation.values()) {
      if (v.providerReference === providerReference) {
        return { found: true, providerReference, remoteStatus: v.remoteStatus };
      }
    }
    return { found: false, providerReference: null, remoteStatus: null };
  }

  async getNotifications(): Promise<EinvoiceNotification[]> {
    return [...notifications];
  }

  async downloadInvoice(): Promise<string | null> {
    return null;
  }

  async downloadNotification(): Promise<string | null> {
    return null;
  }
}

export const simulatorElectronicInvoicingProvider = new SimulatorElectronicInvoicingProvider();
