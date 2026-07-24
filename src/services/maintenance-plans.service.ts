"use client";

import { computeAllPlanStatuses } from "@/lib/maintenance-plans/compute-plan-status";
import {
  loadMaintenancePlanViews,
  persistPlanChecklist,
  persistPlanTriggerGroups,
} from "@/lib/maintenance-plans/load-plan-views";
import {
  MAINTENANCE_AUDIT_ACTIONS,
  writeMaintenanceAuditEvent,
} from "@/lib/maintenance-plans/maintenance-audit";
import { forkPresetVersionIfUsed } from "@/lib/maintenance-plans/preset-version-fork";
import { formatTriggerSummary } from "@/lib/maintenance-plans/maintenance-trigger-helpers";
import { MAINTENANCE_INTERVAL_TYPE_LABELS } from "@/lib/maintenance-plans/maintenance-enums";
import { processMaintenanceWarehouseDischarge } from "@/lib/maintenance-plans/process-maintenance-warehouse";
import type { PresetSnapshot } from "@/lib/maintenance-plans/preset-snapshot";
import { isPresetAssignable } from "@/lib/maintenance-plans/maintenance-domain-contract";
import type { MaintenanceExecutionType } from "@/lib/maintenance-plans/maintenance-enums";
import type { ReplacementCondition } from "@/lib/maintenance-plans/maintenance-enums";
import type { MaintenanceServiceLite } from "@/lib/maintenance-plans/tagliandi-matrix";
import type {
  MaintenancePlanStatus,
  MaintenancePlanView,
  MaintenancePresetSummary,
  MaintenanceServiceHistoryView,
  RegisterMaintenanceServiceInput,
  UpsertMaintenancePlanInput,
} from "@/lib/maintenance-plans/types";
import {
  MAINTENANCE_PLANS_COLUMNS,
  TIPI_ATTREZZATURA_CATALOG_COLUMNS,
  VEHICLE_MAINTENANCE_SERVICE_PARTS_COLUMNS,
  VEHICLE_MAINTENANCE_SERVICE_CHECKLIST_COLUMNS,
  VEHICLE_MAINTENANCE_SERVICES_COLUMNS,
} from "@/lib/db/table-select-columns";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { auditContext, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type {
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

function parsePresetSnapshot(raw: unknown): PresetSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as PresetSnapshot;
  if (!o.name || !o.capturedAt) return null;
  return o;
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
      const views = await loadMaintenancePlanViews(client);
      return success(views);
    } catch (e) {
      return serviceFailFromError<MaintenancePlanView[]>(e, [], { entity: "mezzo", action: "read" });
    }
  },

  async listPresetSummaries(): Promise<ServiceResult<MaintenancePresetSummary[]>> {
    try {
      const plansRes = await maintenancePlansService.listPlans();
      if (!plansRes.success) return err(plansRes.error ?? "Errore piani.");
      const plans = plansRes.data ?? [];
      if (plans.length === 0) return success([]);

      const client = await sb();
      const [configsRes, servicesRes] = await Promise.all([
        client
          .from("vehicle_maintenance_configs")
          .select("preset_id")
          .eq("is_active", true)
          .is("deleted_at", null)
          .not("preset_id", "is", null),
        client.from("vehicle_maintenance_services").select("plan_id"),
      ]);
      if (configsRes.error) {
        return err(humanizeGestionaleError(configsRes.error.message, { entity: "mezzo", action: "read" }));
      }
      if (servicesRes.error) {
        return err(humanizeGestionaleError(servicesRes.error.message, { entity: "mezzo", action: "read" }));
      }

      const assignedByPreset = new Map<string, number>();
      for (const row of configsRes.data ?? []) {
        const pid = row.preset_id as string;
        assignedByPreset.set(pid, (assignedByPreset.get(pid) ?? 0) + 1);
      }
      const execByPlan = new Map<string, number>();
      for (const row of servicesRes.data ?? []) {
        const pid = row.plan_id as string;
        execByPlan.set(pid, (execByPlan.get(pid) ?? 0) + 1);
      }

      const summaries: MaintenancePresetSummary[] = plans.map((p) => {
        const triggers = p.triggerGroups[0]?.triggers ?? [];
        const triggerSummary =
          triggers.length > 0
            ? formatTriggerSummary(triggers)
            : `${p.intervalValue} ${MAINTENANCE_INTERVAL_TYPE_LABELS[p.intervalType]}`;
        return {
          ...p,
          triggerSummary,
          assignedMezziCount: assignedByPreset.get(p.id) ?? 0,
          executionsCount: execByPlan.get(p.id) ?? 0,
        };
      });

      return success(summaries);
    } catch (e) {
      return serviceFailFromError<MaintenancePresetSummary[]>(e, [], { entity: "mezzo", action: "read" });
    }
  },

  async upsertPlan(input: UpsertMaintenancePlanInput): Promise<ServiceResult<MaintenancePlanView>> {
    try {
      const client = await sb();
      const { data: user } = await client.auth.getUser();
      const uid = user.user?.id ?? null;

      const intervalType = input.intervalType ?? "ore";
      const intervalValue = input.intervalValue ?? input.intervalOre;
      const status = input.status ?? (input.isActive ? "active" : "draft");
      const isActive = status === "active";

      const planPayload = {
        nome: input.nome.trim(),
        interval_ore: input.intervalOre,
        interval_type: intervalType,
        interval_value: intervalValue,
        maintenance_kind: null,
        status,
        is_active: isActive,
        tempo_previsto_minuti: input.tempoPrevistoMinuti ?? null,
        manodopera_costo_orario: input.manodoperaCostoOrario ?? null,
      };

      let planId = input.id;
      const isCreate = !planId;

      if (planId) {
        const { error } = await client.from("maintenance_plans").update(planPayload).eq("id", planId);
        if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "update" }));
      } else {
        const { data: row, error } = await client
          .from("maintenance_plans")
          .insert({ ...planPayload, created_by: uid })
          .select(MAINTENANCE_PLANS_COLUMNS)
          .single();
        if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "create" }));
        planId = (row as { id: string }).id;
        await writeModificaLog(client, {
          entita: ENTITA_PLAN,
          entita_id: planId,
          azione: "CREATE",
          payload: auditSnapshot(row, auditContext(input.nome)),
        });
        await writeMaintenanceAuditEvent(client, {
          entity: "preset",
          entityId: planId,
          action: MAINTENANCE_AUDIT_ACTIONS.PRESET_CREATED,
          newValue: planPayload as Record<string, unknown>,
          createdBy: uid,
        });
      }

      if (!planId) return err("Piano non creato.");

      await client.from("maintenance_plan_parts").delete().eq("plan_id", planId);
      if (input.parts.length > 0) {
        const { error: partsErr } = await client.from("maintenance_plan_parts").insert(
          input.parts.map((p, idx) => ({
            plan_id: planId,
            ricambio_id: p.ricambioId,
            quantita: p.quantita,
            is_required: p.isRequired ?? true,
            replacement_condition: p.replacementCondition ?? "sempre",
            condition_params: p.conditionParams ?? null,
            sort_order: p.sortOrder ?? idx,
            note: p.note?.trim() || null,
          })),
        );
        if (partsErr) return err(humanizeGestionaleError(partsErr.message, { entity: "mezzo", action: "update" }));
      }

      const triggerGroups =
        input.triggerGroups ??
        [
          {
            operator: "OR" as const,
            sortOrder: 0,
            label: "Intervallo principale",
            triggers: [{ triggerType: intervalType, threshold: intervalValue, priority: 0 }],
          },
        ];
      await persistPlanTriggerGroups(client, planId, triggerGroups);
      if (input.checklist) {
        await persistPlanChecklist(client, planId, input.checklist);
      }

      if (!isCreate) {
        await writeMaintenanceAuditEvent(client, {
          entity: "preset",
          entityId: planId,
          action: MAINTENANCE_AUDIT_ACTIONS.PRESET_UPDATED,
          newValue: { ...planPayload, partsCount: input.parts.length },
          createdBy: uid,
        });
        await writeMaintenanceAuditEvent(client, {
          entity: "trigger",
          entityId: planId,
          action: MAINTENANCE_AUDIT_ACTIONS.TRIGGER_CHANGED,
          newValue: { groups: triggerGroups },
          createdBy: uid,
        });
        if (input.parts.length > 0) {
          await writeMaintenanceAuditEvent(client, {
            entity: "preset",
            entityId: planId,
            action: MAINTENANCE_AUDIT_ACTIONS.PARTS_CHANGED,
            newValue: { count: input.parts.length },
            createdBy: uid,
          });
        }
      }

      const snapshot = {
        nome: input.nome,
        intervalType,
        intervalValue,
        parts: input.parts,
        triggerGroups,
        checklist: input.checklist ?? [],
      };
      const versionId = await forkPresetVersionIfUsed(
        client,
        planId,
        snapshot,
        isCreate ? "Creazione preset" : "Aggiornamento preset",
        uid,
      );
      if (versionId) {
        await writeMaintenanceAuditEvent(client, {
          entity: "preset",
          entityId: planId,
          action: MAINTENANCE_AUDIT_ACTIONS.PRESET_VERSION_CREATED,
          newValue: { versionId },
          createdBy: uid,
        });
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
      const { data: user } = await client.auth.getUser();
      const { error } = await client
        .from("maintenance_plans")
        .update({
          is_active: false,
          status: "archived",
          deleted_at: new Date().toISOString(),
        })
        .eq("id", planId);
      if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "delete" }));
      await writeModificaLog(client, {
        entita: ENTITA_PLAN,
        entita_id: planId,
        azione: "UPDATE",
        payload: auditSnapshot({ status: "archived", is_active: false }, auditContext("archivia preset")),
      });
      await writeMaintenanceAuditEvent(client, {
        entity: "preset",
        entityId: planId,
        action: MAINTENANCE_AUDIT_ACTIONS.PRESET_ARCHIVED,
        createdBy: user.user?.id ?? null,
      });
      return success(undefined);
    } catch (e) {
      return serviceFailFromError<void>(e, undefined as never, { entity: "mezzo", action: "delete" });
    }
  },

  async listMezzoPlanStatuses(input: {
    mezzoId: string;
    currentOreMezzo: number;
  }): Promise<ServiceResult<MaintenancePlanStatus[]>> {
    try {
      const client = await sb();
      const [configsRes, plansRes, servicesRes] = await Promise.all([
        client
          .from("vehicle_maintenance_configs")
          .select("preset_id")
          .eq("mezzo_id", input.mezzoId)
          .eq("is_active", true)
          .is("deleted_at", null),
        maintenancePlansService.listPlans(),
        maintenancePlansService.listServicesByMezzo(input.mezzoId),
      ]);
      if (configsRes.error) {
        return err(humanizeGestionaleError(configsRes.error.message, { entity: "mezzo", action: "read" }));
      }
      if (!plansRes.success) return err(plansRes.error ?? "Errore piani.");
      if (!servicesRes.success) return err(servicesRes.error ?? "Errore storico.");

      const presetIds = new Set(
        (configsRes.data ?? [])
          .map((c) => c.preset_id as string | null)
          .filter((id): id is string => Boolean(id)),
      );
      const applicable = (plansRes.data ?? []).filter((p) => presetIds.has(p.id));

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

      const [plansRes, partsRes, checklistRes, profilesRes] = await Promise.all([
        client.from("maintenance_plans").select("id, nome").in("id", planIds),
        client
          .from("vehicle_maintenance_service_parts")
          .select(VEHICLE_MAINTENANCE_SERVICE_PARTS_COLUMNS)
          .in("service_id", serviceIds),
        client
          .from("vehicle_maintenance_service_checklist")
          .select(VEHICLE_MAINTENANCE_SERVICE_CHECKLIST_COLUMNS)
          .in("service_id", serviceIds),
        performerIds.length > 0
          ? client.from("profiles").select("id, nome, cognome").in("id", performerIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (plansRes.error) return err(humanizeGestionaleError(plansRes.error.message, { entity: "mezzo", action: "read" }));
      if (partsRes.error) return err(humanizeGestionaleError(partsRes.error.message, { entity: "mezzo", action: "read" }));
      if (checklistRes.error) {
        return err(humanizeGestionaleError(checklistRes.error.message, { entity: "mezzo", action: "read" }));
      }
      if (profilesRes.error) return err(humanizeGestionaleError(profilesRes.error.message, { entity: "mezzo", action: "read" }));

      const planMap = new Map((plansRes.data ?? []).map((p) => [p.id as string, p.nome as string]));
      const partRows = (partsRes.data ?? []) as VehicleMaintenanceServicePartRow[];
      const checklistRows = (checklistRes.data ?? []) as {
        service_id: string;
        item_label: string;
        checked: boolean;
        note: string | null;
        sort_order: number;
      }[];
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
        planNome: planMap.get(s.plan_id) ?? parsePresetSnapshot(s.preset_snapshot)?.name ?? "—",
        performedAt: s.performed_at,
        oreAtService: Number(s.ore_at_service),
        kmAtService: s.km_at_service != null ? Number(s.km_at_service) : null,
        mezzoOreSnapshot: s.mezzo_ore_snapshot != null ? Number(s.mezzo_ore_snapshot) : null,
        note: s.note?.trim() ?? "",
        performedByName: s.performed_by ? (profileMap.get(s.performed_by) ?? "—") : "—",
        executionType: (s.execution_type as MaintenanceServiceHistoryView["executionType"]) ?? "scheduled",
        presetSnapshot: parsePresetSnapshot(s.preset_snapshot),
        parts: partRows
          .filter((p) => p.service_id === s.id)
          .map((p) => {
            const r = ricambi.find((x) => x.id === p.ricambio_id);
            return {
              ricambioId: p.ricambio_id,
              descrizione: p.descrizione_snapshot?.trim() || r?.nome || "—",
              quantita: Number(p.quantita),
              wasReplaced: Boolean(p.was_replaced),
              wasDue: Boolean(p.was_due),
              isRequired: Boolean(p.is_required_snapshot),
              replacementCondition: (p.replacement_condition as ReplacementCondition) ?? "sempre",
            };
          }),
        checklist: checklistRows
          .filter((c) => c.service_id === s.id)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((c) => ({
            itemLabel: c.item_label,
            checked: Boolean(c.checked),
            note: c.note?.trim() ?? "",
          })),
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
          km_at_service: input.kmAtService ?? null,
          mezzo_ore_snapshot: input.mezzoOreSnapshot,
          note: input.note.trim() || null,
          execution_type: input.executionType,
          preset_snapshot: input.presetSnapshot,
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
            was_replaced: p.wasReplaced ?? true,
            was_due: p.wasDue ?? false,
            replacement_condition: p.replacementCondition ?? "sempre",
            is_required_snapshot: p.isRequired ?? true,
            warehouse_status: p.wasReplaced ? "pending" : "skipped",
          })),
        );
        if (partsErr) return err(humanizeGestionaleError(partsErr.message, { entity: "mezzo", action: "create" }));
      }

      if (input.checklist?.length) {
        await client.from("vehicle_maintenance_service_checklist").insert(
          input.checklist.map((c) => ({
            service_id: service.id,
            item_label: c.itemLabel,
            checked: c.checked,
            note: c.note?.trim() || null,
            sort_order: c.sortOrder,
          })),
        );
      }

      await writeModificaLog(client, {
        entita: ENTITA_SERVICE,
        entita_id: service.id,
        azione: "CREATE",
        payload: auditSnapshot(service, auditContext(`tagliando ${input.planId}`)),
      });

      await writeMaintenanceAuditEvent(client, {
        entity: "execution",
        entityId: service.id,
        action: MAINTENANCE_AUDIT_ACTIONS.EXECUTION_REGISTERED,
        newValue: {
          planId: input.planId,
          executionType: input.executionType,
          presetSnapshot: input.presetSnapshot,
        },
        createdBy: uid,
      });

      void processMaintenanceWarehouseDischarge({
        executionId: service.id,
        parts: input.parts
          .filter((p) => p.wasReplaced !== false)
          .map((p) => ({ ricambioId: p.ricambioId, quantita: p.quantita })),
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
      const rows = (data ?? []) as Pick<VehicleMaintenanceServiceRow, "id" | "mezzo_id" | "plan_id" | "ore_at_service">[];
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
    presetSnapshot?: PresetSnapshot;
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
        executionType: "manual",
        presetSnapshot: input.presetSnapshot ?? {
          name: "Matrice tagliandi",
          trigger: `${input.milestoneOre} ore`,
          parts: [],
          capturedAt: new Date().toISOString(),
        },
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
