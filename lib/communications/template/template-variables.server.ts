import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildClienteEntityKey } from "@/lib/validation/entity-keys";
import type { RenderedPayload } from "@/lib/communications/domain/communication-types";
import { buildOfficinaTemplateVars } from "@/lib/communications/recipients/recipient-resolver.server";
import type { AppSettingRow } from "@/src/types/supabase-tables";

export async function buildTemplateVariables(
  client: SupabaseClient,
  entityType: string,
  entityId: string,
  payload: Record<string, unknown>,
  settingsRows: AppSettingRow[],
): Promise<RenderedPayload> {
  const vars: RenderedPayload = { ...buildOfficinaTemplateVars(settingsRows) };

  if (entityType === "lavorazioni") {
    const { data: lav } = await client
      .from("lavorazioni")
      .select("codice, data_ingresso, mezzo_id")
      .eq("id", entityId)
      .maybeSingle();
    if (lav) {
      vars.numero_lavorazione = lav.codice ?? entityId;
      vars.data = lav.data_ingresso ?? "";
      if (lav.mezzo_id) {
        const { data: mezzo } = await client
          .from("mezzi")
          .select("cliente, targa, marca_telaio, modello_telaio, numero_scuderia")
          .eq("id", lav.mezzo_id)
          .maybeSingle();
        if (mezzo) {
          vars.cliente = String(mezzo.cliente ?? "");
          vars.targa = String(mezzo.targa ?? "");
          vars.marca = String(mezzo.marca_telaio ?? "");
          vars.modello = String(mezzo.modello_telaio ?? "");
          vars.mezzo = [vars.marca, vars.modello].filter(Boolean).join(" ").trim() || String(mezzo.numero_scuderia ?? "");
          vars.matricola = String(mezzo.numero_scuderia ?? "");
        }
      }
    }
  }

  if (entityType === "preventivi") {
    const { data: pv } = await client
      .from("preventivi")
      .select("cliente, totale, dettagli, lavorazione_id")
      .eq("id", entityId)
      .maybeSingle();
    if (pv) {
      vars.cliente = String(pv.cliente ?? "");
      vars.totale = pv.totale != null ? String(pv.totale) : "";
      const det = (pv.dettagli as Record<string, unknown>) ?? {};
      vars.numero_preventivo = String(det.numero ?? entityId);
      if (pv.lavorazione_id) {
        const child = await buildTemplateVariables(client, "lavorazioni", pv.lavorazione_id, {}, settingsRows);
        vars.mezzo = child.mezzo ?? vars.mezzo;
        vars.targa = child.targa ?? vars.targa;
      }
    }
  }

  if (entityType === "ordini_fornitori") {
    const { data: ord } = await client
      .from("ordini_fornitori")
      .select("numero, fornitore_label, fornitore_snapshot")
      .eq("id", entityId)
      .maybeSingle();
    if (ord) {
      vars.ordine = String(ord.numero ?? entityId);
      vars.fornitore = String(ord.fornitore_label ?? "");
      const snap = (ord.fornitore_snapshot as Record<string, unknown>) ?? {};
      if (snap.ragioneSociale) vars.fornitore = String(snap.ragioneSociale);
    }
  }

  if (entityType === "vehicle_maintenance_configs") {
    const { data: cfg } = await client
      .from("vehicle_maintenance_configs")
      .select("mezzo_id, label")
      .eq("id", entityId)
      .maybeSingle();
    if (cfg?.mezzo_id) {
      const { data: mezzo } = await client
        .from("mezzi")
        .select("cliente, targa, marca_telaio, modello_telaio, numero_scuderia")
        .eq("id", cfg.mezzo_id)
        .maybeSingle();
      if (mezzo) {
        vars.cliente = String(mezzo.cliente ?? "");
        vars.targa = String(mezzo.targa ?? "");
        vars.marca = String(mezzo.marca_telaio ?? "");
        vars.modello = String(mezzo.modello_telaio ?? "");
        vars.mezzo =
          [vars.marca, vars.modello].filter(Boolean).join(" ").trim() ||
          String(cfg.label ?? mezzo.numero_scuderia ?? "");
      }
    }
  }

  if (payload.reminder_date) vars.data = String(payload.reminder_date);
  if (payload.window_days) vars.window_days = String(payload.window_days);

  return vars;
}

export async function resolveClienteIdForEntity(
  client: SupabaseClient,
  entityType: string,
  entityId: string,
  payload: Record<string, unknown>,
): Promise<string | null> {
  let label = "";
  if (entityType === "preventivi") {
    const { data } = await client.from("preventivi").select("cliente").eq("id", entityId).maybeSingle();
    label = String(data?.cliente ?? "");
  } else if (entityType === "lavorazioni") {
    const { data: lav } = await client.from("lavorazioni").select("mezzo_id").eq("id", entityId).maybeSingle();
    if (lav?.mezzo_id) {
      const { data: m } = await client.from("mezzi").select("cliente").eq("id", lav.mezzo_id).maybeSingle();
      label = String(m?.cliente ?? "");
    }
  } else if (entityType === "vehicle_maintenance_configs") {
    const { data: cfg } = await client.from("vehicle_maintenance_configs").select("mezzo_id").eq("id", entityId).maybeSingle();
    if (cfg?.mezzo_id) {
      const { data: m } = await client.from("mezzi").select("cliente").eq("id", cfg.mezzo_id).maybeSingle();
      label = String(m?.cliente ?? "");
    }
  } else if (typeof payload.cliente_label === "string") {
    label = payload.cliente_label;
  }
  if (!label.trim()) return null;
  const key = buildClienteEntityKey(label);
  const { data } = await client.from("clienti_anagrafiche").select("id").eq("entity_key", key).maybeSingle();
  return data?.id ?? null;
}
