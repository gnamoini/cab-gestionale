import type { BeforeInstallPromptEvent } from "@/lib/pwa/pwa-install";
import {
  clearInstallDismiss,
  markPwaInstallCompleted,
} from "@/lib/pwa/pwa-install-state";

export type PwaInstallRuntimeState = {
  deferredPrompt: BeforeInstallPromptEvent | null;
  installed: boolean;
  availableAt: number | null;
};

type Listener = () => void;

const initialState: PwaInstallRuntimeState = {
  deferredPrompt: null,
  installed: false,
  availableAt: null,
};

let state: PwaInstallRuntimeState = { ...initialState };
const listeners = new Set<Listener>();
let bridgeMounted = false;

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function mirrorDevPrompt(): void {
  if (typeof window === "undefined" || process.env.NODE_ENV === "production") return;
  const w = window as Window & { __CAB_PWA_INSTALL_PROMPT__?: BeforeInstallPromptEvent | null };
  w.__CAB_PWA_INSTALL_PROMPT__ = state.deferredPrompt;
}

export function getPwaInstallRuntime(): Readonly<PwaInstallRuntimeState> {
  return state;
}

export function subscribePwaInstallRuntime(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setPwaDeferredInstallPrompt(event: BeforeInstallPromptEvent | null): void {
  state = {
    ...state,
    deferredPrompt: event,
    availableAt: event ? Date.now() : null,
  };
  mirrorDevPrompt();
  notify();
}

export function clearPwaDeferredInstallPrompt(): void {
  if (!state.deferredPrompt && state.availableAt === null) return;
  state = {
    ...state,
    deferredPrompt: null,
    availableAt: null,
  };
  mirrorDevPrompt();
  notify();
}

export function markPwaInstallRuntimeInstalled(): void {
  if (state.installed) return;
  state = { ...state, installed: true };
  notify();
}

/** Reset coerente su appinstalled. */
export function handlePwaAppInstalled(): void {
  clearInstallDismiss();
  markPwaInstallCompleted();
  clearPwaDeferredInstallPrompt();
  markPwaInstallRuntimeInstalled();
}

export function claimPwaInstallBridgeMount(): boolean {
  if (bridgeMounted) return false;
  bridgeMounted = true;
  return true;
}

export function releasePwaInstallBridgeMount(): void {
  bridgeMounted = false;
}

/** Solo test — reset singleton. */
export function resetPwaInstallRuntimeForTests(): void {
  state = { ...initialState };
  listeners.clear();
  bridgeMounted = false;
  mirrorDevPrompt();
}
