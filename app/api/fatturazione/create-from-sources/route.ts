import { NextResponse } from "next/server";
import type { BillingSourceType } from "@/lib/fatturazione/ciclo-attivo/billing-eligibility.server";
import { createInvoiceFromSources } from "@/lib/fatturazione/ciclo-attivo/create-invoice-from-sources.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Payload non valido" }, { status: 400 });

  const sb = await createSupabaseServerUserClient();
  const result = await createInvoiceFromSources(sb, {
    sources: (body.sources as Array<{ type: BillingSourceType; id: string }>) ?? [],
    customerId: (body.customerId as string) ?? null,
    clienteLabel: String(body.clienteLabel ?? ""),
    customerSnapshot: (body.customerSnapshot as Record<string, unknown>) ?? {},
    dataEmissione: String(body.dataEmissione ?? new Date().toISOString().slice(0, 10)),
    defaultVatCodeId: String(body.defaultVatCodeId ?? ""),
    preventivoRecords: body.preventivoRecords as never,
    ddtDetails: body.ddtDetails as never,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error, code: result.code }, { status: 400 });
  }
  return NextResponse.json({ ok: true, id: result.id });
}
