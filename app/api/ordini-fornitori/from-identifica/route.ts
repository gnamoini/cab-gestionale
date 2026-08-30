import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrdineFromIdentificaServer } from "@/lib/ordini-fornitori/identifica-ricambio/create-ordine-from-identifica.server";
import type { OrdineFornitoreCreateInput } from "@/lib/ordini-fornitori/types";
import { verifyServerModuleCan } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export const runtime = "nodejs";

const bodySchema = z.object({
  sourceSearchId: z.string().uuid(),
  sourceCandidateId: z.string().uuid(),
  record: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request) {
  const canOrdini = await verifyServerModuleCan("ordini_fornitori", "write");
  if (!canOrdini) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

  const payload = parsed.data.record as unknown as OrdineFornitoreCreateInput;
  if (!payload?.righe?.length || !payload.data_ordine || !payload.fornitore_label) {
    return NextResponse.json({ error: "Payload ordine incompleto" }, { status: 400 });
  }

  try {
    const result = await createOrdineFromIdentificaServer(sb, {
      userId: user.id,
      payload,
      sourceSearchId: parsed.data.sourceSearchId,
      sourceCandidateId: parsed.data.sourceCandidateId,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Salvataggio non riuscito";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
