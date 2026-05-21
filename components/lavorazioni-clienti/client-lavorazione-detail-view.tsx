"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/gestionale/page-header";
import { ShellCard } from "@/components/gestionale/shell-card";
import { IconBack, IconQrCode } from "@/components/lavorazioni-clienti/client-lavorazioni-icons";
import { ClientLavorazioneMediaPanel } from "@/components/lavorazioni-clienti/client-lavorazione-media-panel";
import { ClientLavorazioneQrDialog } from "@/components/lavorazioni-clienti/client-lavorazione-qr-dialog";
import {
  ClientLavorazioneTimelinePanel,
  clientTimelinePageTitle,
} from "@/components/lavorazioni-clienti/client-lavorazione-timeline-panel";
import { buildClientTimelineHeader } from "@/lib/lavorazioni/client-portal-timeline";
import { filterClientPortalStatiOptions } from "@/lib/lavorazioni/client-portal-stati";
import { lavorazioneRefLabel } from "@/lib/lavorazioni/client-portal-ui";
import { statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import { dsBtnNeutral, dsPageToolbarBtn, dsStackPage } from "@/lib/ui/design-system";
import { useClientLavorazioniAccess } from "@/src/hooks/use-client-lavorazioni-access";
import { useClientLavorazioneDetailQuery } from "@/src/hooks/gestionale/use-client-lavorazioni-queries";
import { useLavorazioneSchedeStoreSync } from "@/src/hooks/use-lavorazione-schede-store-sync";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { resolveStatoToDbEnum, statoLavorazioneLabel } from "@/src/shared/selectors";

export function ClientLavorazioneDetailView({ lavorazioneId }: { lavorazioneId: string }) {
  const access = useClientLavorazioniAccess();
  const detailQ = useClientLavorazioneDetailQuery(lavorazioneId, access.allowed);
  const globalOpts = useGlobalOptions({ debugTag: "ClientLavorazioneDetail" });
  const statiOpts = useMemo(
    () => filterClientPortalStatiOptions(globalOpts.lavorazioni.stati),
    [globalOpts.lavorazioni.stati],
  );
  const schedeStore = useLavorazioneSchedeStoreSync();
  const addettiGlobali = globalOpts.lavorazioni.addetti;
  const [qrOpen, setQrOpen] = useState(false);

  const detail = detailQ.data;
  const row = detail?.row;
  const logs = detail?.logs ?? [];

  const ref = lavorazioneRefLabel(lavorazioneId);

  const safeStato = row ? resolveStatoToDbEnum(row.stato) : null;
  const statoLabel = safeStato ? statoLavorazioneLabel(safeStato, statiOpts) || safeStato : "—";
  const statoStyle = safeStato ? readablePillStyleFromHex(statoDisplayColor(safeStato, statiOpts)) : undefined;

  const pageTitle = useMemo(() => {
    if (!row) return "Lavorazioni (Clienti)";
    return clientTimelinePageTitle(buildClientTimelineHeader(row, schedeStore));
  }, [row, schedeStore]);

  if (access.isLoading) {
    return (
      <>
        <PageHeader title="Lavorazioni (Clienti)" />
        <div className={dsStackPage}>
          <p className="text-sm text-zinc-500">Verifica accesso…</p>
        </div>
      </>
    );
  }

  if (!access.allowed) {
    return (
      <>
        <PageHeader title="Lavorazioni (Clienti)" />
        <div className={dsStackPage}>
          <ShellCard>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Non hai permesso per visualizzare questa lavorazione.</p>
            <Link href="/dashboard" className={`mt-4 inline-flex ${dsBtnNeutral}`}>
              Torna alla dashboard
            </Link>
          </ShellCard>
        </div>
      </>
    );
  }

  if (detailQ.isLoading) {
    return (
      <>
        <PageHeader title="Lavorazioni (Clienti)" />
        <div className={dsStackPage}>
          <p className="text-sm text-zinc-500">Caricamento…</p>
        </div>
      </>
    );
  }

  if (detailQ.isError || !row) {
    return (
      <>
        <PageHeader title="Lavorazioni (Clienti)" />
        <div className={dsStackPage}>
          <ShellCard>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {detailQ.error?.message ?? "La lavorazione richiesta non esiste o non è accessibile."}
            </p>
            <Link href="/lavorazioni-clienti" className={`mt-4 inline-flex ${dsBtnNeutral}`}>
              Torna all&apos;elenco
            </Link>
          </ShellCard>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={pageTitle}
        actions={
          <div className="flex min-w-0 shrink-0 flex-nowrap items-center justify-end gap-2">
            <Link
              href="/lavorazioni-clienti"
              className={`${dsPageToolbarBtn} shrink-0 px-2.5 sm:px-3`}
              title="Torna all'elenco"
              aria-label="Torna all'elenco"
            >
              <IconBack />
              <span className="sr-only">Torna all&apos;elenco</span>
            </Link>
            <button
              type="button"
              className={`${dsPageToolbarBtn} shrink-0 px-2.5 sm:px-3`}
              title="QR lavorazione"
              aria-label="QR lavorazione"
              onClick={() => setQrOpen(true)}
            >
              <IconQrCode />
              <span className="sr-only">QR lavorazione</span>
            </button>
          </div>
        }
      />

      <div className={dsStackPage}>
        <ShellCard>
          <ClientLavorazioneTimelinePanel
            row={row}
            schedeStore={schedeStore}
            logs={logs}
            addettiGlobali={addettiGlobali}
            statiOpts={statiOpts}
            statoLabel={statoLabel}
            statoStyle={statoStyle}
          />
        </ShellCard>

        <ClientLavorazioneMediaPanel lavorazioneId={row.id} />
      </div>

      {qrOpen ? (
        <ClientLavorazioneQrDialog open onClose={() => setQrOpen(false)} lavorazioneId={row.id} refLabel={ref} />
      ) : null}
    </>
  );
}
