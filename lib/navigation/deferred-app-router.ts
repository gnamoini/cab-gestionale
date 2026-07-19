type RouterPush = {
  push: (href: string, options?: { scroll?: boolean }) => void;
};

type RouterReplace = {
  replace: (href: string, options?: { scroll?: boolean }) => void;
};

type RouterRefresh = {
  refresh: () => void;
};

const ROUTER_NOT_READY = "before initialization";

function deferClientTask(fn: () => void): void {
  if (typeof window === "undefined") {
    setTimeout(fn, 0);
    return;
  }
  const schedule =
    typeof window.requestAnimationFrame === "function"
      ? (cb: () => void) => window.requestAnimationFrame(cb)
      : (cb: () => void) => window.setTimeout(cb, 0);
  schedule(() => {
    window.setTimeout(fn, 0);
  });
}

function isRouterNotReadyError(err: unknown): boolean {
  return err instanceof Error && err.message.includes(ROUTER_NOT_READY);
}

function runDeferredRouterAction(action: () => void, retry: () => void): void {
  const run = () => {
    try {
      action();
    } catch (err) {
      if (!isRouterNotReadyError(err)) throw err;
      window.setTimeout(retry, 32);
    }
  };
  deferClientTask(run);
}

/** Evita crash Turbopack/Next 16 se il router non è ancora pronto. */
export function deferredRouterPush(router: RouterPush, href: string, options?: { scroll?: boolean }): void {
  runDeferredRouterAction(
    () => router.push(href, options),
    () => router.push(href, options),
  );
}

/** Evita crash Turbopack/Next 16 se il router non è ancora pronto. */
export function deferredRouterReplace(router: RouterReplace, href: string, options?: { scroll?: boolean }): void {
  runDeferredRouterAction(
    () => router.replace(href, options),
    () => router.replace(href, options),
  );
}

export function deferredRouterRefresh(router: RouterRefresh): void {
  runDeferredRouterAction(
    () => router.refresh(),
    () => router.refresh(),
  );
}
