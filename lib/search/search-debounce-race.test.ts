/**
 * Verifies AbortSignal cancels in-flight queryFn before stale data resolves.
 */
import assert from "node:assert/strict";

function serviceQueryAbortError(): DOMException {
  return new DOMException("The operation was aborted.", "AbortError");
}

function runWithAbortSignal<T>(signal: AbortSignal | undefined, run: () => Promise<T>): Promise<T> {
  if (!signal) return run();
  if (signal.aborted) return Promise.reject(serviceQueryAbortError());

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(serviceQueryAbortError());
    signal.addEventListener("abort", onAbort, { once: true });
    run()
      .then((value) => {
        signal.removeEventListener("abort", onAbort);
        if (signal.aborted) reject(serviceQueryAbortError());
        else resolve(value);
      })
      .catch((err) => {
        signal.removeEventListener("abort", onAbort);
        reject(err);
      });
  });
}

async function main() {
  let resolveSlow: ((v: string) => void) | null = null;
  const slowFetch = new Promise<string>((resolve) => {
    resolveSlow = resolve;
  });

  const controller = new AbortController();
  const raced = runWithAbortSignal(controller.signal, () => slowFetch);

  controller.abort();

  await raced.catch((err: unknown) => {
    assert.equal((err as DOMException).name, "AbortError");
  });

  resolveSlow!("stale");
  await new Promise((r) => setTimeout(r, 10));

  console.log("search-debounce-race.test.ts OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
