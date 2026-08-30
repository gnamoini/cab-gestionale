"use client";

import { useMemo } from "react";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { IconActionButton } from "@/components/design-system";
import { HubIconOpen } from "@/components/design-system/hub-table-action-icons";
import { GestionaleInfoCard } from "@/components/design-system/gestionale-info-card";
import { MezziHubLavorazioneSummaryCard } from "@/components/gestionale/mezzi/mezzi-hub-lavorazione-summary-card";
import { MezziHubTabEmpty } from "@/components/gestionale/mezzi/mezzi-hub-ui";
import { addettoRefFromFields, type AddettoRef } from "@/lib/lavorazioni/addetto-display";
import { resolveAddettoSnapshotRef } from "@/lib/lavorazioni/resolve-addetto-display";
import { hrefLavorazioniPerMezzo } from "@/lib/mezzi/mezzi-helpers";
import type { MezzoGestito, MezzoInterventoLavorazione } from "@/lib/mezzi/types";
import { dsTableActionBtnSecondary, dsTableActionGlyph } from "@/lib/ui/design-system";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useSchedeBundlesQuery } from "@/src/hooks/use-schede-store-query";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

function hasAddettoRef(ref: AddettoRef | undefined): ref is AddettoRef {
  return Boolean(ref?.addettoId?.trim() || ref?.addettoLegacy?.trim());
}

export function MezziHubLavorazioniSummaryPanel({
  mezzo,
  interventi,
  lavorazioni = [],
  listPageSize,
  onClose,
}: {
  mezzo: MezzoGestito;
  interventi: readonly MezzoInterventoLavorazione[];
  lavorazioni?: readonly LavorazioneListRow[];
  listPageSize: number;
  onClose: () => void;
}) {
  const sorted = useMemo(() => {
    const rows = [...interventi];
    rows.sort((a, b) => new Date(b.dataIngresso).getTime() - new Date(a.dataIngresso).getTime());
    return rows;
  }, [interventi]);

  const { page, setPage, pageCount, sliceItems, showPager, label } = useClientPagination(
    sorted.length,
    listPageSize,
  );
  const paged = useMemo(() => sliceItems(sorted), [sorted, sliceItems]);

  const lavorazioneIds = useMemo(() => sorted.map((r) => r.id), [sorted]);
  const { store: schedeStore } = useSchedeBundlesQuery(sorted.length > 0, { lavorazioneIds });

  const lavById = useMemo(() => {
    const map = new Map<string, LavorazioneListRow>();
    for (const row of lavorazioni) map.set(row.id, row);
    return map;
  }, [lavorazioni]);

  const addettoRefByLavId = useMemo(() => {
    const map = new Map<string, AddettoRef>();
    for (const intervento of sorted) {
      const row = lavById.get(intervento.id);
      if (!row) continue;
      const ref = addettoRefFromFields(resolveAddettoSnapshotRef(row, schedeStore));
      if (hasAddettoRef(ref)) map.set(intervento.id, ref);
    }
    return map;
  }, [sorted, lavById, schedeStore]);

  return (
    <GestionaleInfoCard
      title="Storico lavorazioni"
      subtitle={`${sorted.length} ${sorted.length === 1 ? "intervento" : "interventi"}`}
      actions={
        <IconActionButton
          as="link"
          href={hrefLavorazioniPerMezzo(mezzo)}
          label="Apri pagina Lavorazioni"
          tooltipForce
          className={`${dsTableActionBtnSecondary} inline-flex items-center justify-center no-underline`}
          onClick={onClose}
        >
          <HubIconOpen className={dsTableActionGlyph} />
        </IconActionButton>
      }
      collapsible
      defaultCollapsed={sorted.length === 0}
    >
      {sorted.length === 0 ? (
        <MezziHubTabEmpty message="Nessuna lavorazione collegata a questo mezzo." />
      ) : (
        <div className="space-y-2">
          {paged.map((r) => (
            <MezziHubLavorazioneSummaryCard
              key={r.id}
              intervento={r}
              addettoRef={addettoRefByLavId.get(r.id)}
              onClose={onClose}
            />
          ))}
          {showPager ? (
            <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} />
          ) : null}
        </div>
      )}
    </GestionaleInfoCard>
  );
}
