export function preventivoEsistenteConfirmMessage(count: number): string {
  if (count <= 1) {
    return "Per questa lavorazione è già stato creato un preventivo.";
  }
  return `Per questa lavorazione sono già stati creati ${count} preventivi.`;
}
