"use client";

import { maintenancePlansEntry } from "@/lib/domain/maintenance-plans-entry";
import {
  evaluateTagliandoDueForMezzo,
  isMezzoEligibleForTagliandoNotification,
  parseSchedaOreLavoroMotoreFromCampi,
} from "@/lib/maintenance-plans/tagliando-due-eval";
import { buildTagliandoDaEseguireNotification } from "@/lib/maintenance-plans/tagliando-due-notification-mapper";
import { publishNotification } from "@/lib/notifications/publish-notification";
import { resolveNotificationsV2Mode } from "@/lib/notifications/notifications-v2-flag";
import { mezziService } from "@/src/services/mezzi.service";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoFields } from "@/types/schede";

export type MaybePublishTagliandoDueInput = {
  userId: string;
  lavorazioneId: string;
  mezzoId: string | null | undefined;
  fields: SchedaIngressoFields;
  mezzo: MezzoGestito | null;
};

async function loadEvalContext(mezzoId: string) {
  const [plansRes, catalogRes, servicesRes] = await Promise.all([
    maintenancePlansEntry.listPlans(),
    maintenancePlansEntry.listTipoCatalog(),
    maintenancePlansEntry.listServicesLite(),
  ]);
  const plans = plansRes.data ?? [];
  const catalog = (catalogRes.data ?? []).map((c) => ({ id: c.id, label: c.label }));
  const services = (servicesRes.data ?? []).filter((s) => s.mezzoId === mezzoId);
  return { plans, catalog, services };
}

/** Fire-and-forget: non blocca il create lavorazione. */
export function maybePublishTagliandoDueOnInterventoCreate(input: MaybePublishTagliandoDueInput): void {
  void (async () => {
    try {
      const mezzoId = input.mezzoId?.trim();
      if (!mezzoId || !input.lavorazioneId?.trim()) return;

      const mezzoRes = await mezziService.getGestitoById(mezzoId);
      const mezzo = mezzoRes.success ? mezzoRes.data : null;
      if (!isMezzoEligibleForTagliandoNotification(mezzo)) return;

      const currentOre = parseSchedaOreLavoroMotoreFromCampi(input.fields);
      const { plans, catalog, services } = await loadEvalContext(mezzoId);
      const evalResult = evaluateTagliandoDueForMezzo({
        mezzo,
        currentOre,
        plans,
        catalog,
        services,
      });
      if (!evalResult) return;

      const notification = buildTagliandoDaEseguireNotification({
        lavorazioneId: input.lavorazioneId,
        mezzoId,
        evalResult,
      });
      await publishNotification(input.userId, notification, resolveNotificationsV2Mode(null));
    } catch (e) {
      console.warn("[tagliando-due] publish failed:", e);
    }
  })();
}
