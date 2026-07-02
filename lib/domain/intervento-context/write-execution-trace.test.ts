/**
 * Write execution trace: v1/v2/saga/RPC/shadow observability + finalization boundary.
 */
import assert from "node:assert/strict";
import { executeInterventoWrite } from "@/lib/domain/intervento-context/write-contract";
import { runInterventoWriteShadow } from "@/lib/domain/intervento-context/intervento-write-saga";
import {
  createWriteExecutionTrace,
  finalizeTrace,
  recordTraceStep,
} from "@/lib/domain/intervento-context/write-execution-trace";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import { interventoWriteService } from "@/src/services/intervento-write.service";
import { success } from "@/src/services/service-result";
import type { SchedaIngressoFields } from "@/types/schede";

const ATT_ID = "b2c3d4e5-f6a7-4890-bcde-f12345678901";

const mockUpsertAttrezzatura = (mezzoId: string) => ({
  mezzoId,
  created: true,
  updated: false,
  targetType: "attrezzatura" as const,
  attrezzaturaId: ATT_ID,
});

const fields: SchedaIngressoFields = {
  dataIngresso: "01/06/2026",
  cliente: "Cliente Test",
  cantiere: "",
  utilizzatore: "",
  tipoAttrezzatura: "",
  marcaAttrezzatura: "Marca",
  modelloAttrezzatura: "Modello",
  matricola: "MAT-1",
  nScuderia: "",
  oreLavoro: "",
  tipoTelaio: "",
  marcaTelaio: "",
  modelloTelaio: "",
  targa: "AA001BB",
  km: "",
  descrizioneAnomalia: "",
  livelloCarburante: "",
  addettoAccettazione: "",
  richiedente: "",
  noteIntervento: "",
};

const row = {
  id: "lav-edit-trace",
  mezzo_id: "mezzo-old",
  note: "nota",
  mezzo: null,
} as LavorazioneListRow;

const envSnapshot = {
  v2: process.env.NEXT_PUBLIC_INTERVENTO_WRITE_V2,
  shadow: process.env.NEXT_PUBLIC_INTERVENTO_WRITE_V2_SHADOW,
  rpc: process.env.NEXT_PUBLIC_INTERVENTO_WRITE_RPC,
};

function restoreEnv(): void {
  if (envSnapshot.v2 === undefined) delete process.env.NEXT_PUBLIC_INTERVENTO_WRITE_V2;
  else process.env.NEXT_PUBLIC_INTERVENTO_WRITE_V2 = envSnapshot.v2;
  if (envSnapshot.shadow === undefined) delete process.env.NEXT_PUBLIC_INTERVENTO_WRITE_V2_SHADOW;
  else process.env.NEXT_PUBLIC_INTERVENTO_WRITE_V2_SHADOW = envSnapshot.shadow;
  if (envSnapshot.rpc === undefined) delete process.env.NEXT_PUBLIC_INTERVENTO_WRITE_RPC;
  else process.env.NEXT_PUBLIC_INTERVENTO_WRITE_RPC = envSnapshot.rpc;
}

function disableWriteFlags(): void {
  delete process.env.NEXT_PUBLIC_INTERVENTO_WRITE_V2;
  delete process.env.NEXT_PUBLIC_INTERVENTO_WRITE_V2_SHADOW;
  delete process.env.NEXT_PUBLIC_INTERVENTO_WRITE_RPC;
}

function stepStatus(
  trace: { steps: Array<{ step: string; status: string }> },
  step: string,
): string | undefined {
  return trace.steps.filter((s) => s.step === step).at(-1)?.status;
}

function assertFinalized(trace: { isFinal: boolean; finalizedAt: number | null }): void {
  assert.equal(trace.isFinal, true);
  assert.ok(trace.finalizedAt !== null && trace.finalizedAt > 0);
}

function testFinalizeLock(): void {
  const trace = createWriteExecutionTrace("v1");
  recordTraceStep(trace, "v1_create", "started");
  finalizeTrace(trace, { ok: true, lavorazioneId: "lav-lock", mezzoId: "m-lock" });

  const stepsBefore = trace.steps.length;
  recordTraceStep(trace, "v1_persist", "completed");
  assert.equal(trace.steps.length, stepsBefore, "recordTraceStep no-op after finalize");
  finalizeTrace(trace, { ok: false, stage: "resolve", error: "ignored" });
  assert.equal(trace.result.success, true, "finalizeTrace idempotent");
}

async function testV1Create(): Promise<void> {
  disableWriteFlags();
  const { result, trace } = await executeInterventoWrite(
    {
      mode: "create",
      idempotencyKey: "trace-create-v1",
      fields,
      mezziCatalog: [],
      meta: {
        statoId: "accettazione",
        priorita: "media",
        dataIngressoIso: "2026-06-01T12:00:00.000Z",
        note: null,
        createdBy: "tester",
      },
    },
    {
      upsertMezzo: async () => mockUpsertAttrezzatura("m-trace"),
      createLavorazione: async () => ({ id: "lav-trace" } as never),
      persistScheda: async () => ({ ok: true as const }),
    },
  );

  assert.equal(result.ok && result.lavorazioneId, "lav-trace");
  assert.ok(trace.writeId.length > 0);
  assert.equal(trace.mode, "v1");
  assert.equal(stepStatus(trace, "v1_create"), "completed");
  assert.equal(stepStatus(trace, "v1_persist"), "completed");
  assert.equal(stepStatus(trace, "finalize"), "completed");
  assert.equal(trace.result.success, true);
  assert.equal(trace.result.interventionId, "lav-trace");
  assertFinalized(trace);
}

