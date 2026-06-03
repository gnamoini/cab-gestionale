export const PASSWORD_MIN_LEN = 8;
export const PASSWORD_MAX_LEN = 128;

/** Validazione password utente (login reset, creazione admin). */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < PASSWORD_MIN_LEN) return "Password: minimo 8 caratteri.";
  if (password.length > PASSWORD_MAX_LEN) return "Password troppo lunga.";
  return null;
}

export function validatePasswordConfirmation(password: string, confirm: string): string | null {
  const strength = validatePasswordStrength(password);
  if (strength) return strength;
  if (password !== confirm) return "Le password non coincidono.";
  return null;
}
