"use client";

import {
  CLIENTI_ANAGRAFICHE_COLUMNS,
  CLIENTI_CONTATTI_COLUMNS,
  CLIENTI_SEDI_COLUMNS,
} from "@/lib/db/table-select-columns";
import {
  clienteAnagraficaRowsToUi,
  clienteAnagraficaUiToHeaderInsert,
  clienteSedeFieldsToDb,
  stubClienteAnagraficaForNome,
} from "@/lib/clienti/clienti-anagrafica-db-adapter";
import { clienteAnagraficaUpsertSchema } from "@/lib/clienti/clienti-anagrafica-schema";
import type { ClienteAnagrafica } from "@/lib/clienti/clienti-anagrafica-types";
import { validateClienteAnagrafica } from "@/lib/clienti/clienti-anagrafica-validation";
import { syncSedeLegaleFromOperativa } from "@/lib/clienti/clienti-sede-sync";
import { buildClienteEntityKey } from "@/lib/validation/entity-keys";
import {
  ensureClientLavorazioniAccess,
  ensurePermission,
  loadCallerClienteRef,
} from "@/src/lib/auth/permission-guards";
import { normalizeClienteRef } from "@/src/lib/auth/cliente-portal-scope";
import { RBAC_DENIED_MESSAGE } from "@/lib/rbac";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";
import type {
  ClienteAnagraficaRow,
  ClienteContattoRow,
  ClienteSedeRow,
} from "@/src/types/supabase-tables";

async function sb() {
  return getBrowserSupabase();
}

async function loadByEntityKey(entityKey: string): Promise<ServiceResult<ClienteAnagrafica | null>> {
  const c = await sb();
  const { data: header, error } = await c
    .from("clienti_anagrafiche")
    .select(CLIENTI_ANAGRAFICHE_COLUMNS)
    .eq("entity_key", entityKey)
    .maybeSingle();
  if (error) return err(error.message);
  if (!header) return success(null);
  const row = header as ClienteAnagraficaRow;
  const [sediRes, contRes] = await Promise.all([
    c.from("clienti_sedi").select(CLIENTI_SEDI_COLUMNS).eq("cliente_id", row.id),
    c.from("clienti_contatti").select(CLIENTI_CONTATTI_COLUMNS).eq("cliente_id", row.id).order("ordine"),
  ]);
  if (sediRes.error) return err(sediRes.error.message);
  if (contRes.error) return err(contRes.error.message);
  return success(
    clienteAnagraficaRowsToUi(
      row,
      (sediRes.data ?? []) as ClienteSedeRow[],
      (contRes.data ?? []) as ClienteContattoRow[],
    ),
  );
}

