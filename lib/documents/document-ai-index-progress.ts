import { formatNotificationRelativeTime } from "@/lib/lavorazioni/format-notification-relative-time";

/** ponytail: soglie fisse — upgrade path = heartbeat worker + SLA per dimensione PDF */
const PENDING_STALE_MS = 3 * 60_000;
const PROCESSING_STALE_MS = 8 * 60_000;
const PROCESSING_SLOW_MS = 5 * 60_000;

export type DocumentAiIndexProgressInput = {
  status?: string | null;
  understandingStatus?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  attemptCount?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

export type DocumentAiIndexProgressView = {
  isActive: boolean;
  phaseHeadline: string | null;
  phaseHint: string | null;
  activityLabel: string | null;
  durationLabel: string | null;
  staleWarning: string | null;
  errorDetail: string | null;
  expectedHint: string | null;
};

export type DocumentAiIndexEnqueueProgress = {
  headline: string;
  hint: string;
  warning: string | null;
};

function parseMs(iso?: string | null): number | null {
  const raw = iso?.trim();
  if (!raw) return null;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? null : t;
}

function formatDurationIt(ms: number): string {
  const abs = Math.max(0, ms);
  const minutes = Math.round(abs / 60_000);
  if (minutes < 1) return "meno di 1 minuto";
  if (minutes === 1) return "1 minuto";
  if (minutes < 60) return `${minutes} minuti`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? "1 ora" : `${hours} ore`;
}

function isInProgress(input: DocumentAiIndexProgressInput): boolean {
  const fs = input.status ?? "none";
  const us = input.understandingStatus ?? "none";
  if (fs === "failed" || us === "failed") return false;
  if (fs === "indexed" && (us === "ready" || us === "ready_with_warnings")) return false;
  return true;
}

function inQueue(fs: string, us: string): boolean {
  return fs === "pending" && us === "pending";
}

function deriveIndexPhase(fs: string, us: string): { headline: string; hint: string } {
  if (inQueue(fs, us)) {
    return {
      headline: "In coda worker",
      hint: "Il documento è in attesa di essere preso in carico. Di solito pochi secondi.",
    };
  }
  if (fs === "processing") {
    return {
      headline: "Caricamento File Search",
      hint: "Upload del PDF nel motore di ricerca documenti.",
    };
  }
  if (fs === "indexed" && us === "pending") {
    return {
      headline: "Coda analisi catalogo",
      hint: "File Search completato. In attesa dell'estrazione codici e prezzi.",
    };
  }
  if (fs === "indexed" && us === "processing") {
    return {
      headline: "Analisi catalogo/listino",
      hint: "Estrazione ricambi dal PDF — sui listini lunghi può richiedere diversi minuti.",
    };
  }
  if (fs === "indexed" && us === "ready_with_warnings") {
    return {
      headline: "Indicizzato con avvisi",
      hint: "Estrazione parziale. Usa Riprova indicizzazione per migliorare la copertura.",
    };
  }
  if (fs === "pending" || us === "pending" || fs === "processing" || us === "processing") {
    return {
      headline: "Indicizzazione in corso",
      hint: "Elaborazione in corso sul server.",
    };
  }
  return {
    headline: "In attesa di indicizzazione",
    hint: "Avvia l'indicizzazione per rendere il documento ricercabile.",
  };
}

/** Messaggi mentre la UI attende la risposta HTTP del POST indicizzazione (worker inline). */
export function deriveDocumentAiIndexEnqueueProgress(
  startedAtMs: number,
  nowMs = Date.now(),
): DocumentAiIndexEnqueueProgress {
  const elapsed = Math.max(0, nowMs - startedAtMs);
  if (elapsed < 4_000) {
    return {
      headline: "Contatto server",
      hint: "Invio richiesta di avvio al gestionale.",
      warning: null,
    };
  }
  if (elapsed < 30_000) {
    return {
      headline: "Avvio worker",
      hint: "Il server sta preparando l'indicizzazione.",
      warning: null,
    };
  }
  if (elapsed < 120_000) {
    return {
      headline: "Elaborazione sul server",
      hint: "Su PDF grandi o listini può richiedere alcuni minuti. Puoi chiudere il dettaglio: l'indicizzazione continua.",
      warning: null,
    };
  }
  return {
    headline: "Connessione lenta",
    hint: `Richiesta attiva da ${formatDurationIt(elapsed)}.`,
    warning: "Se il messaggio non cambia, ricarica il dettaglio documento o usa Riprova indicizzazione.",
  };
}

export function deriveDocumentAiIndexProgress(
  input: DocumentAiIndexProgressInput,
  nowMs = Date.now(),
): DocumentAiIndexProgressView {
  const fs = input.status ?? "none";
  const us = input.understandingStatus ?? "none";
  const updatedMs = parseMs(input.updatedAt);
  const createdMs = parseMs(input.createdAt) ?? updatedMs;
  const isActive = isInProgress(input);

  const errorDetail =
    fs === "failed" || us === "failed"
      ? [input.errorCode, input.errorMessage].filter(Boolean).join(" — ") || null
      : null;

  if (!isActive && !errorDetail) {
    return {
      isActive: false,
      phaseHeadline: null,
      phaseHint: null,
      activityLabel: updatedMs ? `Completato ${formatNotificationRelativeTime(input.updatedAt!, nowMs)}` : null,
      durationLabel: null,
      staleWarning: null,
      errorDetail: null,
      expectedHint: null,
    };
  }

  const phase = deriveIndexPhase(fs, us);

  const idleMs = updatedMs != null ? nowMs - updatedMs : null;
  const totalMs = createdMs != null ? nowMs - createdMs : null;

  const activityLabel =
    updatedMs != null ? `Ultimo aggiornamento ${formatNotificationRelativeTime(input.updatedAt!, nowMs)}` : null;

  const durationLabel = totalMs != null ? `In elaborazione da ${formatDurationIt(totalMs)}` : null;

  let staleWarning: string | null = null;
  if (idleMs != null && fs !== "failed" && us !== "failed") {
    const inQueue = fs === "pending" && us === "pending";
    const threshold = inQueue ? PENDING_STALE_MS : PROCESSING_STALE_MS;
    if (idleMs >= threshold) {
      staleWarning = inQueue
        ? `In coda da ${formatDurationIt(totalMs ?? idleMs)} senza avvio — il worker potrebbe non essere attivo. Riprova l'indicizzazione.`
        : `Nessun aggiornamento da ${formatDurationIt(idleMs)} — potrebbe essere bloccata. Riprova l'indicizzazione.`;
    }
  }

  let expectedHint: string | null = null;
  if (fs === "processing") {
    expectedHint = "File Search: di solito 2–15 minuti sui PDF medi.";
  } else if (fs === "indexed" && us === "processing") {
    expectedHint = "Analisi listino/catalogo in corso — sui PDF lunghi può richiedere 10+ minuti.";
  } else if (fs === "indexed" && us === "pending") {
    expectedHint = "In coda per l'analisi catalogo dopo File Search.";
  } else if (inQueue(fs, us)) {
    expectedHint = "In coda: pochi secondi se il worker è configurato.";
  }
  if (
    idleMs != null &&
    idleMs >= PROCESSING_SLOW_MS &&
    idleMs < PROCESSING_STALE_MS &&
    fs !== "failed" &&
    us !== "failed"
  ) {
    expectedHint = `Nessun aggiornamento da ${formatDurationIt(idleMs)} — ancora in elaborazione o in stallo.`;
  }

  return {
    isActive,
    phaseHeadline: phase.headline,
    phaseHint: phase.hint,
    activityLabel,
    durationLabel,
    staleWarning,
    errorDetail,
    expectedHint,
  };
}
