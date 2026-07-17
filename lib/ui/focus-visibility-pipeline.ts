/**
 * Focus Visibility Manager V2 — pipeline deterministica con Focus Transaction.
 */

import {
  emitFocusVisibilityDebugEvent,
  renderFocusVisibilityDebugOverlay,
} from "@/lib/ui/focus-visibility-debug";
import {
  getViewportSnapshot,
  waitForViewportStable,
  type ViewportSnapshot,
} from "@/lib/ui/gestionale-viewport-orchestrator";
import {
  CAB_MODAL_ROOT_ATTR,
  applyKeyboardPadToScrollContainer,
  computeFocusScrollDelta,
  getEffectiveVisibleBand,
  getFocusScrollBlockRect,
  getFocusScrollRect,
  isGestionaleFocusableField,
  markGestionaleFocusScrollCompleted,
  resolveFocusExtraBottom,
  resolveFocusExtraTop,
  resolveFocusPositionMode,
  resolveFocusScrollTarget,
  resolveScrollOwner,
  scrollGestionaleFieldIntoView,
  syncKeyboardCssVars,
  type FocusScrollRect,
} from "@/lib/ui/mobile-modal-behavior";

export type FocusTransactionStatus =
  | "created"
  | "waitingViewport"
  | "calculating"
  | "scrolling"
  | "completed"
  | "aborted";

export type ScrollOwner = "browser" | "focus-manager" | "user";

export type FocusTransaction = {
  id: number;
  status: FocusTransactionStatus;
  target: HTMLElement;
  scrollContainer: HTMLElement;
  scrollContainerType: "modal" | "drawer" | "page" | "nested";
  scrollTopBaseline: number;
  focusBlockRectBaseline: FocusScrollRect;
  startedAt: number;
  viewportBefore: ViewportSnapshot;
  viewportAfter: ViewportSnapshot | null;
  abortController: AbortController;
  userScrolled: boolean;
};

let transactionIdSeq = 0;
let activeTransaction: FocusTransaction | null = null;
let scrollOwner: ScrollOwner = "browser";
let isApplyingManagedScroll = false;
let containerScrollListener: ((e: Event) => void) | null = null;
let watchedContainer: HTMLElement | null = null;

function isTerminalStatus(status: FocusTransactionStatus): boolean {
  return status === "completed" || status === "aborted";
}

function detachContainerScrollListener(): void {
  if (watchedContainer && containerScrollListener) {
    watchedContainer.removeEventListener("scroll", containerScrollListener);
  }
  watchedContainer = null;
  containerScrollListener = null;
}

function attachContainerScrollListener(container: HTMLElement, txId: number): void {
  detachContainerScrollListener();
  watchedContainer = container;
  containerScrollListener = (e: Event) => {
    if (isApplyingManagedScroll) return;
    const tx = activeTransaction;
    if (!tx || tx.id !== txId || isTerminalStatus(tx.status)) return;
    if (e.isTrusted) {
      tx.userScrolled = true;
      scrollOwner = "user";
      abortFocusTransaction(txId, "user-scroll");
    }
  };
  container.addEventListener("scroll", containerScrollListener, { passive: true });
}

export function getScrollOwner(): ScrollOwner {
  return scrollOwner;
}

export function getActiveFocusTransaction(): FocusTransaction | null {
  return activeTransaction;
}

export function advanceFocusTransaction(id: number, status: FocusTransactionStatus): void {
  const tx = activeTransaction;
  if (!tx || tx.id !== id) return;
  tx.status = status;
}

export function abortFocusTransaction(id: number, reason: string): void {
  const tx = activeTransaction;
  if (!tx || tx.id !== id || isTerminalStatus(tx.status)) return;
  tx.status = "aborted";
  tx.abortController.abort();
  activeTransaction = null;
  scrollOwner = "browser";
  detachContainerScrollListener();
  emitFocusVisibilityDebugEvent({
    event: "transaction-aborted",
    transaction: id,
    reason,
    scrollOwner,
    status: "aborted",
  });
}

