"use client";

import { useEffect, useState } from "react";
import { SchedaIngressoPanoramicaView } from "@/components/gestionale/lavorazioni/scheda-ingresso-panoramica-view";
import { SchedaLavorazioniFormBody } from "@/components/lavorazioni/schede/scheda-lavorazioni-form-body";
import { SchedaRicambiFormBody } from "@/components/lavorazioni/schede/scheda-ricambi-form-body";
import { fetchSchedeBundlesStoreAuthorized } from "@/lib/schede/schede-bundles-fetch-authorized";
import { resolveDrawerAsideClasses } from "@/lib/ui/modal-size-system";
import { useGestionaleOverlayBehavior } from "@/lib/ui/use-gestionale-overlay-behavior";
import { dsBtnNeutral, dsScrollbar } from "@/lib/ui/design-system";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import type { LavorazioneSchedeBundle, SchedaTipo } from "@/types/schede";
import { LoadingSpinner } from "@/components/design-system/loading";

const TIPO_LABEL: Record<SchedaTipo, string> = {
  ingresso: "Scheda ingresso",
  lavorazioni: "Scheda lavorazioni",
  ricambi: "Scheda ricambi",
};

export function MezzoSchedaReadOnlyDrawer({
  open,
  lavorazioneId,
  schedaTipo,
  onClose,
}: {
  open: boolean;
  lavorazioneId: string | null;
  schedaTipo: SchedaTipo | null;
  onClose: () => void;
}) {
  const globalOpts = useGlobalOptions({ enabled: open });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [bundle, setBundle] = useState<LavorazioneSchedeBundle | null>(null);

  useGestionaleOverlayBehavior({
    open,
    onRequestClose: onClose,
    source: "mezzo-scheda-readonly-drawer",
    overlayBack: { layer: "drawer" },
  });

  useEffect(() => {
    if (!open || !lavorazioneId?.trim()) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchSchedeBundlesStoreAuthorized([lavorazioneId])
      .then((res) => {
        if (cancelled) return;
        if (!res.success) {
          setError(res.error ?? "Permesso o dati scheda non disponibili.");
          setBundle(null);
          return;
        }
        setBundle(res.data?.[lavorazioneId] ?? null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Errore caricamento scheda.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lavorazioneId, open]);

  if (!open) return null;

  const schedaGlobalOpts = {
    addettiLista: globalOpts.lavorazioni.addetti ?? [],
  };

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[var(--cab-overlay-z)] bg-black/40"
        aria-label="Chiudi drawer scheda"
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-[calc(var(--cab-overlay-z)+1)] ${resolveDrawerAsideClasses("drawerLog")} ${dsScrollbar} flex flex-col bg-[var(--cab-card)] shadow-xl`}
        role="dialog"
        aria-modal="true"
        aria-label={schedaTipo ? TIPO_LABEL[schedaTipo] : "Scheda lavorazione"}
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[color:var(--cab-border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[color:var(--cab-text)]">
            {schedaTipo ? TIPO_LABEL[schedaTipo] : "Scheda"}
          </h2>
          <button type="button" className={dsBtnNeutral} onClick={onClose}>
            Chiudi
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : error ? (
            <p className="text-sm text-[color:var(--cab-danger)]">{error}</p>
          ) : !bundle ? (
            <p className="text-sm text-[color:var(--cab-text-muted)]">Scheda non trovata.</p>
          ) : schedaTipo === "ingresso" && bundle.ingresso?.campi ? (
            <SchedaIngressoPanoramicaView fields={bundle.ingresso.campi} densePanorama />
          ) : schedaTipo === "lavorazioni" && bundle.lavorazioni?.campi ? (
            <SchedaLavorazioniFormBody
              value={bundle.lavorazioni.campi}
              onChange={() => {}}
              readonly
              globalOpts={schedaGlobalOpts}
            />
          ) : schedaTipo === "ricambi" && bundle.ricambi?.campi ? (
            <SchedaRicambiFormBody
              value={bundle.ricambi.campi}
              onChange={() => {}}
              readonly
              globalOpts={schedaGlobalOpts}
            />
          ) : (
            <p className="text-sm text-[color:var(--cab-text-muted)]">Contenuto scheda non disponibile.</p>
          )}
        </div>
      </aside>
    </>
  );
}
