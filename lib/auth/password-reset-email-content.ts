import { CAB_APP_PRODUCT_NAME } from "@/lib/branding/cab-product-identity";

export const PASSWORD_RESET_EMAIL_SUBJECT = `Reimposta la password — ${CAB_APP_PRODUCT_NAME}`;

export const PASSWORD_RESET_EMAIL_CTA_LABEL = "Reimposta password";

export function buildPasswordResetEmailText(input: {
  displayName: string;
  resetUrl: string;
}): string {
  const name = input.displayName.trim() || CAB_APP_PRODUCT_NAME;
  return [
    "Gentile utente,",
    "",
    "abbiamo ricevuto una richiesta per reimpostare la password del tuo account.",
    "",
    "Usa il link qui sotto per scegliere una nuova password. Il link è valido per 1 ora.",
    "",
    input.resetUrl,
    "",
    "Se non hai richiesto tu il reset, puoi ignorare questa email: la tua password resterà invariata.",
    "",
    "Cordiali saluti,",
    name,
  ].join("\n");
}
