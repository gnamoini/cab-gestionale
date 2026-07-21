import { NextResponse } from "next/server";
import { z } from "zod";
import {
  fetchStockEntityState,
  stockApplyMovement,
  StockInsufficientError,
  StockVersionConflictError,
} from "@/lib/magazzino/stock-engine.server";
import { isStockPipelineServerEnabled } from "@/lib/feature-flags/stock-pipeline";
import { buildStockMovementAuditPayload } from "@/lib/magazzino/stock-audit-payload";
import { logStockPipelineEvent } from "@/lib/magazzino/stock-pipeline-telemetry";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import { verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";
import { writeModificaLog } from "@/src/services/internal/audit-log";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export const runtime = "nodejs";

const bodySchema = z.object({
  ricambioId: z.string().uuid(),
  delta: z.number().int(),
  expectedVersion: z.number().int().min(0),
  operationId: z.string().uuid(),
  origine: z.string().optional(),
  causale: z.string().optional(),
  contaStatistiche: z.boolean().optional(),
  lavorazioneId: z.string().uuid().nullable().optional(),
});

async function writeStockAdjustAuditLogs(
  input: z.infer<typeof bodySchema>,
  result: Awaited<ReturnType<typeof stockApplyMovement>>,
): Promise<void> {
  if (result.idempotent || result.noop || !result.movimentoId) return;

  const sb = await createSupabaseServerUserClient();
  const before = result.quantitaBefore ?? result.quantita - (result.delta ?? 0);
  const auditBase = {
    ricambioId: result.ricambioId,
    quantitaBefore: before,
    quantitaAfter: result.quantita,
    origine: (input.origine as "manual_adjustment") ?? "manual_adjustment",
    causale: input.causale ?? (input.delta > 0 ? "carico" : "scarico"),
    movimentoId: result.movimentoId,
    operationId: result.operationId,
    stockVersionBefore: input.expectedVersion,
    stockVersionAfter: result.stockVersion,
  };

  await writeModificaLog(sb, {
    entita: "magazzino_ricambi",
    entita_id: result.ricambioId,
    azione: "UPDATE",
    payload: buildStockMovementAuditPayload(auditBase),
  });
  await writeModificaLog(sb, {
    entita: "movimenti_ricambi",
    entita_id: result.movimentoId,
    azione: "CREATE",
    payload: buildStockMovementAuditPayload(auditBase),
  });
}

export async function POST(request: Request) {
  const canWrite = await verifyServerPageWrite("magazzino");
  if (!canWrite) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const session = await getServerSession();
  if (!session.user?.id) {
    return NextResponse.json({ error: "Sessione non valida" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parametri non validi", details: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;

  try {
    const result = await stockApplyMovement({
      ricambioId: input.ricambioId,
      delta: input.delta,
      expectedVersion: input.expectedVersion,
      operationId: input.operationId,
      origine: input.origine as Parameters<typeof stockApplyMovement>[0]["origine"],
      causale: input.causale,
      contaStatistiche: input.contaStatistiche,
      lavorazioneId: input.lavorazioneId,
    });

    if (!result.idempotent && !result.noop && result.movimentoId) {
      // ponytail: audit dopo la risposta — la giacenza è già committata dal RPC.
      void writeStockAdjustAuditLogs(input, result).catch(() => undefined);
    }

    if (isStockPipelineServerEnabled()) {
      logStockPipelineEvent({
        source: "api_adjust",
        operationId: input.operationId,
        ricambioId: input.ricambioId,
        delta: input.delta,
        expectedVersion: input.expectedVersion,
        responseVersion: result.stockVersion,
      });
    }

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof StockVersionConflictError) {
      const current = await fetchStockEntityState(input.ricambioId);
      return NextResponse.json(
        { error: e.message, code: e.code, current },
        { status: 409 },
      );
    }
    if (e instanceof StockInsufficientError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "Aggiornamento stock fallito";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