export function beginFocusTransaction(target: HTMLElement): FocusTransaction | null {
  const resolved = resolveScrollOwner(target);
  if (!resolved) return null;

  if (activeTransaction && !isTerminalStatus(activeTransaction.status)) {
    abortFocusTransaction(activeTransaction.id, "superseded");
  }

  syncKeyboardCssVars();
  const id = ++transactionIdSeq;
  const abortController = new AbortController();
  const tx: FocusTransaction = {
    id,
    status: "created",
    target,
    scrollContainer: resolved.container,
    scrollContainerType: resolved.type,
    scrollTopBaseline: resolved.container.scrollTop,
    focusBlockRectBaseline: getFocusScrollBlockRect(target),
    startedAt: typeof performance !== "undefined" ? performance.now() : Date.now(),
    viewportBefore: getViewportSnapshot(),
    viewportAfter: null,
    abortController,
    userScrolled: false,
  };
  activeTransaction = tx;
  scrollOwner = "focus-manager";
  attachContainerScrollListener(resolved.container, id);
  emitFocusVisibilityDebugEvent({
    event: "transaction-created",
    transaction: id,
    scrollOwner: "focus-manager",
    status: "created",
  });
  return tx;
}

function isFocusBlockFullyVisibleForField(field: HTMLElement, container: HTMLElement): boolean {
  const containerRect = container.getBoundingClientRect();
  const { visibleTop, visibleBottom } = getEffectiveVisibleBand({
    containerRect,
    field,
    extraTop: resolveFocusExtraTop(),
    extraBottom: resolveFocusExtraBottom(),
  });
  const block = getFocusScrollBlockRect(field);
  return block.top >= visibleTop - 2 && block.bottom <= visibleBottom + 2;
}

/** Heal UA scroll solo se incompatibile con strategia FVM (non restore aggressivo). */
function maybeHealUaScroll(tx: FocusTransaction): void {
  const { scrollContainer, scrollTopBaseline, target } = tx;
  const currentTop = scrollContainer.scrollTop;
  if (currentTop === scrollTopBaseline) return;

  if (isFocusBlockFullyVisibleForField(target, scrollContainer)) {
    return;
  }

  const blockNow = getFocusScrollBlockRect(target);
  const baseline = tx.focusBlockRectBaseline;
  const worsened =
    blockNow.bottom > baseline.bottom + 4 ||
    blockNow.top < baseline.top - 4;

  if (!worsened && isFocusBlockFullyVisibleForField(target, scrollContainer)) {
    return;
  }

  scrollContainer.scrollTop = scrollTopBaseline;
  emitFocusVisibilityDebugEvent({
    event: "ua-scroll-healed",
    transaction: tx.id,
    delta: scrollTopBaseline - currentTop,
    reason: "ua-incompatible",
    status: tx.status,
  });
}

