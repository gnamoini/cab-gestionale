/** Compose display name da profiles.nome + profiles.cognome (SSOT). */

export function profileDisplayName(input: { nome: string; cognome?: string | null }): string {
  const nome = input.nome.trim();
  const cognome = input.cognome?.trim();
  if (!nome) return cognome ?? "";
  return cognome ? `${nome} ${cognome}` : nome;
}

/** Nome visualizzato per UI admin (tabella sicurezza). */
export function securityUserDisplayName(row: { nome: string; cognome?: string | null }): string {
  return profileDisplayName(row);
}
