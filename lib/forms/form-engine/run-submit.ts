import { captureFormSnapshot } from "@/lib/forms/form-engine/capture-form-snapshot";
import { isFormEngineEnabled } from "@/lib/forms/form-engine/config";
import { iosSubmitGuard } from "@/lib/forms/form-engine/ios-submit-guard";
import { prepareFormSubmit, prepareFormSubmitAsync } from "@/lib/forms/form-engine/prepare-form-submit";
import { compareFormEngineShadow } from "@/lib/forms/form-engine/shadow-compare";
import type { FormSubmitLock } from "@/lib/forms/form-engine/submit-lock";
import type { FormStateSnapshot } from "@/lib/forms/form-engine/types";

export type RunSubmitOptions = {
  enabled?: boolean;
  shadowLabel?: string;
  /** Valore live opzionale per shadow compare (es. state React). */
  shadowLive?: () => unknown;
};

/**
 * Submit da form con onSubmitCapture già eseguito (flush combobox + flushSync).
 * iosSubmitGuard → snapshot immutabile → handler.
 */
export async function runSubmitFromGetter<T extends object>(
  root: HTMLElement | null,
  lock: FormSubmitLock,
  getValues: () => T,
  handler: (snap: FormStateSnapshot<T>) => void | Promise<void>,
  options?: RunSubmitOptions,
): Promise<void> {
  const enabled = options?.enabled ?? isFormEngineEnabled();
  if (!lock.acquire()) return;
  try {
    if (enabled && root) {
      await iosSubmitGuard(root);
    }
    const snap = captureFormSnapshot(getValues);
    if (options?.shadowLive) {
      compareFormEngineShadow(snap, options.shadowLive(), options.shadowLabel);
    }
    await handler(snap);
  } finally {
    lock.release();
  }
}

/**
 * Submit da button onClick (no form submit): flush completo + ios guard + snapshot.
 */
export async function runButtonSubmit<T extends object>(
  root: HTMLElement | null,
  lock: FormSubmitLock,
  getValues: () => T,
  handler: (snap: FormStateSnapshot<T>) => void | Promise<void>,
  options?: RunSubmitOptions,
): Promise<void> {
  const enabled = options?.enabled ?? isFormEngineEnabled();
  if (!lock.acquire()) return;
  try {
    if (enabled) {
      await prepareFormSubmitAsync(root);
    } else {
      prepareFormSubmit(root);
    }
    const snap = captureFormSnapshot(getValues);
    if (options?.shadowLive) {
      compareFormEngineShadow(snap, options.shadowLive(), options.shadowLabel);
    }
    await handler(snap);
  } finally {
    lock.release();
  }
}
