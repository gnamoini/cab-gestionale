"use client";

import { useCallback, useMemo, useState } from "react";
import {
  MezzoSelectionPanel,
  MezzoSelectionPanelFooter,
} from "@/components/gestionale/mezzi/mezzo-selection-panel";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal-shell";
import { pushMezzoSelectionRecent } from "@/lib/mezzi/mezzo-selection-recents";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SelectedMezzoContext } from "@/lib/lavorazioni/selected-mezzo-context";
import { searchMezziForPicker } from "@/lib/mezzi/search-mezzi-for-picker";

export function LavorazioneCreateMezzoStepShell({
  open,
  onRequestClose,
  catalog,
  catalogLoading,
  catalogError,
  userId,
  onSelect,
}: {
  open: boolean;
  onRequestClose: () => void;
  catalog: readonly MezzoGestito[];
  catalogLoading: boolean;
  catalogError?: string | null;
  userId?: string | null;
  onSelect: (ctx: SelectedMezzoContext) => void;
}) {
  const [query, setQuery] = useState("");

  const showDuplicateWarning = useMemo(() => {
    if (!query.trim() || catalogLoading || catalog.length === 0) return false;
    const res = searchMezziForPicker(catalog, query, { userId });
    return res.hasSearchQuery && res.navigableMezzi.length === 0;
  }, [catalog, catalogLoading, query, userId]);

  const handleSelect = useCallback(
    (ctx: SelectedMezzoContext) => {
      if (ctx.mode === "existing") {
        pushMezzoSelectionRecent(ctx.mezzoId, userId);
      }
      setQuery("");
      onSelect(ctx);
    },
    [onSelect, userId],
  );

  const handleNuovoMezzo = useCallback(() => {
    setQuery("");
    onSelect({ mode: "new", source: "manual" });
  }, [onSelect]);

  if (!open) return null;

  return (
    <GestionaleModalShell
      modalSize="formMedium"
      modalHeight="standard"
      title="Nuova lavorazione"
      subtitle="Seleziona il mezzo"
      onRequestClose={onRequestClose}
      footer={
        <MezzoSelectionPanelFooter
          onNuovoMezzo={handleNuovoMezzo}
          showDuplicateWarning={showDuplicateWarning}
        />
      }
    >
      <GestionaleModalScrollBody containScroll className="flex min-h-0 flex-1 flex-col overflow-hidden min-w-0">
        <MezzoSelectionPanel
          catalog={catalog}
          catalogLoading={catalogLoading}
          catalogError={catalogError}
          query={query}
          onQueryChange={setQuery}
          onSelect={handleSelect}
          userId={userId}
        />
      </GestionaleModalScrollBody>
    </GestionaleModalShell>
  );
}
