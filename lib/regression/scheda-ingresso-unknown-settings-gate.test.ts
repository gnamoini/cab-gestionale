/**
 * RC3: ogni ramo del gate unknown-settings deve concludere (resolve/reject) — mai Promise pendente.
 */
import assert from "node:assert/strict";
import {
  runUnknownSettingsGateSubmit,
  runUnknownSettingsSaveAndContinue,
  UNKNOWN_SETTINGS_APPEND_FAILED,
} from "@/lib/schede/scheda-ingresso-unknown-settings-gate-core";
import type { SchedaIngressoFields } from "@/types/schede";

const FIELDS = { dataIngresso: "01/06/2026" } as SchedaIngressoFields;

const UNKNOWN_ITEM = {
  fieldKey: "cliente" as const,
  label: "Cliente",
  value: "Nuovo",
  listKey: "lavorazioni:clienti" as const,
};

async function assertSettlesWithin(
  label: string,
  task: Promise<unknown>,
  ms = 200,
): Promise<"resolved" | "rejected"> {
  const outcome = await Promise.race([
    task.then(
      () => "resolved" as const,
      () => "rejected" as const,
    ),
    new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), ms)),
  ]);
  assert.notEqual(outcome, "timeout", `${label}: promise still pending after ${ms}ms`);
  return outcome;
}

async function main(): Promise<void> {
  // appendItems === null → finish() + reject
  {
    let finished = false;
    const outcome = await assertSettlesWithin(
      "appendItems null",
      runUnknownSettingsSaveAndContinue(
        {
          fields: FIELDS,
          proceed: async () => {
            throw new Error("proceed must not run");
          },
          finish: () => {
            finished = true;
          },
        },
        async () => null,
      ),
    );
    assert.equal(outcome, "rejected");
    assert.equal(finished, true);
  }

  // appendItems === {} → proceed; finish via wrappedProceed (come gate reale)
  {
    let proceeded = false;
    await assertSettlesWithin(
      "appendItems empty object",
      new Promise<void>((resolve) => {
        const finish = () => resolve();
        const wrappedProceed = async (nextFields: SchedaIngressoFields) => {
          try {
            proceeded = true;
            assert.ok(nextFields);
          } finally {
            finish();
          }
        };
        void runUnknownSettingsSaveAndContinue(
          {
            fields: FIELDS,
            proceed: wrappedProceed,
            finish: () => resolve(),
          },
          async () => ({}),
        );
      }),
    );
    assert.equal(proceeded, true);
  }

  // appendItems throw → reject
  {
    await assertSettlesWithin(
      "appendItems throw",
      runUnknownSettingsSaveAndContinue(
        {
          fields: FIELDS,
          proceed: async () => {},
          finish: () => {},
        },
        async () => {
          throw new Error("append failed");
        },
      ).catch((err: unknown) => {
        assert.ok(err instanceof Error);
        assert.notEqual(err.message, UNKNOWN_SETTINGS_APPEND_FAILED);
      }),
    );
  }

  // gateSubmit fast path (no unknown) → proceed senza dialog
  {
    let proceeded = false;
    await assertSettlesWithin(
      "gateSubmit fast path",
      runUnknownSettingsGateSubmit(
        FIELDS,
        async () => {
          proceeded = true;
        },
        { globalOptsLoading: true, unknown: [] },
        () => {
          throw new Error("dialog must not open");
        },
      ),
    );
    assert.equal(proceeded, true);
  }

  // gateSubmit con unknown → defer; cancel chiama finish
  {
    let dialogOpened = false;
    await assertSettlesWithin(
      "gateSubmit cancel",
      runUnknownSettingsGateSubmit(
        FIELDS,
        async () => {
          throw new Error("proceed must not run on cancel");
        },
        {
          globalOptsLoading: false,
          unknown: [UNKNOWN_ITEM],
        },
        (pending) => {
          dialogOpened = true;
          pending.finish();
        },
      ),
    );
    assert.equal(dialogOpened, true);
  }

  // gateSubmit con unknown → onSaveAndContinue con append null
  {
    let finished = false;
    await assertSettlesWithin(
      "gateSubmit saveAndContinue append null",
      runUnknownSettingsGateSubmit(
        FIELDS,
        async () => {
          throw new Error("proceed must not run");
        },
        {
          globalOptsLoading: false,
          unknown: [UNKNOWN_ITEM],
        },
        (pending) => {
          void runUnknownSettingsSaveAndContinue(pending, async () => null).catch(() => {
            finished = true;
          });
        },
      ),
    );
    assert.equal(finished, true);
  }

  console.log("scheda-ingresso-unknown-settings-gate.test.ts: ok");
}

void main();
