export type IdentificaSubmitPhase = "creating" | "uploading" | "starting";

export type IdentificaSearchProgressView = {
  headline: string;
  hint: string;
  warning: string | null;
  showStages: boolean;
};

function formatElapsedIt(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return rem > 0 ? `${minutes}m ${rem}s` : `${minutes}m`;
}

export function deriveIdentificaSearchProgress(input: {
  submitPhase: IdentificaSubmitPhase | null;
  submitStartedAt: number | null;
  pollStatus?: string | null;
  stagesCount: number;
  nowMs?: number;
}): IdentificaSearchProgressView {
  const nowMs = input.nowMs ?? Date.now();
  const elapsed =
    input.submitStartedAt != null ? Math.max(0, nowMs - input.submitStartedAt) : 0;
  const elapsedLabel = formatElapsedIt(elapsed);

  if (input.stagesCount > 0) {
    return {
      headline: "Identificazione in corso",
      hint: `Passaggi visibili sotto · ${elapsedLabel}`,
      warning: null,
      showStages: true,
    };
  }

  if (input.submitPhase === "creating") {
    return {
      headline: "Creazione ricerca",
      hint: "Salvataggio dei dati inseriti.",
      warning: null,
      showStages: false,
    };
  }

  if (input.submitPhase === "uploading") {
    return {
      headline: "Caricamento foto",
      hint: "Upload immagini in corso prima dell'analisi.",
      warning: null,
      showStages: false,
    };
  }

  if (input.submitPhase === "starting") {
    if (elapsed < 5_000) {
      return {
        headline: "Avvio analisi sul server",
        hint: "Connessione al motore di identificazione.",
        warning: null,
        showStages: false,
      };
    }
    if (elapsed < 45_000) {
      return {
        headline: "Elaborazione sul server",
        hint: `Analisi in corso · ${elapsedLabel}. I passaggi compariranno a breve.`,
        warning: null,
        showStages: false,
      };
    }
    return {
      headline: "Elaborazione lunga in corso",
      hint: `Attivo da ${elapsedLabel} — non è bloccato su avvio, il server sta ancora lavorando.`,
      warning: "Se dopo 2 minuti non compaiono passaggi, ricarica la pagina e riprova.",
      showStages: false,
    };
  }

  const status = input.pollStatus ?? "draft";
  if (status === "processing") {
    return {
      headline: "Identificazione in corso",
      hint: `Elaborazione attiva · ${elapsedLabel}`,
      warning: null,
      showStages: false,
    };
  }

  if (status === "pending") {
    if (elapsed >= 45_000) {
      return {
        headline: "In coda worker",
        hint: `In attesa da ${elapsedLabel}.`,
        warning: "La ricerca è in coda da tempo — il worker potrebbe non essere attivo.",
        showStages: false,
      };
    }
    return {
      headline: "In coda worker",
      hint: "In attesa che il worker prenda in carico la ricerca.",
      warning: null,
      showStages: false,
    };
  }

  if (status === "draft") {
    return {
      headline: "Preparazione ricerca",
      hint: "Completamento setup prima dell'avvio.",
      warning: null,
      showStages: false,
    };
  }

  return {
    headline: "Avvio identificazione",
    hint: elapsed > 0 ? `In corso · ${elapsedLabel}` : "Attendi qualche secondo.",
    warning: null,
    showStages: false,
  };
}
