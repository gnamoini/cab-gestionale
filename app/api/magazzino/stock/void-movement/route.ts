import { NextResponse } from "next/server";
import { z } from "zod";
import { buildStockMovementAuditPayload } from "@/lib/magazzino/stock-audit-payload";
import {
  fetchStockEntityState,
  stockApplyMovement,
  StockInsufficientError,
  StockVersionConflictError,
} from "@/lib/magazzino/stock-engine.server";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import { verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";
import { writeModificaLog } from "@/src/services/internal/audit-log";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { MOVIMENTI_RICAMBI_COLUMNS } from "@/lib/db/table-select-columns";

export const runtime = "nodejs";

const bodySchema = z.object({
  movimentoId: z.string().uuid(),
});

type MovimentoMeta = Record<string, unknown>;

function movementDelta(movimento: { tipo: string; quantita: number }): number {
  const q = Math.max(0, Math.round(Number(movimento.quantita) || 0));
  return movimento.tipo === "entrata" ? q : -q;
}

async function markLogReverted(
  sb: Awaited<ReturnType<typeof createSupabaseServerUserClient>>,
  logId: string,
  userId: string,
): Promise<void> {
  const { data: before, error: e0 } = await sb.from("log_modifiche").select("id, entita, entita_id, payload").eq("id", logId).maybeSingle();
  if (e0 || !before) return;
  const payload = before.payload && typeof before.payload === "object" ? (before.payload as Record<string, unknown>) : {};
  await sb.from("log_modifiche").insert({
    entita: before.entita,
    entita_id: before.entita_id,
    azione: "reverted",
    autore_id: userId,
    payload: {
      reverted_log_id: logId,
      reverted: true,
      reverted_at: new Date().toISOString(),
      reverted_by: userId,
      previous_payload: payload,
    },
  });
}

async function findStockLogsForMovimento(
  sb: Awaited<ReturnType<typeof createSupabaseServerUserClient>>,
  movimentoId: string,
  ricambioId: string,
): Promise<string[]> {
  const { data, error } = await sb
    .from("log_modifiche")
    .select("id, entita, entita_id, payload")
    .in("entita", ["magazzino_ricambi", "movimenti_ricambi"])
    .or(`entita_id.eq.${movimentoId},entita_id.eq.${ricambioId}`)
    .order("created_at", { ascending: false })
    .limit(80);
  if (error || !data) return [];
  const ids: string[] = [];
  for (const row of data) {
    const p = row.payload;
    if (!p || typeof p !== "object" || Array.isArray(p)) continue;
    const payload = p as Record<string, unknown>;
    const mid = payload.movimento_id ?? payload.movimentoId;
    if (mid === movimentoId) ids.push(row.id);
  }
  return ids;
}

export async function POST(request: Request) {
  const canWrite = await verifyServerPageWrite("magazzino");
  if (!canWrite) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const session = await getServerSession();
  const userId = session.user?.id;
  if (!userId) {
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

  const { movimentoId } = parsed.data;
  const sb = await createSupabaseServerUserClient();

  const { data: movimento, error: movErr } = await sb
    .from("movimenti_ricambi")
    .select(MOVIMENTI_RICAMBI_COLUMNS)
    .eq("id", movimentoId)
    .maybeSingle();

  if (movErr) {
    return NextResponse.json({ error: movErr.message }, { status: 400 });
  }
  if (!movimento) {
    return NextResponse.json({ error: "Movimento non trovato" }, { status: 404 });
  }

  const meta = (movimento.meta && typeof movimento.meta === "object" ? movimento.meta : {}) as MovimentoMeta;
  if (meta.voided === true) {
    return NextResponse.json({ error: "Movimento già annullato", code: "MOVIMENTO_GIA_ANNULLATO" }, { status: 409 });
  }

  const { data: existingVoid } = await sb
    .from("movimenti_ricambi")
    .select("id")
    .contains("meta", { voids_movimento_id: movimentoId })
    .limit(1);
  if (existingVoid && existingVoid.length > 0) {
    return NextResponse.json({ error: "Movimento già annullato", code: "MOVIMENTO_GIA_ANNULLATO" }, { status: 409 });
  }

  const ricambioId = movimento.ricambio_id;
  const originalDelta = movementDelta(movimento);
  const inverseDelta = -originalDelta;
  const voidedAt = new Date().toISOString();

  const stockState = await fetchStockEntityState(ricambioId);
  if (!stockState) {
    return NextResponse.json({ error: "Ricambio non trovato" }, { status: 404 });
  }

  const operationId = crypto.randomUUID();

  try {
    const result = await stockApplyMovement({
      ricambioId,
      delta: inverseDelta,
      expectedVersion: stockState.stockVersion,
      operationId,
      origine: "manual_adjustment",
      causale: "annullamento_movimento",
      contaStatistiche: false,
      meta: {
        hidden_from_timeline: true,
        voids_movimento_id: movimentoId,
      },
    });

    const { error: markErr } = await sb
      .from("movimenti_ricambi")
      .update({
        conta_statistiche: false,
        meta: {
          ...meta,
          voided: true,
          voided_at: voidedAt,
          voided_by: userId,
        },
      })
      .eq("id", movimentoId);

    if (markErr) {
      return NextResponse.json({ error: markErr.message }, { status: 400 });
    }

    const logIds = await findStockLogsForMovimento(sb, movimentoId, ricambioId);
    for (const logId of logIds) {
      await markLogReverted(sb, logId, userId);
    }

    if (result.movimentoId) {
      const auditBase = {
        ricambioId,
        quantitaBefore: result.quantitaBefore ?? result.quantita - (result.delta ?? inverseDelta),
        quantitaAfter: result.quantita,
        origine: "manual_adjustment" as const,
        causale: "annullamento_movimento",
        movimentoId: result.movimentoId,
        operationId: result.operationId,
        stockVersionBefore: stockState.stockVersion,
        stockVersionAfter: result.stockVersion,
      };
      const hiddenPayload = {
        ...buildStockMovementAuditPayload(auditBase),
        hidden_from_timeline: true,
        voids_movimento_id: movimentoId,
      };
      await writeModificaLog(sb, {
        entita: "movimenti_ricambi",
        entita_id: result.movimentoId,
        azione: "CREATE",
        payload: hiddenPayload,
        autore_id: userId,
      });
    }

    return NextResponse.json({
      ricambioId: result.ricambioId,
      quantita: result.quantita,
      stockVersion: result.stockVersion,
      movimentoId: result.movimentoId,
      voidedMovimentoId: movimentoId,
    });
  } catch (e) {
    if (e instanceof StockVersionConflictError) {
      const current = await fetchStockEntityState(ricambioId);
      return NextResponse.json({ error: e.message, code: e.code, current }, { status: 409 });
    }
    if (e instanceof StockInsufficientError) {
      return NextResponse.json(
        { error: "Giacenza insufficiente per annullare il movimento", code: e.code },
        { status: 400 },
      );
    }
    const message = e instanceof Error ? e.message : "Annullamento movimento fallito";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
