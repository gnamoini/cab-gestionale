import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MAINTENANCE_PLAN_EQUIPMENT_TYPES_COLUMNS,
  MAINTENANCE_PLAN_PARTS_COLUMNS,
  MAINTENANCE_PLANS_COLUMNS,
  MAGAZZINO_RICAMBI_COLUMNS,
  TIPI_ATTREZZATURA_CATALOG_COLUMNS,
  VEHICLE_MAINTENANCE_SERVICES_COLUMNS,
} from "@/lib/db/table-select-columns";
import {
  evaluateTagliandoDueForMezzo,
  isMezzoEligibleForTagliandoNotification,
  parseSchedaOreLavoroMotoreFromCampi,
} from "@/lib/maintenance-plans/tagliando-due-eval";
import { buildTagliandoDaEseguireNotification } from "@/lib/maintenance-plans/tagliando-due-notification-mapper";
import type { MaintenancePlanView } from "@/lib/maintenance-plans/types";
import type { MaintenanceServiceLite } from "@/lib/maintenance-plans/tagliandi-matrix";
import { buildDispatchCommandFromLegacy } from "@/lib/notifications/dispatch/build-dispatch-command.server";
import { entityDispatchIdempotencyKey } from "@/lib/notifications/dispatch/entity-idempotency";
import { dispatchNotificationEvent } from "@/lib/notifications/dispatch/notification-dispatch-service.server";
import { resolveSingleCompanyId } from "@/lib/notifications/dispatch/resolve-company-id.server";
import { createNotificationTraceId, logNotificationTrace } from "@/lib/notifications/observability/notification-trace";
import { fetchMezzoGestitoById } from "@/lib/mezzi/mezzi-attrezzature-batch";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoFields } from "@/types/schede";
import type {
  MaintenancePlanEquipmentTypeRow,
  MaintenancePlanPartRow,
  MaintenancePlanRow,
  MagazzinoRicambioRow,
  TipoAttrezzaturaCatalogRow,
  VehicleMaintenanceServiceRow,
} from "@/src/types/supabase-tables";

type RicambioLite = Pick<MagazzinoRicambioRow, "id" | "codice" | "nome">;

function mapPlanView(
  plan: MaintenancePlanRow,
  equipmentTypes: MaintenancePlanEquipmentTypeRow[],
  catalog: TipoAttrezzaturaCatalogRow[],
  parts: MaintenancePlanPartRow[],
  ricambi: RicambioLite[],
): MaintenancePlanView {
  const tipoIds = equipmentTypes.filter((e) => e.plan_id === plan.id).map((e) => e.tipo_attrezzatura_id);
  const tipoLabels = tipoIds
    .map((id) => catalog.find((c) => c.id === id)?.label)
    .filter((x): x is string => Boolean(x));
  const planParts = parts
    .filter((p) => p.plan_id === plan.id)
    .map((p) => {
      const r = ricambi.find((x) => x.id === p.ricambio_id);
      return {
        id: p.id,
        ricambioId: p.ricambio_id,
        codice: r?.codice ?? "—",
        descrizione: r?.nome ?? "—",
        quantita: Number(p.quantita),
        isRequired: p.is_required ?? true,
        replacementCondition: (p.replacement_condition as MaintenancePlanView["parts"][0]["replacementCondition"]) ?? "sempre",
        conditionParams: p.condition_params ?? null,
        sortOrder: p.sort_order ?? 0,
        note: p.note?.trim() ?? "",
      };
    });

  return {
    id: plan.id,
    nome: plan.nome,
    intervalOre: plan.interval_ore,
    intervalType: (plan.interval_type as MaintenancePlanView["intervalType"]) ?? "ore",
    intervalValue: Number(plan.interval_value ?? plan.interval_ore),
    maintenanceKind: (plan.maintenance_kind as MaintenancePlanView["maintenanceKind"]) ?? "tagliando_ore",
    status: (plan.status as MaintenancePlanView["status"]) ?? "active",
    isActive: plan.is_active && plan.deleted_at == null,
    tempoPrevistoMinuti: plan.tempo_previsto_minuti != null ? Number(plan.tempo_previsto_minuti) : null,
    manodoperaCostoOrario: plan.manodopera_costo_orario != null ? Number(plan.manodopera_costo_orario) : null,
    tipoLabels,
    tipoIds,
    parts: planParts,
    triggerGroups: [],
    checklist: [],
    currentVersionId: plan.current_version_id ?? null,
  };
}

