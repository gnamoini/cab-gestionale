"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HubModalTab, HubModalTabBar } from "@/components/design-system/hub-modal-tab-bar";
import {
  GestionaleModalFooterActions,
  GestionaleModalFooterCancelButton,
  GestionaleModalFooterSaveButton,
} from "@/components/design-system";
import { ClienteComunicazioniPanel } from "@/components/dashboard/settings/cliente-comunicazioni-panel";
import { ClienteAnagraficaPanoramica } from "@/components/dashboard/settings/cliente-anagrafica-panoramica";
import { ClienteContattiEditor } from "@/components/dashboard/settings/cliente-contatti-editor";
import { ClienteDatiFiscaliFields, ClienteSediFields } from "@/components/dashboard/settings/cliente-sedi-fields";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import type { ClienteAnagrafica } from "@/lib/clienti/clienti-anagrafica-types";
import { validateClienteAnagrafica } from "@/lib/clienti/clienti-anagrafica-validation";
import { useMaxMdDown } from "@/lib/ui/use-max-md-down";
import { useClienteAnagrafica, useClienteAnagraficaSave } from "@/src/hooks/gestionale/use-cliente-anagrafica";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

type TabId = "panoramica" | "fiscali" | "sedi" | "contatti" | "comunicazioni";

const TABS: { id: TabId; label: string }[] = [
  { id: "panoramica", label: "Panoramica" },
  { id: "fiscali", label: "Dati fiscali" },
  { id: "sedi", label: "Sedi" },
  { id: "contatti", label: "Contatti" },
  { id: "comunicazioni", label: "Comunicazioni" },
];

function modelsEqual(a: ClienteAnagrafica, b: ClienteAnagrafica): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function ClienteAnagraficaHubModal({
  nomeDisplay,
  onRequestClose,
}: {
  nomeDisplay: string;
  onRequestClose: () => void;
}) {
  const isMobile = useMaxMdDown();
  const gestToast = useGestionaleToast();
  const { data, isLoading, error } = useClienteAnagrafica(nomeDisplay, true);
  const saveMutation = useClienteAnagraficaSave();
  const [tab, setTab] = useState<TabId>("panoramica");
  const [draft, setDraft] = useState<ClienteAnagrafica | null>(null);

   
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
    if (data) setDraft(data);
  }, [data]);

  const dirty = useMemo(() => draft && data && !modelsEqual(draft, data), [draft, data]);

  const handleSave = useCallback(async () => {
    if (!draft || saveMutation.isPending) return;
    const issues = validateClienteAnagrafica(draft);
    if (issues.length) {
      gestToast.validation(issues[0]!.message);
      return;
    }
    try {
      const saved = await saveMutation.mutateAsync(draft);
      setDraft(saved);
      gestToast.successOnce("cliente-anagrafica-save", "Anagrafica cliente salvata.");
    } catch (e) {
      gestToast.errorOnce("cliente-anagrafica-save", e);
    }
  }, [draft, gestToast, saveMutation]);

  const panelId = "cliente-anagrafica-panel";

  return (
    <LavorazioniModalShell
      modalSize="formLarge"
      title={`Anagrafica — ${nomeDisplay}`}
      onRequestClose={onRequestClose}
      footer={
        tab === "panoramica" ? null : (
          <GestionaleModalFooterActions className="justify-end gap-2 border-t border-[color:var(--cab-border)] px-4 py-3">
            <GestionaleModalFooterCancelButton onClick={onRequestClose} disabled={saveMutation.isPending}>
              Chiudi
            </GestionaleModalFooterCancelButton>
            <GestionaleModalFooterSaveButton
              type="button"
              loading={saveMutation.isPending}
              disabled={!dirty || !draft}
              onClick={() => void handleSave()}
            />
          </GestionaleModalFooterActions>
        )
      }
    >
      {isLoading ? (
        <p className="p-4 text-sm text-[color:var(--cab-text-muted)]">Caricamento anagrafica…</p>
      ) : error ? (
        <p className="p-4 text-sm text-red-600">{error instanceof Error ? error.message : "Errore caricamento."}</p>
      ) : draft ? (
        <>
          {!isMobile ? (
            <HubModalTabBar aria-label="Sezioni anagrafica cliente">
              {TABS.map((t) => (
                <HubModalTab
                  key={t.id}
                  id={`cliente-tab-${t.id}`}
                  panelId={panelId}
                  label={t.label}
                  active={tab === t.id}
                  onSelect={() => setTab(t.id)}
                />
              ))}
            </HubModalTabBar>
          ) : null}
          <GestionaleModalScrollBody>
            <div id={panelId} role="tabpanel" className="space-y-4 p-4">
              {isMobile ? (
                <>
                  <ClienteAnagraficaPanoramica model={draft} />
                  <ClienteDatiFiscaliFields model={draft} onChange={setDraft} />
                  <ClienteSediFields model={draft} onChange={setDraft} />
                  <ClienteContattiEditor model={draft} onChange={setDraft} />
                </>
              ) : tab === "panoramica" ? (
                <ClienteAnagraficaPanoramica model={draft} />
              ) : tab === "fiscali" ? (
                <ClienteDatiFiscaliFields model={draft} onChange={setDraft} />
              ) : tab === "sedi" ? (
                <ClienteSediFields model={draft} onChange={setDraft} />
              ) : tab === "contatti" ? (
                <ClienteContattiEditor model={draft} onChange={setDraft} />
              ) : tab === "comunicazioni" ? (
                <ClienteComunicazioniPanel clienteId={draft.id} />
              ) : null}
            </div>
          </GestionaleModalScrollBody>
        </>
      ) : null}
    </LavorazioniModalShell>
  );
}
