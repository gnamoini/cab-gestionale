import type { CreateNotificationInput } from "@/lib/notifications/notification-types";
import { tagliandoDaEseguireDedupKey } from "@/lib/notifications/notification-dedup-keys";
import {
  wrapTagliandoDaEseguireNotification,
  type TagliandoDaEseguireNotification,
} from "@/lib/notifications/admin-dashboard-notifications";

export type TagliandoDueBodyInput = {
  attrezzaturaLabel: string;
  cliente: string;
  currentOre: number;
  earliestOverdueOre: number;
  overdueCount: number;
};

export function formatTagliandoDaEseguireBody(evalResult: TagliandoDueBodyInput): string {
  const milestone = evalResult.earliestOverdueOre;
  const base =
    evalResult.currentOre >= milestone
      ? `Per ${evalResult.attrezzaturaLabel} (${evalResult.cliente}) risulta da eseguire il tagliando a ${milestone} h (ore attuali ${evalResult.currentOre} h).`
      : `Per ${evalResult.attrezzaturaLabel} (${evalResult.cliente}) il tagliando a ${milestone} h va eseguito entro 50 ore (ore attuali ${evalResult.currentOre} h).`;
  if (evalResult.overdueCount <= 1) return base;
  const extra = evalResult.overdueCount - 1;
  return `${base} Altri ${extra} tagliand${extra === 1 ? "o" : "i"} risultano scaduti.`;
}

export function buildTagliandoDueNotificationPayload(input: {
  lavorazioneId: string;
  mezzoId: string;
  evalResult: TagliandoDueBodyInput;
}): CreateNotificationInput {
  return {
    type: "tagliando_da_eseguire",
    title: "Tagliando da eseguire",
    body: formatTagliandoDaEseguireBody(input.evalResult),
    href: "/mezzi",
    entity_type: "lavorazioni",
    entity_id: input.lavorazioneId,
    dedup_key: tagliandoDaEseguireDedupKey(input.lavorazioneId),
  };
}

export function buildTagliandoDaEseguireNotification(input: {
  lavorazioneId: string;
  mezzoId: string;
  evalResult: TagliandoDueBodyInput;
  createdAt?: string;
}): TagliandoDaEseguireNotification {
  return wrapTagliandoDaEseguireNotification({
    lavorazioneId: input.lavorazioneId,
    mezzoId: input.mezzoId,
    attrezzaturaLabel: input.evalResult.attrezzaturaLabel,
    cliente: input.evalResult.cliente,
    currentOre: input.evalResult.currentOre,
    earliestOverdueOre: input.evalResult.earliestOverdueOre,
    overdueCount: input.evalResult.overdueCount,
    createdAt: input.createdAt,
  });
}
