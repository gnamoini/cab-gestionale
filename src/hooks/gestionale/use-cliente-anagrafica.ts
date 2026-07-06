"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ClienteAnagrafica } from "@/lib/clienti/clienti-anagrafica-types";
import { clientiAnagraficaEntry } from "@/lib/domain/clienti-anagrafica-entry";

export function clienteAnagraficaQueryKey(nomeDisplay: string) {
  return ["clienti-anagrafica", nomeDisplay.trim()] as const;
}

export function clientePortalAnagraficaQueryKey(clienteRef: string) {
  return ["clienti-anagrafica-portal", clienteRef.trim()] as const;
}

export function useClienteAnagrafica(nomeDisplay: string | null, enabled = true) {
  const trimmed = nomeDisplay?.trim() ?? "";
  return useQuery({
    queryKey: clienteAnagraficaQueryKey(trimmed),
    queryFn: async () => {
      const res = await clientiAnagraficaEntry.getByNomeDisplay(trimmed);
      if (!res.success || !res.data) throw new Error(res.error ?? "Caricamento anagrafica non riuscito.");
      return res.data;
    },
    enabled: enabled && trimmed.length > 0,
    staleTime: 30_000,
  });
}

export function useClientePortalAnagrafica(clienteRef: string | null, enabled = true) {
  const trimmed = clienteRef?.trim() ?? "";
  return useQuery({
    queryKey: clientePortalAnagraficaQueryKey(trimmed),
    queryFn: async () => {
      const res = await clientiAnagraficaEntry.getOwnForClientePortal(trimmed);
      if (!res.success) throw new Error(res.error ?? "Caricamento anagrafica non riuscito.");
      return res.data;
    },
    enabled: enabled && trimmed.length > 0,
    staleTime: 30_000,
  });
}

export function useClienteAnagraficaSave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (model: ClienteAnagrafica) => {
      let toSave = model;
      if (!toSave.id) {
        const stubRes = await clientiAnagraficaEntry.ensureStub(model.nomeDisplay);
        if (!stubRes.success || !stubRes.data) throw new Error(stubRes.error ?? "Creazione anagrafica non riuscita.");
        toSave = { ...model, id: stubRes.data.id };
      }
      const res = await clientiAnagraficaEntry.upsert(toSave);
      if (!res.success || !res.data) throw new Error(res.error ?? "Salvataggio non riuscito.");
      return res.data;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: clienteAnagraficaQueryKey(data.nomeDisplay) });
    },
  });
}
