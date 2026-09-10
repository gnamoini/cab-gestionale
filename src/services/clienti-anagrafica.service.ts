"use client";

/* eslint-disable cab-rbac/no-auth-in-services -- lint phase2: legacy service layer; domain entry migration deferred */
import {
  CLIENTI_ANAGRAFICHE_COLUMNS,
  CLIENTI_CONTATTI_COLUMNS,
  CLIENTI_SEDI_COLUMNS,
} from "@/lib/db/table-select-columns";
import {
  clienteAnagraficaRowsToUi,
  clienteSedeFieldsToDb,
  stubClienteAnagraficaForNome,
} from "@/lib/clienti/clienti-anagrafica-db-adapter";
import { clienteAnagraficaUpsertSchema } from "@/lib/clienti/clienti-anagrafica-schema";
import type { ClienteAnagrafica } from "@/lib/clienti/clienti-anagrafica-types";
import { validateClienteAnagrafica } from "@/lib/clienti/clienti-anagrafica-validation";
import { syncSedeLegaleFromOperativa } from "@/lib/clienti/clienti-sede-sync";
import { mapFiscalConflictError } from "@/lib/fiscal/conflict";
import { buildClienteEntityKey } from "@/lib/validation/entity-keys";
import { loadCallerClienteRef } from "@/src/lib/auth/permission-guards";
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

async function loadById(clienteId: string): Promise<ServiceResult<ClienteAnagrafica | null>> {
  const c = await sb();
  const { data: header, error } = await c
    .from("clienti_anagrafiche")
    .select(CLIENTI_ANAGRAFICHE_COLUMNS)
    .eq("id", clienteId)
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

async function persistHeaderViaApi(model: ClienteAnagrafica, entityKey: string, clienteId: string | null): Promise<ServiceResult<string>> {
  const payload = {
    nome_display: model.nomeDisplay,
    entity_key: entityKey,
    ragione_sociale: model.ragioneSociale || null,
    partita_iva: model.partitaIva || null,
    codice_fiscale: model.codiceFiscale || null,
    pec: model.pec || null,
    nazione: model.nazione || "IT",
    codice_destinatario: model.codiceDestinatario || null,
    sede_legale_uguale_operativa: model.sedeLegaleUgualeOperativa,
    note: model.note || null,
    in_lista_settings: true,
  };
  try {
    if (clienteId) {
      const res = await fetch(`/api/admin/master-data/clienti/${clienteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) return err(body.error ?? "Salvataggio non riuscito.");
      return success(clienteId);
    }
    const res = await fetch("/api/admin/master-data/clienti", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await res.json()) as { id?: string; error?: string };
    if (!res.ok) return err(mapFiscalConflictError(new Error(body.error ?? "")) ?? body.error ?? "Salvataggio non riuscito.");
    if (!body.id) return err("Salvataggio non riuscito.");
    return success(body.id);
  } catch (e) {
    return serviceFailFromError(e);
  }
}

export const clientiAnagraficaService = {
  async getById(clienteId: string): Promise<ServiceResult<ClienteAnagrafica | null>> {
    try {
      if (!clienteId.trim()) return err("ID cliente non valido.");
      return loadById(clienteId);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  /** Anagrafica propria per utente Cliente (portale profilo). */
  async getOwnForClientePortal(clienteRef: string): Promise<ServiceResult<ClienteAnagrafica | null>> {
    try {
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
      const trimmed = nomeDisplay.trim();
      const entityKey = buildClienteEntityKey(trimmed);
      if (!entityKey) return err("Nome cliente non valido.");
      const existing = await loadByEntityKey(entityKey);
      if (!existing.success) return err(existing.error ?? "Caricamento non riuscito.");
      if (existing.data?.id) return success(existing.data);
      const stub = stubClienteAnagraficaForNome(trimmed, entityKey);
      const persisted = await persistHeaderViaApi(stub, entityKey, null);
      if (!persisted.success || !persisted.data) return err(persisted.error ?? "Creazione stub non riuscita.");
      const loaded = await loadById(persisted.data);
      if (!loaded.success || !loaded.data) return err(loaded.error ?? "Caricamento non riuscito.");
      return success(loaded.data);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async upsert(model: ClienteAnagrafica): Promise<ServiceResult<ClienteAnagrafica>> {
    try {
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
      const persisted = await persistHeaderViaApi(model, entityKey, model.id.trim() || null);
      if (!persisted.success || !persisted.data) return err(persisted.error ?? "Salvataggio non riuscito.");
      const clienteId = persisted.data;

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
      const fromKey = buildClienteEntityKey(from);
      if (!fromKey) return success(0);
      const loaded = await loadByEntityKey(fromKey);
      if (!loaded.success || !loaded.data?.id) return success(0);
      const res = await fetch(`/api/admin/master-data/clienti/${loaded.data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome_display: to.trim() }),
      });
      if (!res.ok) return err("Rinomina anagrafica non riuscita.");
      return success(1);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async markRemovedFromLista(nomeDisplay: string): Promise<ServiceResult<void>> {
    try {
      const entityKey = buildClienteEntityKey(nomeDisplay);
      if (!entityKey) return success(undefined);
      const loaded = await loadByEntityKey(entityKey);
      if (!loaded.success || !loaded.data?.id) return success(undefined);
      const res = await fetch(`/api/admin/master-data/clienti/${loaded.data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ in_lista_settings: false }),
      });
      if (!res.ok) return err("Aggiornamento lista non riuscito.");
      return success(undefined);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