function applyManagedScroll(tx: FocusTransaction): void {
  const { target } = tx;
  if (tx.userScrolled || scrollOwner === "user") {
    emitFocusVisibilityDebugEvent({
      event: "scroll-skipped",
      transaction: tx.id,
      reason: "user-scroll",
      scrollOwner: "user",
      status: tx.status,
    });
    tx.status = "completed";
    activeTransaction = null;
    scrollOwner = "browser";
    detachContainerScrollListener();
    markGestionaleFocusScrollCompleted(target);
    return;
  }

  advanceFocusTransaction(tx.id, "calculating");
  const container = tx.scrollContainer;
  const containerRect = container.getBoundingClientRect();
  const extraBottom = resolveFocusExtraBottom();
  const extraTop = resolveFocusExtraTop();
  const { visibleTop, visibleBottom } = getEffectiveVisibleBand({
    containerRect,
    field: target,
    extraTop,
    extraBottom,
  });

  const blockRect = getFocusScrollBlockRect(target);
  if (blockRect.top >= visibleTop - 2 && blockRect.bottom <= visibleBottom + 2) {
    if (target.closest(`[${CAB_MODAL_ROOT_ATTR}]`)) {
      applyKeyboardPadToScrollContainer(container);
    }
    emitFocusVisibilityDebugEvent({
      event: "scroll-skipped",
      transaction: tx.id,
      reason: "focus-block-fully-visible",
      scrollOwner: "focus-manager",
      status: "completed",
    });
    renderFocusVisibilityDebugOverlay({
      visibleTop,
      visibleBottom,
      blockTop: blockRect.top,
      blockBottom: blockRect.bottom,
      delta: 0,
      transactionId: tx.id,
    });
    tx.status = "completed";
    tx.viewportAfter = getViewportSnapshot();
    activeTransaction = null;
    scrollOwner = "browser";
    detachContainerScrollListener();
    markGestionaleFocusScrollCompleted(target);
    return;
  }

  const mode = resolveFocusPositionMode(target);
  const scrollRect = getFocusScrollRect(target);
  let delta = computeFocusScrollDelta(scrollRect, visibleTop, visibleBottom);
  if (mode === "topPinned" && delta > 0 && scrollRect.top > visibleTop) {
    delta = scrollRect.top - visibleTop;
  }

  if (Math.abs(delta) < 2) {
    if (target.closest(`[${CAB_MODAL_ROOT_ATTR}]`)) {
      applyKeyboardPadToScrollContainer(container);
    }
    tx.status = "completed";
    activeTransaction = null;
    scrollOwner = "browser";
    detachContainerScrollListener();
    markGestionaleFocusScrollCompleted(target);
    return;
  }

  advanceFocusTransaction(tx.id, "scrolling");
  isApplyingManagedScroll = true;
  try {
    container.scrollBy({ top: delta, behavior: "auto" });
  } catch {
    container.scrollTop += delta;
  } finally {
    isApplyingManagedScroll = false;
  }

  if (target.closest(`[${CAB_MODAL_ROOT_ATTR}]`)) {
    applyKeyboardPadToScrollContainer(container);
  }

  emitFocusVisibilityDebugEvent({
    event: "scroll-applied",
    transaction: tx.id,
    delta,
    reason: delta > 0 ? "below-visible-bottom" : "above-visible-top",
    scrollOwner: "focus-manager",
    status: "scrolling",
  });
  renderFocusVisibilityDebugOverlay({
    visibleTop,
    visibleBottom,
    blockTop: blockRect.top,
    blockBottom: blockRect.bottom,
    delta,
    transactionId: tx.id,
  });

  tx.status = "completed";
  tx.viewportAfter = getViewportSnapshot();
  activeTransaction = null;
  scrollOwner = "browser";
  detachContainerScrollListener();
  markGestionaleFocusScrollCompleted(target);
}

/** Pipeline V2: un solo scroll post-stabilizer (o zero se già visibile). */
export function scheduleManagedFocusScroll(target: HTMLElement): void {
  const resolved = resolveFocusScrollTarget(target);
  const tx = beginFocusTransaction(resolved);
  if (!tx) {
    scrollGestionaleFieldIntoView(resolved, { behavior: "auto" });
    return;
  }

  const txId = tx.id;
  advanceFocusTransaction(txId, "waitingViewport");

  void (async () => {
    try {
      await waitForViewportStable({
        signal: tx.abortController.signal,
        stableFrames: 2,
        quietPeriod: 80,
        timeout: 500,
      });
    } catch {
      return;
    }

    const current = activeTransaction;
    if (!current || current.id !== txId || current.status === "aborted") return;

    maybeHealUaScroll(current);
    if (current.userScrolled || scrollOwner === "user") return;

    applyManagedScroll(current);
  })();
}

export function handleFocusInV2(e: FocusEvent): void {
  const raw = e.target;
  if (raw == null || !isGestionaleFocusableField(raw)) return;
  const target = resolveFocusScrollTarget(raw);
  syncKeyboardCssVars();
  scheduleManagedFocusScroll(target);
}

/** Rischedula transazione attiva se textarea grow con stesso target focalizzato. */
export function notifyFocusBlockLayoutChange(field: HTMLElement): void {
  const tx = activeTransaction;
  if (tx && tx.target === field && document.activeElement === field && !isTerminalStatus(tx.status)) {
    return;
  }
  if (document.activeElement !== field) return;
  scheduleManagedFocusScroll(field);
}

/** Solo test — reset stato modulo. */
export function resetFocusVisibilityPipelineForTests(): void {
  if (activeTransaction && !isTerminalStatus(activeTransaction.status)) {
    activeTransaction.abortController.abort();
  }
  activeTransaction = null;
  scrollOwner = "browser";
  isApplyingManagedScroll = false;
  detachContainerScrollListener();
  transactionIdSeq = 0;
}
