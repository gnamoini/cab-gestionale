"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useState, type MouseEvent } from "react";
import { PageHeader } from "@/components/gestionale/page-header";
import { GestionaleRefreshToolbarButton, gestionalePageToolbarActionsClass } from "@/components/gestionale/page-header-toolbar";
import { ShellCard } from "@/components/gestionale/shell-card";
import { IconBack, IconQrCode } from "@/components/lavorazioni-clienti/client-lavorazioni-icons";
import { ClientLavorazioneInformazioniPanel } from "@/components/lavorazioni-clienti/client-lavorazione-informazioni-panel";
import { ClientLavorazioneMediaPanel } from "@/components/lavorazioni-clienti/client-lavorazione-media-panel";
import { ClientLavorazioneDocumentsPanel } from "@/components/lavorazioni-clienti/client-lavorazione-documents";
import { ClientLavorazioneQrDialog } from "@/components/lavorazioni-clienti/client-lavorazione-qr-dialog";
import {
  ClientLavorazioneAvanzamentoPanel,
  ClientLavorazioneTimelinePanel,
  clientTimelinePageTitle,
} from "@/components/lavorazioni-clienti/client-lavorazione-timeline-panel";
import { clientLavorazioniListPath, PORTALE_CLIENTI_LABEL } from "@/lib/lavorazioni/client-portal-access";
import { buildClientTimelineHeader } from "@/lib/lavorazioni/client-portal-timeline";
import {
  filterClientPortalStatiOptions,
  resolveClientPortalStatoId,
} from "@/lib/lavorazioni/client-portal-stati";
import { lavorazioneRefLabel } from "@/lib/lavorazioni/client-portal-ui";
import { statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import { HubModalPanoramicaPanel, IconActionButton, LoadingClientDetailSkeleton } from "@/components/design-system";
import { dsBtnNeutral, dsGapXl, dsStackPage } from "@/lib/ui/design-system";
import { useClientLavorazioniAccess } from "@/src/hooks/use-client-lavorazioni-access";
import { useClientLavorazioneDetailQuery } from "@/src/hooks/gestionale/use-client-lavorazioni-queries";
import { useClientLavorazioniRefresh } from "@/src/hooks/use-client-lavorazioni-refresh";
import { useSchedeBundlesQuery } from "@/src/hooks/use-schede-store-query";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { statoLavorazioneLabel } from "@/src/shared/selectors";

const CLIENT_PORTAL_BACK_LABEL = `Torna a ${PORTALE_CLIENTI_LABEL}`;

export function ClientLavorazioneDetailView({ lavorazioneId }: { lavorazioneId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const listPath = clientLavorazioniListPath();
  const access = useClientLavorazioniAccess();

  const goToClientList = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      if (pathname === listPath) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (pathname.startsWith(`${listPath}/`)) {
        e.preventDefault();
        router.push(listPath);
      }
    },
    [listPath, pathname, router],
  );
  const detailQ = useClientLavorazioneDetailQuery(lavorazioneId, access.allowed);
  const globalOpts = useGlobalOptions({ debugTag: "ClientLavorazioneDetail" });
  const statiOpts = useMemo(
    () => filterClientPortalStatiOptions(globalOpts.lavorazioni.stati),
    [globalOpts.lavorazioni.stati],
  );
  const { store: schedeStore } = useSchedeBundlesQuery(access.allowed, { viewLayer: true });
  const addettiGlobali = globalOpts.lavorazioni.addetti;
  const [qrOpen, setQrOpen] = useState(false);

  const detail = detailQ.data;
  const row = detail?.row;
  const logs = detail?.logs ?? [];

  const { refresh: refreshClientData, busy: refreshBusy } = useClientLavorazioniRefresh(detailQ);

  const ref = lavorazioneRefLabel(lavorazioneId, row?.codice);

  const resolvedStato = row ? resolveClientPortalStatoId(row.stato, statiOpts) : null;
  const statoLabel = resolvedStato ? statoLavorazioneLabel(resolvedStato, statiOpts) || resolvedStato : "—";
  const statoStyle = resolvedStato
    ? readablePillStyleFromHex(statoDisplayColor(resolvedStato, statiOpts))
    : undefined;

  const pageTitle = useMemo(() => {
    if (!row) return PORTALE_CLIENTI_LABEL;
    return clientTimelinePageTitle(buildClientTimelineHeader(row, schedeStore));
  }, [row, schedeStore]);

  const backToListButton = (
    <IconActionButton
      as="link"
      href={listPath}
      label={CLIENT_PORTAL_BACK_LABEL}
      onClick={goToClientList}
      toolbar
    >
      <IconBack />
    </IconActionButton>
  );

  if (access.isLoading) {
    return (
      <>
        <PageHeader title={PORTALE_CLIENTI_LABEL} leading={backToListButton} />
        <LoadingClientDetailSkeleton />
      </>
    );
  }

  if (!access.allowed) {
    return (
      <>
        <PageHeader title={PORTALE_CLIENTI_LABEL} leading={backToListButton} />
        <div className={`${dsStackPage} min-w-0 max-w-full`}>
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
        <PageHeader title={PORTALE_CLIENTI_LABEL} leading={backToListButton} />
        <LoadingClientDetailSkeleton />
      </>
    );
  }

  if (detailQ.isError || !row) {
    return (
      <>
        <PageHeader title={PORTALE_CLIENTI_LABEL} leading={backToListButton} />
        <div className={`${dsStackPage} min-w-0 max-w-full`}>
          <ShellCard>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {detailQ.error?.message ?? "La lavorazione richiesta non esiste o non è accessibile."}
            </p>
            <Link href={listPath} onClick={goToClientList} className={`mt-4 inline-flex ${dsBtnNeutral}`}>
              {CLIENT_PORTAL_BACK_LABEL}
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
        leading={backToListButton}
        actions={
          <div className={gestionalePageToolbarActionsClass}>
            <GestionaleRefreshToolbarButton
              busy={refreshBusy}
              onClick={() => void refreshClientData()}
            />
            <IconActionButton
              label="QR lavorazione"
              toolbar
              onClick={() => setQrOpen(true)}
            >
              <IconQrCode />
            </IconActionButton>
          </div>
        }
      />

      <div className={`${dsStackPage} min-w-0 max-w-full`}>
        <ShellCard>
          <HubModalPanoramicaPanel gapClass={dsGapXl}>
            <ClientLavorazioneTimelinePanel
              row={row}
              schedeStore={schedeStore}
              logs={logs}
              addettiGlobali={addettiGlobali}
              statoLabel={statoLabel}
              statoStyle={statoStyle}
            />
            <ClientLavorazioneInformazioniPanel
              row={row}
              schedeStore={schedeStore}
              logs={logs}
              addettiGlobali={addettiGlobali}
            />
            <ClientLavorazioneMediaPanel lavorazioneId={row.id} />
            <ClientLavorazioneDocumentsPanel lavorazioneId={row.id} embedded />
            <div className="border-t border-[color:var(--cab-border)] pt-[length:var(--ds-space-xl)]">
              <ClientLavorazioneAvanzamentoPanel logs={logs} statiOpts={statiOpts} row={row} />
            </div>
          </HubModalPanoramicaPanel>
        </ShellCard>
      </div>

      {qrOpen ? (
        <ClientLavorazioneQrDialog open onClose={() => setQrOpen(false)} lavorazioneId={row.id} refLabel={ref} />
      ) : null}
    </>
  );
}