export const clientiAnagraficaService = {
  /** Anagrafica propria per utente Cliente (portale profilo). */
  async getOwnForClientePortal(clienteRef: string): Promise<ServiceResult<ClienteAnagrafica | null>> {
    try {
      const access = await ensureClientLavorazioniAccess();
      if (!access.success) return err(access.error ?? RBAC_DENIED_MESSAGE);
      const trimmed = normalizeClienteRef(clienteRef);
      if (!trimmed) return err("Cliente non associato.");
      const callerRef = await loadCallerClienteRef();
      if (!callerRef || callerRef !== trimmed) return err(RBAC_DENIED_MESSAGE);
      const entityKey = buildClienteEntityKey(trimmed);
      if (!entityKey) return err("Nome cliente non valido.");
      return loadByEntityKey(entityKey);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async getByNomeDisplay(nomeDisplay: string): Promise<ServiceResult<ClienteAnagrafica>> {
    try {
      const allowed = await ensurePermission("manageSettings");
      if (!allowed.success) return err(allowed.error ?? "Permesso negato.");
      const trimmed = nomeDisplay.trim();
      if (!trimmed) return err("Nome cliente non valido.");
      const entityKey = buildClienteEntityKey(trimmed);
      if (!entityKey) return err("Nome cliente non valido.");
      const loaded = await loadByEntityKey(entityKey);
      if (!loaded.success) return err(loaded.error ?? "Caricamento non riuscito.");
      if (loaded.data) return success(loaded.data);
      return success(stubClienteAnagraficaForNome(trimmed, entityKey));
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async ensureStub(nomeDisplay: string): Promise<ServiceResult<ClienteAnagrafica>> {
    try {
      const allowed = await ensurePermission("manageSettings");
      if (!allowed.success) return err(allowed.error ?? "Permesso negato.");
      const trimmed = nomeDisplay.trim();
      const entityKey = buildClienteEntityKey(trimmed);
      if (!entityKey) return err("Nome cliente non valido.");
      const existing = await loadByEntityKey(entityKey);
      if (!existing.success) return err(existing.error ?? "Caricamento non riuscito.");
      if (existing.data?.id) return success(existing.data);
      const stub = stubClienteAnagraficaForNome(trimmed, entityKey);
      const c = await sb();
      const insert = clienteAnagraficaUiToHeaderInsert(stub, entityKey);
      const { data, error } = await c.from("clienti_anagrafiche").insert(insert).select(CLIENTI_ANAGRAFICHE_COLUMNS).single();
      if (error) return err(error.message);
      return success(clienteAnagraficaRowsToUi(data as ClienteAnagraficaRow, [], []));
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async upsert(model: ClienteAnagrafica): Promise<ServiceResult<ClienteAnagrafica>> {
    try {
      const allowed = await ensurePermission("manageSettings");
      if (!allowed.success) return err(allowed.error ?? "Permesso negato.");
      const parsed = clienteAnagraficaUpsertSchema.safeParse({
        id: model.id || undefined,
        nomeDisplay: model.nomeDisplay,
        ragioneSociale: model.ragioneSociale,
        partitaIva: model.partitaIva,
        codiceDestinatario: model.codiceDestinatario,
        sedeLegaleUgualeOperativa: model.sedeLegaleUgualeOperativa,
        note: model.note,
        sedi: model.sedi,
        contatti: model.contatti,
      });
      if (!parsed.success) return err("Dati anagrafica non validi.");
      const issues = validateClienteAnagrafica(model);
      if (issues.length) return err(issues[0]!.message);

      const entityKey = buildClienteEntityKey(model.nomeDisplay);
      if (!entityKey) return err("Nome cliente non valido.");

      const c = await sb();
      let clienteId = model.id.trim();
      const headerPayload = clienteAnagraficaUiToHeaderInsert({ ...model, inListaSettings: true }, entityKey);

      if (clienteId) {
        const { error: updErr } = await c
          .from("clienti_anagrafiche")
          .update({
            ragione_sociale: headerPayload.ragione_sociale,
            partita_iva: headerPayload.partita_iva,
            codice_destinatario: headerPayload.codice_destinatario,
            sede_legale_uguale_operativa: headerPayload.sede_legale_uguale_operativa,
            note: headerPayload.note,
            in_lista_settings: true,
          })
          .eq("id", clienteId);
        if (updErr) return err(updErr.message);
      } else {
        const { data, error: insErr } = await c
          .from("clienti_anagrafiche")
          .insert(headerPayload)
          .select(CLIENTI_ANAGRAFICHE_COLUMNS)
          .single();
        if (insErr) return err(insErr.message);
        clienteId = (data as ClienteAnagraficaRow).id;
      }

      const legaleFields = model.sedeLegaleUgualeOperativa
        ? syncSedeLegaleFromOperativa(model.sedi.operativa)
        : model.sedi.legale;

      await c.from("clienti_sedi").delete().eq("cliente_id", clienteId);
      const sediRows = [
        clienteSedeFieldsToDb(clienteId, "operativa", model.sedi.operativa),
        clienteSedeFieldsToDb(clienteId, "legale", legaleFields),
      ];
      const { error: sediErr } = await c.from("clienti_sedi").insert(sediRows);
      if (sediErr) return err(sediErr.message);

      await c.from("clienti_contatti").delete().eq("cliente_id", clienteId);
      if (model.contatti.length) {
        const contattiRows = model.contatti.map((contact, i) => ({
          id: contact.id,
          cliente_id: clienteId,
          etichetta: contact.etichetta.trim(),
          tipo: contact.tipo,
          valore: contact.valore.trim(),
          ordine: i,
        }));
        const { error: contErr } = await c.from("clienti_contatti").insert(contattiRows);
        if (contErr) return err(contErr.message);
      }

      return loadByEntityKey(entityKey).then((r) => {
        if (!r.success || !r.data) return err(r.error ?? "Salvataggio non riuscito.");
        return success(r.data);
      });
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async renameNomeDisplay(from: string, to: string): Promise<ServiceResult<number>> {
    try {
      const allowed = await ensurePermission("manageSettings");
      if (!allowed.success) return err(allowed.error ?? "Permesso negato.");
      const fromKey = buildClienteEntityKey(from);
      if (!fromKey) return success(0);
      const c = await sb();
      const { data, error } = await c
        .from("clienti_anagrafiche")
        .update({ nome_display: to.trim() })
        .eq("entity_key", fromKey)
        .select("id");
      if (error) return err(error.message);
      return success((data ?? []).length);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async markRemovedFromLista(nomeDisplay: string): Promise<ServiceResult<void>> {
    try {
      const entityKey = buildClienteEntityKey(nomeDisplay);
      if (!entityKey) return success(undefined);
      const c = await sb();
      await c.from("clienti_anagrafiche").update({ in_lista_settings: false }).eq("entity_key", entityKey);
      return success(undefined);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