async function loadEvalContextServer(sb: SupabaseClient, mezzoId: string) {
  const [plansRes, eqRes, catRes, partsRes, servicesRes] = await Promise.all([
    sb.from("maintenance_plans").select(MAINTENANCE_PLANS_COLUMNS),
    sb.from("maintenance_plan_equipment_types").select(MAINTENANCE_PLAN_EQUIPMENT_TYPES_COLUMNS),
    sb.from("tipi_attrezzatura_catalog").select(TIPI_ATTREZZATURA_CATALOG_COLUMNS),
    sb.from("maintenance_plan_parts").select(MAINTENANCE_PLAN_PARTS_COLUMNS),
    sb
      .from("vehicle_maintenance_services")
      .select(VEHICLE_MAINTENANCE_SERVICES_COLUMNS)
      .eq("mezzo_id", mezzoId),
  ]);

  if (plansRes.error || eqRes.error || catRes.error || partsRes.error || servicesRes.error) {
    throw new Error(
      plansRes.error?.message ??
        eqRes.error?.message ??
        catRes.error?.message ??
        partsRes.error?.message ??
        servicesRes.error?.message ??
        "Errore caricamento tagliandi",
    );
  }

  const ricambiIds = [
    ...new Set((partsRes.data ?? []).map((p) => (p as MaintenancePlanPartRow).ricambio_id)),
  ];
  let ricambi: RicambioLite[] = [];
  if (ricambiIds.length > 0) {
    const ricRes = await sb.from("magazzino_ricambi").select(MAGAZZINO_RICAMBI_COLUMNS).in("id", ricambiIds);
    if (ricRes.error) throw new Error(ricRes.error.message);
    ricambi = (ricRes.data ?? []) as RicambioLite[];
  }

  const plans = (plansRes.data ?? []) as MaintenancePlanRow[];
  const equipmentTypes = (eqRes.data ?? []) as MaintenancePlanEquipmentTypeRow[];
  const catalog = (catRes.data ?? []) as TipoAttrezzaturaCatalogRow[];
  const parts = (partsRes.data ?? []) as MaintenancePlanPartRow[];
  const services: MaintenanceServiceLite[] = ((servicesRes.data ?? []) as VehicleMaintenanceServiceRow[]).map(
    (s) => ({
      id: s.id,
      mezzoId: s.mezzo_id,
      planId: s.plan_id,
      oreAtService: Number(s.ore_at_service),
    }),
  );

  return {
    plans: plans.map((p) => mapPlanView(p, equipmentTypes, catalog, parts, ricambi)),
    catalog: catalog.map((c) => ({ id: c.id, label: c.label })),
    services,
  };
}

export type MaybePublishTagliandoDueServerInput = {
  lavorazioneId: string;
  mezzoId: string | null | undefined;
  fields: SchedaIngressoFields;
  mezzo: MezzoGestito | null;
};

export async function maybePublishTagliandoDueOnInterventoCreateServer(
  sb: SupabaseClient,
  input: MaybePublishTagliandoDueServerInput,
): Promise<void> {
  try {
    const mezzoId = input.mezzoId?.trim();
    if (!mezzoId || !input.lavorazioneId?.trim()) return;

    const mezzo = await fetchMezzoGestitoById(sb, mezzoId);
    if (!isMezzoEligibleForTagliandoNotification(mezzo)) return;

    const currentOre = parseSchedaOreLavoroMotoreFromCampi(input.fields);
    const { plans, catalog, services } = await loadEvalContextServer(sb, mezzoId);
    const evalResult = evaluateTagliandoDueForMezzo({
      mezzo,
      currentOre,
      plans,
      catalog,
      services,
    });
    if (!evalResult) return;

    const legacy = buildTagliandoDaEseguireNotification({
      lavorazioneId: input.lavorazioneId,
      mezzoId,
      evalResult,
    });
    const companyId = await resolveSingleCompanyId(sb);
    if (!companyId) return;

    const buildCommand = buildDispatchCommandFromLegacy(
      "lavorazioni.tagliando_due",
      "server",
      legacy,
    );

    const traceId = createNotificationTraceId();
    await dispatchNotificationEvent(
      {
        notificationEventId: "lavorazioni.tagliando_due",
        companyId,
        dispatchIdempotencyKey: entityDispatchIdempotencyKey(
          "lavorazioni.tagliando_due",
          "lavorazioni",
          input.lavorazioneId,
        ),
        buildCommand: (recipientId) => buildCommand(recipientId)!,
      },
      sb,
    );
    logNotificationTrace({
      traceId,
      stage: "dispatch",
      notificationEventId: "lavorazioni.tagliando_due",
      entityType: "lavorazioni",
      entityId: input.lavorazioneId,
      ts: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("[tagliando-due] server publish failed:", e);
  }
}
