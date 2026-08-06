import { detectPwaPlatform } from "@/lib/pwa/pwa-platform";

export type PopupInstructionProfile =
  | "chrome"
  | "edge"
  | "safari_ios"
  | "safari_mac"
  | "firefox"
  | "generic";

/** Hostname da mostrare per whitelist popup (client-safe). */
export function resolvePopupWhitelistDomain(): string {
  if (typeof window === "undefined") {
    const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (site) {
      try {
        return new URL(site).hostname;
      } catch {
        /* ignore */
      }
    }
    return "questo sito";
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) {
    try {
      return new URL(site).hostname;
    } catch {
      /* ignore */
    }
  }
  return window.location.hostname || "questo sito";
}

export function detectPopupInstructionProfile(
  userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "",
  maxTouchPoints = typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0,
): PopupInstructionProfile {
  const ua = userAgent.trim();
  if (!ua) return "generic";

  const platform = detectPwaPlatform(ua, maxTouchPoints);
  if (platform === "ios") return "safari_ios";

  if (/Firefox\//i.test(ua)) return "firefox";
  if (/Edg\//i.test(ua)) return "edge";
  if (/Chrome\//i.test(ua) || /CriOS\//i.test(ua)) return "chrome";
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "safari_mac";

  return "generic";
}

export type PopupInstructionStep = {
  title: string;
  steps: string[];
};

export function getPopupUnblockInstructions(
  profile: PopupInstructionProfile,
  domain: string,
): PopupInstructionStep {
  switch (profile) {
    case "chrome":
      return {
        title: "Google Chrome",
        steps: [
          `Nella barra degli indirizzi, tocca l'icona a sinistra del dominio ${domain}.`,
          "Apri «Impostazioni sito» o «Autorizzazioni».",
          "Imposta «Pop-up e reindirizzamenti» su Consenti.",
          "Riprova l'apertura del documento.",
        ],
      };
    case "edge":
      return {
        title: "Microsoft Edge",
        steps: [
          `Clicca l'icona del lucchetto o delle autorizzazioni accanto a ${domain}.`,
          "Seleziona «Autorizzazioni per questo sito».",
          "Consenti «Pop-up e reindirizzamenti».",
          "Riprova l'apertura del documento.",
        ],
      };
    case "safari_ios":
      return {
        title: "Safari (iPhone/iPad)",
        steps: [
          `Tocca l'icona «aA» a sinistra della barra degli indirizzi su ${domain}.`,
          "Apri «Impostazioni sito web».",
          "Imposta «Pop-up» su Consenti.",
          "Riprova l'apertura del documento.",
        ],
      };
    case "safari_mac":
      return {
        title: "Safari (Mac)",
        steps: [
          "Apri Safari → Impostazioni → Siti web → Pop-up.",
          `Aggiungi ${domain} all'elenco «Consenti».`,
          "Riprova l'apertura del documento.",
        ],
      };
    case "firefox":
      return {
        title: "Mozilla Firefox",
        steps: [
          `Clicca l'icona dello scudo o del lucchetto nella barra degli indirizzi su ${domain}.`,
          "Apri «Autorizzazioni» o «Informazioni sulla pagina».",
          "Consenti «Aprire finestre popup».",
          "Riprova l'apertura del documento.",
        ],
      };
    default:
      return {
        title: "Il tuo browser",
        steps: [
          `Nelle impostazioni del sito per ${domain}, consenti i pop-up.`,
          "Su dispositivi aziendali potrebbe servire l'assistenza IT.",
          "Riprova l'apertura del documento.",
        ],
      };
  }
}

export function popupContextLabel(context: string, label?: string): string {
  if (label?.trim()) return label.trim();
  switch (context) {
    case "etichette":
      return "etichetta";
    case "scheda":
      return "scheda";
    case "report":
      return "report";
    case "documento":
      return "documento";
    case "export":
      return "export";
    case "print":
      return "stampa";
    default:
      return "PDF";
  }
}
