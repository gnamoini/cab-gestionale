import { formatLavorazioneIngressoDisplay } from "@/lib/lavorazioni/lavorazione-ingresso-display";
import type { LavorazioneSchedeBundle } from "@/types/schede";

export type LavorazioneUltimaModificaInfo = {
  iso: string;
  autore: string;
};

/** Data/ora/autore più recenti tra riga DB e schede collegate. */
export function resolveLavorazioneUltimaModifica(
  row: { updated_at: string },
  bundle?: LavorazioneSchedeBundle | null,
): LavorazioneUltimaModificaInfo {
  const candidates: { iso: string; autore: string }[] = [{ iso: row.updated_at, autore: "" }];
  for (const doc of [bundle?.ingresso, bundle?.lavorazioni, bundle?.ricambi]) {
    if (!doc?.updatedAt?.trim()) continue;
    candidates.push({
      iso: doc.updatedAt,
      autore: doc.updatedBy?.trim() ?? "",
    });
  }
  const best = candidates.reduce((a, b) =>
    new Date(a.iso).getTime() >= new Date(b.iso).getTime() ? a : b,
  );
  const autore =
    best.autore ||
    [bundle?.ingresso, bundle?.lavorazioni, bundle?.ricambi]
      .map((d) => d?.updatedBy?.trim())
      .find(Boolean) ||
    "—";
  return { iso: best.iso, autore };
}

export function formatLavorazioneUltimaModificaLine(info: LavorazioneUltimaModificaInfo): string {
  const { date, time } = formatLavorazioneIngressoDisplay(info.iso);
  const parts = [date, time, info.autore].filter((p) => p && p !== "—");
  return parts.length > 0 ? parts.join(" · ") : "—";
}
