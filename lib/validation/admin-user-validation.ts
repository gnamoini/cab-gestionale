/** Validazione input server actions admin utenti. */

import { isValidLoginIdentifier } from "@/src/lib/auth/username";
import { validatePasswordStrength } from "@/lib/validation/password-validation";
import { EMAIL_RE } from "@/lib/validation/email";

export type AdminUserInputValidation = {
  nome: string;
  cognome: string;
  username: string;
  email: string;
  password: string;
  ruolo: string;
};

export function validateCreateUserInput(input: AdminUserInputValidation): string | null {
  const nome = input.nome.trim();
  if (nome.length < 2 || nome.length > 120) return "Nome non valido (2–120 caratteri).";

  const cognome = input.cognome.trim();
  if (cognome.length < 2 || cognome.length > 120) return "Cognome non valido (2–120 caratteri).";

  const username = input.username.trim();
  if (username.length < 3 || username.length > 32) return "Username non valido (3–32 caratteri).";
  if (!/^[a-z0-9._-]+$/i.test(username)) return "Username: solo lettere, numeri, . _ -";

  const email = input.email.trim();
  if (!EMAIL_RE.test(email)) return "Email non valida.";
  if (email.length > 254) return "Email troppo lunga.";

  const password = input.password;
  const passwordErr = validatePasswordStrength(password);
  if (passwordErr) return passwordErr;

  const ruolo = input.ruolo.trim();
  if (!ruolo) return "Ruolo obbligatorio.";

  return null;
}

export function validateResolveLoginIdentifier(identifier: string): string | null {
  const t = identifier.trim();
  if (!t) return "Identificativo obbligatorio.";
  if (t.length > 254) return "Identificativo troppo lungo.";
  if (!isValidLoginIdentifier(t)) return "Identificativo non valido.";
  return null;
}
