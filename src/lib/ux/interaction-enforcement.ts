const TECHNICAL_ERROR_HINTS = [
  "rls",
  "sql",
  "supabase",
  "postgres",
  "stack",
  "trace",
  "exception",
  "jwt",
  "permission denied",
  "violates",
  "syntax error",
] as const;

export const UX_TOAST_CALLER_ALLOWLIST = [
  "src/hooks/use-gestionale-toast.ts",
  "context/toast-context.tsx",
  "context/upload-feedback-context.tsx",
  "src/components/gestionale-realtime-bridge.tsx",
  "src/components/gestionale-notifications-bridge.tsx",
  "src/providers/query-provider.tsx",
  "src/lib/ux/interaction-enforcement.ts",
] as const;

/** Minimo intervallo tra due log console per la stessa chiave (dev / HMR). */
const WARN_THROTTLE_MS = 10_000;

type WarnStore = {
  lastAt: Map<string, number>;
  violationCounts: Map<string, number>;
};

const warnStore: WarnStore =
  typeof globalThis !== "undefined"
    ? ((globalThis as unknown as { __cabUxWarnStore?: WarnStore }).__cabUxWarnStore ??= {
        lastAt: new Map(),
        violationCounts: new Map(),
      })
    : { lastAt: new Map(), violationCounts: new Map() };

export function isUxEnforcementDevMode(): boolean {
  return process.env.NODE_ENV !== "production";
}

function normalizeStack(input: string): string {
  return input.replace(/\\/g, "/").toLowerCase();
}

function extractCallerFingerprint(stack?: string): string {
  if (!stack) return "unknown";
  const norm = normalizeStack(stack);
  const lines = norm.split("\n").slice(1);
  for (const line of lines) {
    if (line.includes("toast-context") || line.includes("interaction-enforcement")) continue;
    const match = /(?:at\s+)?(?:.*\s+)?\(?([^():]+):(\d+):(\d+)\)?/.exec(line);
    if (match?.[1]) return match[1].replace(/^.*\/([^/]+)$/, "$1");
    if (line.includes("use-gestionale-toast")) return "use-gestionale-toast";
  }
  return lines[0]?.trim().slice(0, 120) || "unknown";
}

function warnThrottled(key: string, message: string, groupLabel?: string): void {
  if (!isUxEnforcementDevMode()) return;

  const now = Date.now();
  const lastAt = warnStore.lastAt.get(key) ?? 0;
  const count = (warnStore.violationCounts.get(groupLabel ?? key) ?? 0) + 1;
  warnStore.violationCounts.set(groupLabel ?? key, count);

  if (now - lastAt < WARN_THROTTLE_MS) return;
  warnStore.lastAt.set(key, now);

  console.warn(message);
  if (groupLabel && count > 1) {
    console.warn(
      `[UX Enforcement] (${count - 1} occorrenze aggiuntive di "${groupLabel}" non mostrate negli ultimi ${WARN_THROTTLE_MS / 1000}s — correggere il caller)`,
    );
  }
}

export function isTechnicalErrorMessage(message: string): boolean {
  const text = message.trim().toLowerCase();
  if (!text) return false;
  if (/at\s+\S+\s+\(.+:\d+:\d+\)/.test(text)) return true;
  return TECHNICAL_ERROR_HINTS.some((hint) => text.includes(hint));
}

export function warnTechnicalErrorToast(message: string): void {
  if (!isUxEnforcementDevMode()) return;
  if (!isTechnicalErrorMessage(message)) return;
  const preview = message.length > 80 ? `${message.slice(0, 80)}…` : message;
  warnThrottled(
    `technical-toast:${preview}`,
    `[UX Enforcement] Error toast non humanizzato rilevato: "${preview}". Usa useGestionaleToast.error(...) o humanizeGestionaleError().`,
    "error toast non humanizzato",
  );
}

export function shouldWarnDirectUseToast(stack?: string): boolean {
  if (!isUxEnforcementDevMode()) return false;
  if (!stack) return true;
  const norm = normalizeStack(stack);
  return !UX_TOAST_CALLER_ALLOWLIST.some((allowed) => norm.includes(allowed.toLowerCase()));
}

export function warnDirectUseToast(stack?: string): void {
  if (!shouldWarnDirectUseToast(stack)) return;
  const caller = extractCallerFingerprint(stack);
  warnThrottled(
    `direct-use-toast:${caller}`,
    `[UX Enforcement] useToast() diretto rilevato (${caller}). Usa useGestionaleToast() per feedback utente.`,
    "useToast() diretto",
  );
}

export function warnLegacyDialogApi(apiName: "alert" | "confirm" | "prompt"): void {
  if (!isUxEnforcementDevMode()) return;
  warnThrottled(
    `legacy-dialog:${apiName}`,
    `[UX Enforcement] window.${apiName}() è vietato. Usa useGestionaleToast() / useGestionaleConfirm().`,
    `window.${apiName}`,
  );
}

/** Solo per test/dev: reset contatori warn. */
export function resetUxEnforcementWarningsForTests(): void {
  warnStore.lastAt.clear();
  warnStore.violationCounts.clear();
}
