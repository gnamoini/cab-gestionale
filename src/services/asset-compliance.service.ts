"use client";

import {
  ASSET_COMPLIANCE_RECORDS_COLUMNS,
  ASSET_COMPLIANCE_RULES_COLUMNS,
} from "@/lib/db/table-select-columns";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { ensurePermission, ensureSectionRead } from "@/src/lib/auth/permission-guards";
import { auditContext, auditDiff, auditSnapshot, writeModificaLog } from "@/src/services/internal/audit-log";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { AssetComplianceRecordRow, AssetComplianceRuleRow } from "@/src/types/supabase-tables";
import { humanizeGestionaleError } from "@/src/utils/gestionale-error-messages";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

const ENTITA_RULES = "asset_compliance_rules";
const ENTITA_RECORDS = "asset_compliance_records";

export type ComplianceRuleInsert = Omit<
  AssetComplianceRuleRow,
  "id" | "created_at" | "updated_at" | "last_completed_at" | "next_due_at" | "next_due_km"
> & {
  last_completed_at?: string | null;
  next_due_at?: string | null;
  next_due_km?: number | null;
};

export type ComplianceRuleUpdate = Partial<ComplianceRuleInsert>;

export type ComplianceRecordInsert = Omit<AssetComplianceRecordRow, "id" | "created_at">;

async function sb() {
  return getBrowserSupabase();
}

function ruleContext(r: AssetComplianceRuleRow) {
  return auditContext(`${r.rule_kind} — ${r.asset_kind}`);
}

export const assetComplianceService = {
  async listRulesByMezzo(mezzoId: string): Promise<ServiceResult<AssetComplianceRuleRow[]>> {
    const allowed = await ensureSectionRead("mezzi");
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    try {
      const client = await sb();
      const { data, error } = await client
        .from("asset_compliance_rules")
        .select(ASSET_COMPLIANCE_RULES_COLUMNS)
        .eq("mezzo_id", mezzoId)
        .order("next_due_at", { ascending: true, nullsFirst: false });
      if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "read" }));
      return success((data ?? []) as AssetComplianceRuleRow[]);
    } catch (e) {
      return serviceFailFromError<AssetComplianceRuleRow[]>(e, [], { entity: "mezzo", action: "read" });
    }
  },

  async listRulesByAttrezzatura(attrezzaturaId: string): Promise<ServiceResult<AssetComplianceRuleRow[]>> {
    const allowed = await ensureSectionRead("mezzi");
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    try {
      const client = await sb();
      const { data, error } = await client
        .from("asset_compliance_rules")
        .select(ASSET_COMPLIANCE_RULES_COLUMNS)
        .eq("attrezzatura_id", attrezzaturaId)
        .order("next_due_at", { ascending: true, nullsFirst: false });
      if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "read" }));
      return success((data ?? []) as AssetComplianceRuleRow[]);
    } catch (e) {
      return serviceFailFromError<AssetComplianceRuleRow[]>(e, [], { entity: "mezzo", action: "read" });
    }
  },

  async listUpcomingRules(daysAhead = 30): Promise<ServiceResult<AssetComplianceRuleRow[]>> {
    const allowed = await ensureSectionRead("mezzi");
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    try {
      const client = await sb();
      const until = new Date();
      until.setDate(until.getDate() + daysAhead);
      const untilYmd = until.toISOString().slice(0, 10);
      const { data, error } = await client
        .from("asset_compliance_rules")
        .select(ASSET_COMPLIANCE_RULES_COLUMNS)
        .eq("is_active", true)
        .not("next_due_at", "is", null)
        .lte("next_due_at", untilYmd)
        .order("next_due_at", { ascending: true });
      if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "read" }));
      return success((data ?? []) as AssetComplianceRuleRow[]);
    } catch (e) {
      return serviceFailFromError<AssetComplianceRuleRow[]>(e, [], { entity: "mezzo", action: "read" });
    }
  },

  async createRule(data: ComplianceRuleInsert): Promise<ServiceResult<AssetComplianceRuleRow>> {
    const allowed = await ensurePermission("editVehicles");
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    try {
      const client = await sb();
      const { data: user } = await client.auth.getUser();
      const payload = { ...data, created_by: user.user?.id ?? null };
      const { data: row, error } = await client
        .from("asset_compliance_rules")
        .insert(payload)
        .select(ASSET_COMPLIANCE_RULES_COLUMNS)
        .single();
      if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "create" }));
      const r = row as AssetComplianceRuleRow;
      await writeModificaLog(client, {
        entita: ENTITA_RULES,
        entita_id: r.id,
        azione: "CREATE",
        payload: auditSnapshot(r, ruleContext(r)),
      });
      return success(r);
    } catch (e) {
      return serviceFailFromError<AssetComplianceRuleRow>(e, null as never, { entity: "mezzo", action: "create" });
    }
  },

  async updateRule(id: string, patch: ComplianceRuleUpdate, before: AssetComplianceRuleRow): Promise<ServiceResult<AssetComplianceRuleRow>> {
    const allowed = await ensurePermission("editVehicles");
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    try {
      const client = await sb();
      const { data: row, error } = await client
        .from("asset_compliance_rules")
        .update(patch)
        .eq("id", id)
        .select(ASSET_COMPLIANCE_RULES_COLUMNS)
        .single();
      if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "update" }));
      const r = row as AssetComplianceRuleRow;
      await writeModificaLog(client, {
        entita: ENTITA_RULES,
        entita_id: id,
        azione: "UPDATE",
        payload: auditDiff(before, r, ruleContext(r)),
      });
      return success(r);
    } catch (e) {
      return serviceFailFromError<AssetComplianceRuleRow>(e, null as never, { entity: "mezzo", action: "update" });
    }
  },

  async createRecord(data: ComplianceRecordInsert): Promise<ServiceResult<AssetComplianceRecordRow>> {
    const allowed = await ensurePermission("editVehicles");
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    try {
      const client = await sb();
      const { data: user } = await client.auth.getUser();
      const payload = { ...data, created_by: user.user?.id ?? null };
      const { data: row, error } = await client
        .from("asset_compliance_records")
        .insert(payload)
        .select(ASSET_COMPLIANCE_RECORDS_COLUMNS)
        .single();
      if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "create" }));
      const r = row as AssetComplianceRecordRow;
      await writeModificaLog(client, {
        entita: ENTITA_RECORDS,
        entita_id: r.id,
        azione: "CREATE",
        payload: auditSnapshot(r, auditContext(r.rule_kind)),
      });
      return success(r);
    } catch (e) {
      return serviceFailFromError<AssetComplianceRecordRow>(e, null as never, { entity: "mezzo", action: "create" });
    }
  },

  async listRecordsByMezzo(mezzoId: string): Promise<ServiceResult<AssetComplianceRecordRow[]>> {
    const allowed = await ensureSectionRead("mezzi");
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    try {
      const client = await sb();
      const { data, error } = await client
        .from("asset_compliance_records")
        .select(ASSET_COMPLIANCE_RECORDS_COLUMNS)
        .eq("mezzo_id", mezzoId)
        .order("completed_at", { ascending: false });
      if (error) return err(humanizeGestionaleError(error.message, { entity: "mezzo", action: "read" }));
      return success((data ?? []) as AssetComplianceRecordRow[]);
    } catch (e) {
      return serviceFailFromError<AssetComplianceRecordRow[]>(e, [], { entity: "mezzo", action: "read" });
    }
  },
};
