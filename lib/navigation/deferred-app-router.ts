type RouterReplace = {
  replace: (href: string, options?: { scroll?: boolean }) => void;
};

type RouterRefresh = {
  refresh: () => void;
};

const ROUTER_NOT_READY = "Router action dispatched before initialization";

function deferClientTask(fn: () => void): void {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(() => {
    window.setTimeout(fn, 0);
  });
}

function isRouterNotReadyError(err: unknown): boolean {
  return err instanceof Error && err.message.includes(ROUTER_NOT_READY);
}

/** Evita crash Turbopack/Next 16 se il router non è ancora pronto. */
export function deferredRouterReplace(router: RouterReplace, href: string, options?: { scroll?: boolean }): void {
  const run = () => {
    try {
      router.replace(href, options);
    } catch (err) {
      if (!isRouterNotReadyError(err)) throw err;
      window.setTimeout(() => router.replace(href, options), 32);
    }
  };
  deferClientTask(run);
}

export function deferredRouterRefresh(router: RouterRefresh): void {
  const run = () => {
    try {
      router.refresh();
    } catch (err) {
      if (!isRouterNotReadyError(err)) throw err;
      window.setTimeout(() => router.refresh(), 32);
    }
  };
  deferClientTask(run);
}
