/** Normalizza testo italiano per regex intent (accenti, apostrofi). */
export function normalizeAskMessage(message: string): string {
  return message
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[''`]/g, "'")
    .replace(/\s+/g, " ");
}
