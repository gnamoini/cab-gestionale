import { DEFAULT_RENAME_EXECUTION_POLICY } from "@/lib/settings/rename-engine/constants";

export class RenamePropagationTimeoutError extends Error {
  readonly code = "RENAME_PROPAGATION_TIMEOUT" as const;

  constructor(ms: number) {
    super(`Propagazione rinominazione scaduta dopo ${Math.round(ms / 1000)}s`);
    this.name = "RenamePropagationTimeoutError";
  }
}

export function renamePropagationTimeoutMs(): number {
  return DEFAULT_RENAME_EXECUTION_POLICY.timeout_seconds * 1000;
}

/** ponytail: non annulla query Supabase già in flight — solo safety net UX lato client. */
export async function withRenamePropagationTimeout<T>(
  fn: () => Promise<T>,
  ms = renamePropagationTimeoutMs(),
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new RenamePropagationTimeoutError(ms)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
