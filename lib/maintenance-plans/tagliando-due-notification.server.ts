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
  parseSchedaOreLavoro,
} from "@/lib/maintenance-plans/tagliando-due-eval";
import { buildTagliandoDaEseguireNotification } from "@/lib/maintenance-plans/tagliando-due-notification-mapper";
import type { MaintenancePlanView } from "@/lib/maintenance-plans/types";
import type { MaintenanceServiceLite } from "@/lib/maintenance-plans/tagliandi-matrix";
import { publishNotification } from "@/lib/notifications/application/notification-service";
import { legacyNotificationToCommand } from "@/lib/notifications/adapters/legacy-admin-dashboard";
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
      };
    });

  return {
    id: plan.id,
    nome: plan.nome,
    intervalOre: plan.interval_ore,
    isActive: plan.is_active && plan.deleted_at == null,
    tipoLabels,
    tipoIds,
    parts: planParts,
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

    const currentOre = parseSchedaOreLavoro(input.fields.oreLavoro);
    const { plans, catalog, services } = await loadEvalContextServer(sb, mezzoId);
    const evalResult = evaluateTagliandoDueForMezzo({
      mezzo: input.mezzo,
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
    const cmd = legacyNotificationToCommand("server", legacy);
    if (cmd) await publishNotification(sb, cmd);
  } catch (e) {
    console.warn("[tagliando-due] server publish failed:", e);
  }
}
