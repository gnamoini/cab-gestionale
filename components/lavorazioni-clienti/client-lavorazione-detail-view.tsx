"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useState, type MouseEvent } from "react";
import { PageHeader } from "@/components/gestionale/page-header";
import { PageActionMenu } from "@/components/ui";
import { MobileNavBackButton } from "@/components/gestionale/mobile-nav-open-button";
import { ShellCard } from "@/components/gestionale/shell-card";
import { IconQrCode } from "@/components/lavorazioni-clienti/client-lavorazioni-icons";
import { ClientLavorazioneInformazioniPanel } from "@/components/lavorazioni-clienti/client-lavorazione-informazioni-panel";
import { ClientLavorazioneMediaPanel } from "@/components/lavorazioni-clienti/client-lavorazione-media-panel";
import { ClientLavorazioneQrDialog } from "@/components/lavorazioni-clienti/client-lavorazione-qr-dialog";
import {
  ClientLavorazioneTimelinePanel,
  clientTimelinePageTitle,
  clientTimelinePageTitleCompact,
} from "@/components/lavorazioni-clienti/client-lavorazione-timeline-panel";
import { clientLavorazioniListPath, PORTALE_CLIENTI_LABEL } from "@/lib/lavorazioni/client-portal-access";
import { buildClientTimelineHeader } from "@/lib/lavorazioni/client-portal-timeline";
import {
  filterClientPortalStatiOptions,
  resolveClientPortalStatoId,
} from "@/lib/lavorazioni/client-portal-stati";
import { lavorazioneRefLabel } from "@/lib/lavorazioni/client-portal-ui";
import { HubModalPanoramicaPanel, IconActionButton, LoadingClientDetailSkeleton } from "@/components/design-system";
import { dsBtnNeutral, dsGapMd, dsGapXl, dsStackPage } from "@/lib/ui/design-system";
import { useClientLavorazioniAccess } from "@/src/hooks/use-client-lavorazioni-access";
import { useClientLavorazioneDetailQuery } from "@/src/hooks/gestionale/use-client-lavorazioni-queries";
import { useSchedeBundlesQuery } from "@/src/hooks/use-schede-store-query";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { statoLavorazioneLabel } from "@/src/shared/selectors";

const CLIENT_PORTAL_BACK_LABEL = `Torna a ${PORTALE_CLIENTI_LABEL}`;

const CLIENT_PORTAL_SECTION_TITLE_CLASS =
  "text-xs font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]";

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
  const { store: schedeStore } = useSchedeBundlesQuery(access.allowed, {
    viewLayer: true,
    lavorazioneIds: [lavorazioneId],
  });
  const addettiGlobali = globalOpts.lavorazioni.addetti;
  const addettiRecords = globalOpts.lavorazioni.addettiRecords;
  const [qrOpen, setQrOpen] = useState(false);

  const detail = detailQ.data;
  const row = detail?.row;

  const ref = lavorazioneRefLabel(lavorazioneId, row?.codice);

  const resolvedStato = row ? resolveClientPortalStatoId(row.stato, statiOpts) : null;
  const statoLabel = resolvedStato ? statoLavorazioneLabel(resolvedStato, statiOpts) || resolvedStato : "—";

  const { title: pageTitle, titleMobile: pageTitleMobile } = useMemo(() => {
    if (!row) return { title: PORTALE_CLIENTI_LABEL, titleMobile: undefined as string | undefined };
    const header = buildClientTimelineHeader(row, schedeStore);
    return {
      title: clientTimelinePageTitle(header),
      titleMobile: clientTimelinePageTitleCompact(header),
    };
  }, [row, schedeStore]);

  const backToListButton = (
    <MobileNavBackButton
      href={listPath}
      label={CLIENT_PORTAL_BACK_LABEL}
      onClick={goToClientList}
    />
  );

  if (!access.allowed) {
    return (
      <>
        <PageHeader title={PORTALE_CLIENTI_LABEL} leading={backToListButton} />
        <div className={`${dsStackPage} min-w-0 max-w-full`}>
          <ShellCard>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Non hai permesso per visualizzare questa lavorazione.</p>
            <Link href={listPath} onClick={goToClientList} className={`mt-4 inline-flex ${dsBtnNeutral}`}>
              {CLIENT_PORTAL_BACK_LABEL}
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
        titleMobile={pageTitleMobile}
        leading={backToListButton}
        mobileBack={{
          href: listPath,
          label: CLIENT_PORTAL_BACK_LABEL,
          onClick: goToClientList,
        }}
        actions={
          <PageActionMenu
            items={[
              {
                id: "qr",
                label: "QR lavorazione",
                description: "Mostra il codice QR della lavorazione",
                icon: <IconQrCode />,
                onSelect: () => setQrOpen(true),
              },
            ]}
            back={null}
          />
        }
      />

      <div className={`${dsStackPage} min-w-0 max-w-full`}>
        <ShellCard>
          <HubModalPanoramicaPanel gapClass={dsGapXl}>
            <ClientLavorazioneTimelinePanel
              row={row}
              schedeStore={schedeStore}
              addettiGlobali={addettiGlobali}
              statiOpts={statiOpts}
              statoId={resolvedStato ?? ""}
              statoLabel={statoLabel}
            />

            <section
              className={`flex min-w-0 flex-col ${dsGapMd} border-t border-[color:var(--cab-border)] pt-[length:var(--ds-space-xl)]`}
            >
              <h2 className={CLIENT_PORTAL_SECTION_TITLE_CLASS}>Dettaglio scheda ingresso</h2>
              <ClientLavorazioneInformazioniPanel
                row={row}
                schedeStore={schedeStore}
                addettiGlobali={addettiGlobali}
                addettiRecords={addettiRecords}
              />
            </section>

            <section
              className={`flex min-w-0 flex-col ${dsGapMd} border-t border-[color:var(--cab-border)] pt-[length:var(--ds-space-xl)]`}
            >
              <h2 className={CLIENT_PORTAL_SECTION_TITLE_CLASS}>Documentazione</h2>
              <ClientLavorazioneMediaPanel lavorazioneId={row.id} />
            </section>
          </HubModalPanoramicaPanel>
        </ShellCard>
      </div>

      {qrOpen ? (
        <ClientLavorazioneQrDialog open onClose={() => setQrOpen(false)} lavorazioneId={row.id} refLabel={ref} />
      ) : null}
    </>
  );
}
