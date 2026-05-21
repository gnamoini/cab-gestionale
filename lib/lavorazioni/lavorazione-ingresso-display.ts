/** Data + ora ingresso per celle tabella lavorazioni (formato condiviso gestionale / portale clienti). */

export type LavorazioneIngressoDisplay = {
  date: string;
  time: string;
};

export function lavorazioneIngressoIso(
  row: { data_ingresso?: string | null; created_at: string },
  schedaDataIngresso?: string | null,
): string {
  const fromScheda = schedaDataIngresso?.trim();
  if (fromScheda) {
    const d = new Date(fromScheda);
    if (!Number.isNaN(d.getTime()) && /T|\d{1,2}:\d{2}/.test(fromScheda)) {
      return d.toISOString();
    }
  }
  const raw = row.data_ingresso?.trim() || row.created_at;
  return raw;
}

export function formatLavorazioneIngressoDisplay(iso: string | null | undefined): LavorazioneIngressoDisplay {
  if (!iso?.trim()) return { date: "—", time: "" };
  try {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(iso.trim())) {
      return { date: iso.trim(), time: "" };
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { date: iso, time: "" };
    return {
      date: d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }),
      time: d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", hour12: false }),
    };
  } catch {
    return { date: "—", time: "" };
  }
}
