"use client";

import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoFields } from "@/types/schede";

export type MaybePublishTagliandoDueInput = {
  userId: string;
  lavorazioneId: string;
  mezzoId: string | null | undefined;
  fields: SchedaIngressoFields;
  mezzo: MezzoGestito | null;
};

/** Fire-and-forget: server-side dispatch via API (no client publishNotification). */
export function maybePublishTagliandoDueOnInterventoCreate(input: MaybePublishTagliandoDueInput): void {
  void (async () => {
    try {
      const mezzoId = input.mezzoId?.trim();
      if (!mezzoId || !input.lavorazioneId?.trim()) return;

      await fetch("/api/notifications/tagliando-due", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lavorazioneId: input.lavorazioneId,
          mezzoId,
          fields: input.fields,
          mezzo: input.mezzo,
        }),
      });
    } catch (e) {
      console.warn("[tagliando-due] server dispatch request failed:", e);
    }
  })();
}
