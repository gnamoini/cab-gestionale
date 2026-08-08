export class PopupBlockedError extends Error {
  readonly sessionId: string;

  constructor(sessionId: string, message = "Popup blocked by browser") {
    super(message);
    this.name = "PopupBlockedError";
    this.sessionId = sessionId;
  }
}

export type PopupGuardContext =
  | "etichette"
  | "pdf"
  | "scheda"
  | "report"
  | "documento"
  | "export"
  | "print";

export type PopupUrlKind = "blob" | "api" | "external" | "about_blank";

export type OpenSafePopupResult =
  | { status: "opened" }
  | { status: "blocked"; sessionId: string }
  | { status: "invalid_url" };

export type DeferredPopupHandle = {
  navigate: (url: string, options?: { revokeBlobUrlAfterMs?: number }) => OpenSafePopupResult;
  close: () => void;
  isAlive: () => boolean;
  /** Finestra pre-aperta (solo flusso deferred). */
  getWindow: () => Window | null;
};

export type OpenDeferredPopupResult = DeferredPopupHandle | { status: "blocked"; sessionId: string };

export type OpenSafePopupOptions = {
  url: string;
  context: PopupGuardContext;
  label?: string;
  revokeBlobUrlAfterMs?: number;
  /** Endpoint riapribile su retry pre-fetch (es. `/api/...`). Mai `blob:` pre-generazione. */
  retryUrl?: string;
  /** Se false, non mostra il dialog (es. gestione esterna). Default true. */
  showBlockedDialog?: boolean;
  phase?: "sync" | "retry" | "navigate" | "preopen";
};

export type OpenDeferredPopupOptions = {
  context: PopupGuardContext;
  label?: string;
  showBlockedDialog?: boolean;
  /** Endpoint riapribile su retry (es. `/api/pdf/artifacts/...`). Vietato `blob:` / `about:blank`. */
  retryUrl?: string;
};
