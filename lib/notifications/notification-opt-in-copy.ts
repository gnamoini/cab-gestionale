export type NotificationOptInMode = "push" | "browser";

export function notificationOptInContextLabel(mode: NotificationOptInMode): string {
  return mode === "push" ? "App sul telefono" : "Su questo browser";
}

export function notificationOptInDescription(mode: NotificationOptInMode): string {
  if (mode === "push") {
    return "Ricevi avvisi anche con l'app chiusa o in secondo piano. Puoi cambiare idea in qualsiasi momento dal menu notifiche.";
  }
  return "Ricevi popup di sistema anche con il gestionale in un'altra scheda. Puoi cambiare idea in qualsiasi momento dal menu notifiche.";
}

export function notificationOptInAcceptLabel(): string {
  return "Sì, attiva";
}

export function notificationOptInDeclineLabel(): string {
  return "No, grazie";
}

export function notificationOptInSuccessMessage(): string {
  return "Notifiche attivate. Riceverai gli avvisi su questo dispositivo.";
}

export function notificationOptInDeniedMessage(mode: NotificationOptInMode): string {
  if (mode === "push") {
    return "Notifiche bloccate. Consenti le notifiche per C.A.B. dalle impostazioni del telefono o del browser.";
  }
  return "Notifiche bloccate. Clicca sul lucchetto nella barra degli indirizzi e consenti le notifiche per questo sito.";
}
