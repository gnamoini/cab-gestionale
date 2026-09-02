import {
  applyCanonicalValuesToSchedaIngresso,
  type SchedaIngressoUnknownSettingItem,
} from "@/lib/schede/scheda-ingresso-unknown-settings";
import type { SchedaIngressoFields } from "@/types/schede";

export const UNKNOWN_SETTINGS_APPEND_FAILED = "UNKNOWN_SETTINGS_APPEND_FAILED";

export type UnknownSettingsGatePending = {
  fields: SchedaIngressoFields;
  proceed: (fields: SchedaIngressoFields) => void | Promise<void>;
  finish: () => void;
};

export type UnknownSettingsCanonicalByField = Partial<
  Record<SchedaIngressoUnknownSettingItem["fieldKey"], string>
>;

/**
 * SSOT gate unknown settings — testabile senza React/backend.
 * Ogni ramo deve concludere con proceed (che chiama finish) oppure finish diretto.
 */
export async function runUnknownSettingsSaveAndContinue(
  pending: UnknownSettingsGatePending,
  appendItems: () => Promise<UnknownSettingsCanonicalByField | null>,
): Promise<void> {
  const canonical = await appendItems();
  if (canonical === null) {
    pending.finish();
    throw new Error(UNKNOWN_SETTINGS_APPEND_FAILED);
  }
  const nextFields = applyCanonicalValuesToSchedaIngresso(pending.fields, canonical);
  await pending.proceed(nextFields);
}

export async function runUnknownSettingsGateSubmit(
  fields: SchedaIngressoFields,
  proceed: (fields: SchedaIngressoFields) => void | Promise<void>,
  options: {
    globalOptsLoading: boolean;
    unknown: readonly SchedaIngressoUnknownSettingItem[];
  },
  onDeferToDialog: (pending: UnknownSettingsGatePending) => void,
): Promise<void> {
  await new Promise<void>((resolve) => {
    const finish = () => resolve();
    const wrappedProceed = async (nextFields: SchedaIngressoFields) => {
      try {
        await proceed(nextFields);
      } finally {
        finish();
      }
    };

    if (options.globalOptsLoading || options.unknown.length === 0) {
      void wrappedProceed(fields);
      return;
    }

    onDeferToDialog({ fields, proceed: wrappedProceed, finish });
  });
}
