import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveCabAppSettingsResolvedServer } from "@/lib/app-settings/resolve-settings-for-server";
import { resolveIdentificaOrderPrefill } from "@/lib/ordini-fornitori/identifica-ricambio/resolve-candidate-to-prefill.server";
import { pickExistingOrdiniNumeri } from "@/lib/ordini-fornitori/identifica-ricambio/validate-identifica-order.server";
import {
  verifyServerModuleCan,
  verifyServerPageRead,
} from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  candidateId: z.string().uuid(),
});

export async function POST(request: Request, context: RouteContext) {
  const canIdentifica = await verifyServerPageRead("identifica_ricambio");
  const canOrdini = await verifyServerModuleCan("ordini_fornitori", "write");
  if (!canIdentifica || !canOrdini) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: searchId } = await context.params;
  const sb = await createSupabaseServerUserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  }

  try {
    const settings = await resolveCabAppSettingsResolvedServer();
    const { data: ordiniRows } = await sb.from("ordini_fornitori").select("numero");
    const result = await resolveIdentificaOrderPrefill(sb, {
      searchId,
      candidateId: parsed.data.candidateId,
      userId: user.id,
      magazzinoMaster: settings.magazzinoMaster,
      existingOrdini: pickExistingOrdiniNumeri(ordiniRows ?? []),
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Prefill non disponibile";
    const status = message.includes("non trovat") || message.includes("Permesso") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