async function testV1Edit(): Promise<void> {
  disableWriteFlags();
  const { result, trace } = await executeInterventoWrite(
    {
      mode: "edit",
      idempotencyKey: "trace-edit-v1",
      fields,
      mezziCatalog: [],
      meta: { row },
    },
    {
      upsertMezzo: async () => ({
        mezzoId: "mezzo-new",
        created: false,
        updated: true,
        targetType: "attrezzatura" as const,
        attrezzaturaId: ATT_ID,
      }),
      updateLavorazione: async () => {},
    },
  );

  assert.equal(result.ok && result.lavorazioneId, "lav-edit-trace");
  assert.equal(trace.mode, "v1");
  assert.equal(stepStatus(trace, "v1_create"), "skipped");
  assert.equal(stepStatus(trace, "v1_persist"), "completed");
  assert.equal(stepStatus(trace, "finalize"), "completed");
  assertFinalized(trace);
}

async function testV2Saga(): Promise<void> {
  process.env.NEXT_PUBLIC_INTERVENTO_WRITE_V2 = "1";
  const { result, trace } = await executeInterventoWrite(
    {
      mode: "create",
      idempotencyKey: "trace-saga-v2",
      fields,
      mezziCatalog: [],
      meta: {
        statoId: "accettazione",
        priorita: "media",
        dataIngressoIso: "2026-06-01T12:00:00.000Z",
        note: null,
        createdBy: "tester",
      },
    },
    {
      upsertMezzo: async () => mockUpsertAttrezzatura("m-saga"),
      createLavorazione: async () => ({ id: "lav-saga" } as never),
      persistScheda: async () => ({ ok: true as const }),
    },
  );

  assert.equal(result.ok && result.lavorazioneId, "lav-saga");
  assert.equal(trace.mode, "v2_saga");
  assert.equal(stepStatus(trace, "v2_saga_start"), "completed");
  assert.equal(stepStatus(trace, "v1_persist"), "completed");
  assert.equal(stepStatus(trace, "finalize"), "completed");
  assertFinalized(trace);
}

async function testRpcAtomic(): Promise<void> {
  disableWriteFlags();
  process.env.NEXT_PUBLIC_INTERVENTO_WRITE_RPC = "1";
  const originalRpc = interventoWriteService.createInterventoAtomic;
  interventoWriteService.createInterventoAtomic = async () =>
    success({ ok: true, lavorazioneId: "rpc-lav", mezzoId: "rpc-m" });

  try {
    const { result, trace } = await executeInterventoWrite(
      {
        mode: "create",
        idempotencyKey: "trace-rpc",
        fields,
        mezziCatalog: [],
        meta: {
          statoId: "accettazione",
          priorita: "media",
          dataIngressoIso: "2026-06-01T12:00:00.000Z",
          note: null,
          createdBy: "tester",
        },
      },
      {
        upsertMezzo: async () => {
          throw new Error("upsert should not run on rpc success");
        },
        createLavorazione: async () => {
          throw new Error("create should not run on rpc success");
        },
        persistScheda: async () => ({ ok: true as const }),
      },
    );

    assert.equal(result.ok && result.lavorazioneId, "rpc-lav");
    assert.equal(trace.mode, "rpc_atomic");
    assert.equal(stepStatus(trace, "rpc_atomic_call"), "completed");
    assert.equal(stepStatus(trace, "v1_create"), "skipped");
    assert.equal(stepStatus(trace, "v1_persist"), "skipped");
    assertFinalized(trace);
  } finally {
    interventoWriteService.createInterventoAtomic = originalRpc;
  }
}

async function testShadowImmutableAfterFinalize(): Promise<void> {
  disableWriteFlags();
  process.env.NEXT_PUBLIC_INTERVENTO_WRITE_V2_SHADOW = "1";

  const { result, trace } = await executeInterventoWrite(
    {
      mode: "edit",
      idempotencyKey: "trace-shadow",
      fields,
      mezziCatalog: [],
      meta: { row },
    },
    {
      upsertMezzo: async () => ({
        mezzoId: "mezzo-new",
        created: false,
        updated: true,
        targetType: "attrezzatura" as const,
        attrezzaturaId: ATT_ID,
      }),
      updateLavorazione: async () => {},
    },
  );

  assert.equal(result.ok, true);
  assertFinalized(trace);
  assert.equal(stepStatus(trace, "v2_shadow_start"), "started");

  const stepsBefore = trace.steps.length;
  const authoritative = { ...result };
  await runInterventoWriteShadow(
    {
      mode: "edit",
      idempotencyKey: "trace-shadow",
      fields,
      mezziCatalog: [],
      meta: { row },
    },
    {
      upsertMezzo: async () => ({
        mezzoId: "mezzo-new",
        created: false,
        updated: true,
        targetType: "attrezzatura" as const,
        attrezzaturaId: ATT_ID,
      }),
      updateLavorazione: async () => {},
    },
    authoritative,
    trace,
  );

  assert.equal(trace.steps.length, stepsBefore, "shadow must not mutate finalized trace");
  assert.equal(stepStatus(trace, "v2_shadow_start"), "started");
  assert.deepEqual(result, authoritative);
}

async function run(): Promise<void> {
  try {
    testFinalizeLock();
    await testV1Create();
    await testV1Edit();
    await testV2Saga();
    await testRpcAtomic();
    await testShadowImmutableAfterFinalize();
    console.log("write-execution-trace.test.ts: OK");
  } finally {
    restoreEnv();
  }
}

void run();
