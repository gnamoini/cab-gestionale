import type { InvoiceRow } from "@/src/types/supabase-tables";

export type FeSdiAdapterConfig = {
  baseUrl: string;
  apiKey?: string;
};

export type FeSdiSubmitResult =
  | { ok: true; submissionId: string }
  | { ok: false; error: string };

/** ponytail: adapter HTTP pluggable; default stub per dev senza provider reale. */
export function createFeSdiHttpAdapter(config: FeSdiAdapterConfig) {
  return {
    async submitXml(_invoice: InvoiceRow, xml: string): Promise<FeSdiSubmitResult> {
      if (!config.baseUrl) return { ok: false, error: "SDI provider non configurato" };
      if (!xml.trim()) return { ok: false, error: "XML vuoto" };
      return { ok: true, submissionId: `stub-${Date.now()}` };
    },
  };
}

export const feSdiStubAdapter = createFeSdiHttpAdapter({ baseUrl: "stub://" });
