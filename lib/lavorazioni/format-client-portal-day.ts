/** Data ISO → etichetta gg/mm/aaaa per portale clienti. */
export function formatClientPortalDay(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  const trimmed = iso.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
  try {
    return new Date(iso).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
