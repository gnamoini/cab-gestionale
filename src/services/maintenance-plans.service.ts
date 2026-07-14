"use client";

import { computeAllPlanStatuses } from "@/lib/maintenance-plans/compute-plan-status";
import { resolvePlansForMezzo } from "@/lib/maintenance-plans/resolve-plans-for-mezzo";
import type {
  MaintenancePlanStatus,
  MaintenancePlanView,
  MaintenanceServiceHistoryView,
  RegisterMaintenanceServiceInput,
  UpsertMaintenancePlanInput,
} from "@/lib/maintenance-plans/types";
import type { MaintenanceServiceLite } from "@/lib/maintenance-plans/tagliandi-matrix";
import {
  MAINTENANCE_PLAN_EQUIPMENT_TYPES_COLUMNS,
  MAINTENANCE_PLAN_PARTS_COLUMNS,
  MAINTENANCE_PLANS_COLUMNS,
  MAGAZZINO_RICAMBI_COLUMNS,
  TIPI_ATTREZZATURA_CATALOG_COLUMNS,
  VEHICLE_MAINTENANCE_SERVICE_PARTS_COLUMNS,
  VEHICLE_MAINTENANCE_SERVICES_COLUMNS,
} from "@/lib/db/table-select-columns";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { auditContext, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type {
  MaintenancePlanEquipmentTypeRow,
  MaintenancePlanPartRow,
  MaintenancePlanRow,
  MagazzinoRicambioRow,
  TipoAttrezzaturaCatalogRow,
  VehicleMaintenanceServicePartRow,
  VehicleMaintenanceServiceRow,
} from "@/src/types/supabase-tables";
import { humanizeGestionaleError } from "@/src/utils/gestionale-error-messages";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

const ENTITA_PLAN = "maintenance_plans";
const ENTITA_SERVICE = "vehicle_maintenance_services";

type RicambioLite = Pick<MagazzinoRicambioRow, "id" | "codice" | "nome">;

async function sb() {
  return getBrowserSupabase();
}

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

export const maintenancePlansService = {
  async listTipoCatalog(): Promise<ServiceResult<TipoAttrezzaturaCatalogRow[]>> {
    try {
      const client = await sb();
      const { data, error } = await client
        .from("tipi_attrezzatura_catalog")
        .select(TIPI_ATTREZZATURA_CATALOG_COLUMNS)
        .order("label", { ascending: true });
      if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "read" }));
      return success((data ?? []) as TipoAttrezzaturaCatalogRow[]);
    } catch (e) {
      return serviceFailFromError<TipoAttrezzaturaCatalogRow[]>(e, [], { entity: "mezzo", action: "read" });
    }
  },

  async listPlans(): Promise<ServiceResult<MaintenancePlanView[]>> {
    try {
      const client = await sb();
      const [plansRes, eqRes, catRes, partsRes] = await Promise.all([
        client
          .from("maintenance_plans")
          .select(MAINTENANCE_PLANS_COLUMNS)
          .is("deleted_at", null)
          .order("nome", { ascending: true }),
        client.from("maintenance_plan_equipment_types").select(MAINTENANCE_PLAN_EQUIPMENT_TYPES_COLUMNS),
        client.from("tipi_attrezzatura_catalog").select(TIPI_ATTREZZATURA_CATALOG_COLUMNS),
        client.from("maintenance_plan_parts").select(MAINTENANCE_PLAN_PARTS_COLUMNS),
      ]);

      if (plansRes.error) return err(humanizeGestionaleError(plansRes.error.message, { entity: "mezzo", action: "read" }));
      if (eqRes.error) return err(humanizeGestionaleError(eqRes.error.message, { entity: "mezzo", action: "read" }));
      if (catRes.error) return err(humanizeGestionaleError(catRes.error.message, { entity: "mezzo", action: "read" }));
      if (partsRes.error) return err(humanizeGestionaleError(partsRes.error.message, { entity: "mezzo", action: "read" }));

      const plans = (plansRes.data ?? []) as MaintenancePlanRow[];
      const equipmentTypes = (eqRes.data ?? []) as MaintenancePlanEquipmentTypeRow[];
      const catalog = (catRes.data ?? []) as TipoAttrezzaturaCatalogRow[];
      const parts = (partsRes.data ?? []) as MaintenancePlanPartRow[];

      const ricambioIds = [...new Set(parts.map((p) => p.ricambio_id))];
      let ricambi: RicambioLite[] = [];
      if (ricambioIds.length > 0) {
        const { data: ricData, error: ricErr } = await client
          .from("magazzino_ricambi")
          .select("id, codice, nome")
          .in("id", ricambioIds);
        if (ricErr) return err(humanizeGestionaleError(ricErr.message, { entity: "magazzino", action: "read" }));
        ricambi = (ricData ?? []) as RicambioLite[];
      }

      return success(plans.map((p) => mapPlanView(p, equipmentTypes, catalog, parts, ricambi)));
    } catch (e) {
      return serviceFailFromError<MaintenancePlanView[]>(e, [], { entity: "mezzo", action: "read" });
    }
  },

  async upsertPlan(input: UpsertMaintenancePlanInput): Promise<ServiceResult<MaintenancePlanView>> {
    try {
      const client = await sb();
      const { data: user } = await client.auth.getUser();
      const uid = user.user?.id ?? null;

      let planId = input.id;
      if (planId) {
        const { error } = await client
          .from("maintenance_plans")
          .update({
            nome: input.nome.trim(),
            interval_ore: input.intervalOre,
            is_active: input.isActive,
          })
          .eq("id", planId);
        if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "update" }));
      } else {
        const { data: row, error } = await client
          .from("maintenance_plans")
          .insert({
            nome: input.nome.trim(),
            interval_ore: input.intervalOre,
            is_active: input.isActive,
            created_by: uid,
          })
          .select(MAINTENANCE_PLANS_COLUMNS)
          .single();
        if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "create" }));
        planId = (row as MaintenancePlanRow).id;
        await writeModificaLog(client, {
          entita: ENTITA_PLAN,
          entita_id: planId,
          azione: "CREATE",
          payload: auditSnapshot(row, auditContext(input.nome)),
        });
      }

      await client.from("maintenance_plan_equipment_types").delete().eq("plan_id", planId);
      if (input.tipoAttrezzaturaIds.length > 0) {
        const { error: eqErr } = await client.from("maintenance_plan_equipment_types").insert(
          input.tipoAttrezzaturaIds.map((tipo_attrezzatura_id) => ({
            plan_id: planId,
            tipo_attrezzatura_id,
          })),
        );
        if (eqErr) return err(humanizeGestionaleError(eqErr.message, { entity: "mezzo", action: "update" }));
      }

      await client.from("maintenance_plan_parts").delete().eq("plan_id", planId);
      if (input.parts.length > 0) {
        const { error: partsErr } = await client.from("maintenance_plan_parts").insert(
          input.parts.map((p) => ({
            plan_id: planId,
            ricambio_id: p.ricambioId,
            quantita: p.quantita,
          })),
        );
        if (partsErr) return err(humanizeGestionaleError(partsErr.message, { entity: "mezzo", action: "update" }));
      }

      const listed = await maintenancePlansService.listPlans();
      if (!listed.success) return err(listed.error ?? "Errore caricamento piano.");
      const view = (listed.data ?? []).find((p) => p.id === planId);
      if (!view) return err("Piano non trovato dopo salvataggio.");
      return success(view);
    } catch (e) {
      return serviceFailFromError<MaintenancePlanView>(e, null as never, { entity: "mezzo", action: "update" });
    }
  },

  async softDeletePlan(planId: string): Promise<ServiceResult<void>> {
    try {
      const client = await sb();
      const { error } = await client
        .from("maintenance_plans")
        .update({ is_active: false, deleted_at: new Date().toISOString() })
        .eq("id", planId);
      if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "delete" }));
      return success(undefined);
    } catch (e) {
      return serviceFailFromError<void>(e, undefined as never, { entity: "mezzo", action: "delete" });
    }
  },

  async listMezzoPlanStatuses(input: {
    mezzoId: string;
    tipoAttrezzatura: string;
    currentOreMezzo: number;
  }): Promise<ServiceResult<MaintenancePlanStatus[]>> {
    try {
      const [plansRes, servicesRes] = await Promise.all([
        maintenancePlansService.listPlans(),
        maintenancePlansService.listServicesByMezzo(input.mezzoId),
      ]);
      if (!plansRes.success) return err(plansRes.error ?? "Errore piani.");
      if (!servicesRes.success) return err(servicesRes.error ?? "Errore storico.");

      const catalogRes = await maintenancePlansService.listTipoCatalog();
      const catalog = catalogRes.data ?? [];
      const applicable = resolvePlansForMezzo({
        tipoAttrezzatura: input.tipoAttrezzatura,
        catalog,
        plans: plansRes.data ?? [],
      });

      const serviceOres = (servicesRes.data ?? []).map((s) => ({
        planId: s.planId,
        oreAtService: s.oreAtService,
      }));

      return success(
        computeAllPlanStatuses({
          plans: applicable.map((p) => ({ id: p.id, nome: p.nome, intervalOre: p.intervalOre })),
          services: serviceOres,
          currentOreMezzo: input.currentOreMezzo,
        }),
      );
    } catch (e) {
      return serviceFailFromError<MaintenancePlanStatus[]>(e, [], { entity: "mezzo", action: "read" });
    }
  },

  async listServicesByMezzo(mezzoId: string): Promise<ServiceResult<MaintenanceServiceHistoryView[]>> {
    try {
      const client = await sb();
      const { data, error } = await client
        .from("vehicle_maintenance_services")
        .select(VEHICLE_MAINTENANCE_SERVICES_COLUMNS)
        .eq("mezzo_id", mezzoId)
        .order("performed_at", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "read" }));

      const services = (data ?? []) as VehicleMaintenanceServiceRow[];
      if (services.length === 0) return success([]);

      const planIds = [...new Set(services.map((s) => s.plan_id))];
      const serviceIds = services.map((s) => s.id);
      const performerIds = [...new Set(services.map((s) => s.performed_by).filter(Boolean))] as string[];

      const [plansRes, partsRes, profilesRes] = await Promise.all([
        client.from("maintenance_plans").select("id, nome").in("id", planIds),
        client
          .from("vehicle_maintenance_service_parts")
          .select(VEHICLE_MAINTENANCE_SERVICE_PARTS_COLUMNS)
          .in("service_id", serviceIds),
        performerIds.length > 0
          ? client.from("profiles").select("id, nome, cognome").in("id", performerIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (plansRes.error) return err(humanizeGestionaleError(plansRes.error.message, { entity: "mezzo", action: "read" }));
      if (partsRes.error) return err(humanizeGestionaleError(partsRes.error.message, { entity: "mezzo", action: "read" }));
      if (profilesRes.error) return err(humanizeGestionaleError(profilesRes.error.message, { entity: "mezzo", action: "read" }));

      const planMap = new Map((plansRes.data ?? []).map((p) => [p.id as string, p.nome as string]));
      const partRows = (partsRes.data ?? []) as VehicleMaintenanceServicePartRow[];
      const ricambioIds = [...new Set(partRows.map((p) => p.ricambio_id))];
      let ricambi: RicambioLite[] = [];
      if (ricambioIds.length > 0) {
        const { data: ricData, error: ricErr } = await client
          .from("magazzino_ricambi")
          .select("id, codice, nome")
          .in("id", ricambioIds);
        if (ricErr) return err(humanizeGestionaleError(ricErr.message, { entity: "magazzino", action: "read" }));
        ricambi = (ricData ?? []) as RicambioLite[];
      }

      const profileMap = new Map(
        (profilesRes.data ?? []).map((p) => {
          const nome = [p.nome as string, p.cognome as string | null].filter(Boolean).join(" ").trim();
          return [p.id as string, nome || "—"] as const;
        }),
      );

      const views: MaintenanceServiceHistoryView[] = services.map((s) => ({
        id: s.id,
        planId: s.plan_id,
        planNome: planMap.get(s.plan_id) ?? "—",
        performedAt: s.performed_at,
        oreAtService: Number(s.ore_at_service),
        mezzoOreSnapshot: s.mezzo_ore_snapshot != null ? Number(s.mezzo_ore_snapshot) : null,
        note: s.note?.trim() ?? "",
        performedByName: s.performed_by ? (profileMap.get(s.performed_by) ?? "—") : "—",
        parts: partRows
          .filter((p) => p.service_id === s.id)
          .map((p) => {
            const r = ricambi.find((x) => x.id === p.ricambio_id);
            return {
              ricambioId: p.ricambio_id,
              descrizione: p.descrizione_snapshot?.trim() || r?.nome || "—",
              quantita: Number(p.quantita),
            };
          }),
      }));

      return success(views);
    } catch (e) {
      return serviceFailFromError<MaintenanceServiceHistoryView[]>(e, [], { entity: "mezzo", action: "read" });
    }
  },

  async registerService(input: RegisterMaintenanceServiceInput): Promise<ServiceResult<VehicleMaintenanceServiceRow>> {
    try {
      const client = await sb();
      const { data: user } = await client.auth.getUser();
      const uid = user.user?.id ?? null;

      const { data: row, error } = await client
        .from("vehicle_maintenance_services")
        .insert({
          mezzo_id: input.mezzoId,
          plan_id: input.planId,
          performed_at: input.performedAt,
          ore_at_service: input.oreAtService,
          mezzo_ore_snapshot: input.mezzoOreSnapshot,
          note: input.note.trim() || null,
          performed_by: uid,
          created_by: uid,
        })
        .select(VEHICLE_MAINTENANCE_SERVICES_COLUMNS)
        .single();
      if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "create" }));

      const service = row as VehicleMaintenanceServiceRow;

      if (input.parts.length > 0) {
        const { error: partsErr } = await client.from("vehicle_maintenance_service_parts").insert(
          input.parts.map((p) => ({
            service_id: service.id,
            ricambio_id: p.ricambioId,
            quantita: p.quantita,
            descrizione_snapshot: p.descrizioneSnapshot?.trim() || null,
          })),
        );
        if (partsErr) return err(humanizeGestionaleError(partsErr.message, { entity: "mezzo", action: "create" }));
      }

      await writeModificaLog(client, {
        entita: ENTITA_SERVICE,
        entita_id: service.id,
        azione: "CREATE",
        payload: auditSnapshot(service, auditContext(`tagliando ${input.planId}`)),
      });

      return success(service);
    } catch (e) {
      return serviceFailFromError<VehicleMaintenanceServiceRow>(e, null as never, { entity: "mezzo", action: "create" });
    }
  },

  async ensureCatalogLabels(labels: string[]): Promise<ServiceResult<number>> {
    try {
      const client = await sb();
      const existing = await maintenancePlansService.listTipoCatalog();
      if (!existing.success) return err(existing.error ?? "Errore catalogo.");
      const norms = new Set((existing.data ?? []).map((c) => c.label_norm));
      const missing = labels
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !norms.has(l.toLowerCase()));
      if (missing.length === 0) return success(0);
      const { error } = await client.from("tipi_attrezzatura_catalog").insert(missing.map((label) => ({ label })));
      if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "create" }));
      return success(missing.length);
    } catch (e) {
      return serviceFailFromError<number>(e, 0, { entity: "mezzo", action: "create" });
    }
  },

  async searchRicambiForPlan(q: string): Promise<ServiceResult<RicambioLite[]>> {
    try {
      const client = await sb();
      const term = q.trim();
      let query = client.from("magazzino_ricambi").select("id, codice, nome").limit(30);
      if (term) {
        query = query.or(`codice.ilike.%${term}%,nome.ilike.%${term}%`);
      }
      const { data, error } = await query.order("nome", { ascending: true });
      if (error) return err(humanizeGestionaleError(error.message, { entity: "magazzino", action: "read" }));
      return success((data ?? []) as RicambioLite[]);
    } catch (e) {
      return serviceFailFromError<RicambioLite[]>(e, [], { entity: "magazzino", action: "read" });
    }
  },

  async listServicesLite(): Promise<ServiceResult<MaintenanceServiceLite[]>> {
    try {
      const client = await sb();
      const { data, error } = await client
        .from("vehicle_maintenance_services")
        .select("id, mezzo_id, plan_id, ore_at_service");
      if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "read" }));
      const rows = (data ?? []) as Pick<
        VehicleMaintenanceServiceRow,
        "id" | "mezzo_id" | "plan_id" | "ore_at_service"
      >[];
      return success(
        rows.map((s) => ({
          id: s.id,
          mezzoId: s.mezzo_id,
          planId: s.plan_id,
          oreAtService: Number(s.ore_at_service),
        })),
      );
    } catch (e) {
      return serviceFailFromError<MaintenanceServiceLite[]>(e, [], { entity: "mezzo", action: "read" });
    }
  },

  async deleteService(serviceId: string): Promise<ServiceResult<void>> {
    try {
      const client = await sb();
      const { error } = await client.from("vehicle_maintenance_services").delete().eq("id", serviceId);
      if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "delete" }));
      return success(undefined);
    } catch (e) {
      return serviceFailFromError<void>(e, undefined as never, { entity: "mezzo", action: "delete" });
    }
  },

  async toggleMatrixMilestone(input: {
    mezzoId: string;
    planId: string;
    milestoneOre: number;
    done: boolean;
    mezzoOreSnapshot: number;
    existingServiceId?: string | null;
  }): Promise<ServiceResult<void>> {
    if (input.done) {
      const today = new Date().toISOString().slice(0, 10);
      const res = await maintenancePlansService.registerService({
        mezzoId: input.mezzoId,
        planId: input.planId,
        performedAt: today,
        oreAtService: input.milestoneOre,
        mezzoOreSnapshot: input.mezzoOreSnapshot,
        note: "Matrice tagliandi",
        parts: [],
      });
      if (!res.success) return err(res.error ?? "Registrazione non riuscita.");
      return success(undefined);
    }
    const serviceId = input.existingServiceId?.trim();
    if (!serviceId) return err("Tagliando non trovato.");
    return maintenancePlansService.deleteService(serviceId);
  },
};
