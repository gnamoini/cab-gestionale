"use client";

import "@/components/gestionale/lavorazioni/lavorazioni-scroll.css";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { PageHeaderPageActionMenu } from "@/components/gestionale/page-header-actions-portal";
import {
  PageActionMenuProvider,
  pageActionLogItem,
  usePageActionMenu,
  type PageActionItem,
} from "@/components/ui";
import { FatturazioneFattureSection } from "@/components/fatturazione/fatturazione-fatture-section";
import { FatturazioneHubNav } from "@/components/fatturazione/fatturazione-hub-nav";
import { FatturazioneKpiGrid } from "@/components/fatturazione/fatturazione-kpi-grid";
import { buildInvoiceKpi } from "@/lib/fatturazione/invoice-calculations";
import { parseFatturazioneTab } from "@/lib/fatturazione/fatturazione-sections-config";
import type { FatturazionePageFilters } from "@/lib/fatturazione/fatturazione-list-ui-filters";
import type { FatturazioneOrigine, InvoiceDetail } from "@/lib/fatturazione/types";
import { fetchFatturazioneOpenItemsClient } from "@/lib/fatturazione/fatturazione-open-items-fetch";
import { fetchFatturazionePaymentsClient } from "@/lib/fatturazione/fatturazione-payments-fetch";
import { invoicesEntry } from "@/lib/domain/invoices-entry";
import { useInvoicesQuery } from "@/src/hooks/gestionale/use-invoices-query";
import { usePreventiviRecordsQuery } from "@/src/hooks/gestionale/use-preventivi-records-query";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import {
  ddtListQueryKey,
  fatturazioneOpenItemsQueryKey,
  fatturazionePaymentsQueryKey,
} from "@/lib/render/query-key-factory";
import { ddtEntry } from "@/lib/domain/ddt-entry";
import { usePermissionsSnapshot } from "@/src/hooks/use-permissions";
import { GestionaleSectionGate } from "@/components/gestionale/gestionale-section-gate";
import {
  buildLogModificheDisplayEntries,
  logAutoreLabel,
} from "@/lib/gestionale-log/log-modifiche-view-model";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";
import { gestionaleListTierClass } from "@/lib/ui/gestionale-list-responsive";
import type { GestionaleListPageProps } from "@/lib/ui/gestionale-list-page-props";
import { useListSurface } from "@/lib/ui/use-list-surface";
import { dsStackPage } from "@/lib/ui/design-system";
import { useLogListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useGestionaleSyncScope } from "@/src/hooks/gestionale/use-gestionale-sync-scope";

const FatturazioneWizardModal = dynamic(
  () => import("@/components/fatturazione/fatturazione-wizard-modal").then((m) => m.FatturazioneWizardModal),
  { ssr: false },
);

const FatturazioneScadenziarioSection = dynamic(
  () =>
    import("@/components/fatturazione/fatturazione-scadenziario-section").then((m) => m.FatturazioneScadenziarioSection),
  { ssr: false },
);
const FatturazionePagamentiSection = dynamic(
  () => import("@/components/fatturazione/fatturazione-pagamenti-section").then((m) => m.FatturazionePagamentiSection),
  { ssr: false },
);
const FatturazioneNoteCreditoSection = dynamic(
  () =>
    import("@/components/fatturazione/fatturazione-note-credito-section").then((m) => m.FatturazioneNoteCreditoSection),
  { ssr: false },
);

const FatturazioneSdiSection = dynamic(
  () => import("@/components/fatturazione/sections/fatturazione-sdi-section").then((m) => m.FatturazioneSdiSection),
  { ssr: false },
);
const FatturazioneIvaSection = dynamic(
  () => import("@/components/fatturazione/sections/fatturazione-iva-section").then((m) => m.FatturazioneIvaSection),
  { ssr: false },
);
const FatturazioneReportSection = dynamic(
  () => import("@/components/fatturazione/sections/fatturazione-report-section").then((m) => m.FatturazioneReportSection),
  { ssr: false },
);
const FatturazioneContabilitaSection = dynamic(
  () =>
    import("@/components/fatturazione/sections/fatturazione-contabilita-section").then(
      (m) => m.FatturazioneContabilitaSection,
    ),
  { ssr: false },
);
const FatturazioneImpostazioniSection = dynamic(
  () =>
    import("@/components/fatturazione/sections/fatturazione-impostazioni-section").then(
      (m) => m.FatturazioneImpostazioniSection,
    ),
  { ssr: false },
);

const FatturazioneDetailDrawer = dynamic(
  () => import("@/components/fatturazione/fatturazione-detail-drawer").then((m) => m.FatturazioneDetailDrawer),
  { ssr: false },
);

const FatturaPaymentModal = dynamic(
  () => import("@/components/fatturazione/fattura-payment-modal").then((m) => m.FatturaPaymentModal),
  { ssr: false },
);

const FatturazioneLogDrawer = dynamic(
  () => import("@/components/fatturazione/fatturazione-log-drawer").then((m) => m.FatturazioneLogDrawer),
  { ssr: false },
);

function FatturazionePageMenuRegistrar({ items }: { items: PageActionItem[] }) {
  usePageActionMenu(items, { group: "fatturazione-base", deps: [items] });
  return null;
}

export function FatturazioneView({ listSurface: serverListSurface, listTier = "xl" }: GestionaleListPageProps) {
  useGestionaleSyncScope({
    scopeId: "fatturazione-view",
    domain: "report",
    route: "/fatturazione",
    tables: ["invoices", "invoice_payments", "ddt_documents", "log_modifiche"],
  });
  const listSurface = useListSurface(serverListSurface);
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const gestOpts = useGestionaleQueryOpts();
  const activeTab = parseFatturazioneTab(searchParams.get("tab"));
  const { user } = useAuth();
  const gestToast = useGestionaleToast();
  const authorName = user?.nome?.trim() || user?.email?.split("@")[0]?.trim() || "Operatore";
  const { modules: permModules } = usePermissionsSnapshot();
  const perms = permModules.fatturazione;
  const { invoices, links, customers, preventiviBilling, isInitialLoading, refetch } = useInvoicesQuery();

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardOrigine, setWizardOrigine] = useState<FatturazioneOrigine>("manuale");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<InvoiceDetail | null>(null);
  const [fattureFilterBoost, setFattureFilterBoost] = useState<Partial<FatturazionePageFilters> | null>(null);

  const preventiviQuery = usePreventiviRecordsQuery(wizardOpen);
  const needDdtList = wizardOpen;
  const ddtQuery = useServiceQuery(ddtListQueryKey(), () => ddtEntry.getList(), {
    ...gestOpts,
    enabled: needDdtList,
  });
  const logQuery = useLogListQuery({ entita: "invoices", limit: 100 }, { enabled: logOpen });

  const eligibleDdtDocuments = useMemo(
    () => (ddtQuery.data?.documents ?? []).filter((d) => d.status !== "annullato" && d.status !== "bozza"),
    [ddtQuery.data?.documents],
  );

  const kpi = useMemo(() => buildInvoiceKpi(invoices), [invoices]);

  const openDetail = useCallback(
    async (id: string) => {
      setDetailOpen(true);
      setDetail(null);
      const res = await invoicesEntry.getDetail(id);
      if (res.success && res.data) {
        setDetail(res.data);
        return;
      }
      setDetailOpen(false);
      gestToast.errorOnce("fattura-detail", res.error ?? "Fattura non trovata.");
    },
    [gestToast],
  );

  const fattOpenId = searchParams.get("fattOpen");
  const nuovoRequested = searchParams.get("nuovo") === "1";
  const canWriteFatturazione = perms.canWrite;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
    if (fattOpenId) void openDetail(fattOpenId);
  }, [fattOpenId, openDetail]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
    if (nuovoRequested && canWriteFatturazione) setWizardOpen(true);
  }, [nuovoRequested, canWriteFatturazione]);

  useEffect(() => {
    if (activeTab !== "scadenziario") return;
    const key = fatturazioneOpenItemsQueryKey();
    if (queryClient.getQueryData(key)) return;
    void queryClient.prefetchQuery({
      queryKey: key,
      queryFn: async () => {
        const res = await fetchFatturazioneOpenItemsClient();
        if (!res.success) throw new Error(res.error ?? "Errore caricamento scadenziario.");
        return res.data ?? [];
      },
      staleTime: gestOpts.staleTime,
    });
  }, [activeTab, gestOpts.staleTime, queryClient]);

  useEffect(() => {
    if (activeTab !== "pagamenti") return;
    const key = fatturazionePaymentsQueryKey();
    if (queryClient.getQueryData(key)) return;
    void queryClient.prefetchQuery({
      queryKey: key,
      queryFn: async () => {
        const res = await fetchFatturazionePaymentsClient();
        if (!res.success) throw new Error(res.error ?? "Errore caricamento pagamenti.");
        return res.data ?? [];
      },
      staleTime: gestOpts.staleTime,
    });
  }, [activeTab, gestOpts.staleTime, queryClient]);

  const logEntries = useMemo(
    () =>
      buildLogModificheDisplayEntries(logQuery.data ?? [], (row) =>
        logAutoreLabel(row, user?.id ?? null, authorName),
      ),
    [authorName, logQuery.data, user?.id],
  );

  const section = (() => {
    switch (activeTab) {
      case "scadenziario":
        return <FatturazioneScadenziarioSection onOpenInvoice={(id) => void openDetail(id)} />;
      case "pagamenti":
        return <FatturazionePagamentiSection canWrite={perms.canWrite} />;
      case "note_credito":
        return (
          <FatturazioneNoteCreditoSection
            invoices={invoices}
            isLoading={isInitialLoading}
            onOpenDetail={(id) => void openDetail(id)}
          />
        );
      case "sdi":
        return <FatturazioneSdiSection invoices={invoices} onOpenDetail={(id) => void openDetail(id)} />;
      case "iva":
        return <FatturazioneIvaSection invoices={invoices} />;
      case "report":
        return <FatturazioneReportSection invoices={invoices} preventiviBilling={preventiviBilling} />;
      case "contabilita":
        return <FatturazioneContabilitaSection />;
      case "impostazioni":
        return <FatturazioneImpostazioniSection canWrite={perms.canWrite} />;
      default:
        return (
          <FatturazioneFattureSection
            listSurface={listSurface}
            invoices={invoices}
            links={links}
            isLoading={isInitialLoading}
            canWrite={perms.canWrite}
            onOpenDetail={(id) => void openDetail(id)}
            onNewManuale={() => {
              setWizardOrigine("manuale");
              setWizardOpen(true);
            }}
            onNewPreventivo={() => {
              setWizardOrigine("preventivo");
              setWizardOpen(true);
            }}
            externalFilters={fattureFilterBoost ?? undefined}
          />
        );
    }
  })();

  const fatturazioneBaseMenuItems = useMemo(
    (): PageActionItem[] => [pageActionLogItem(() => setLogOpen(true), "Log attività")],
    [],
  );

  return (
    <GestionaleSectionGate module="fatturazione">
      <PageActionMenuProvider>
        <FatturazionePageMenuRegistrar items={fatturazioneBaseMenuItems} />
        <div className={`lavorazioni-scroll-scope ${layoutPageRoot} ${gestionaleListTierClass(listTier)}`.trim()}>
          <PageHeaderPageActionMenu />
          <div className={dsStackPage}>
            <FatturazioneKpiGrid
              kpi={kpi}
              onScaduteClick={() => {
                setFattureFilterBoost({ scadenzaPreset: "scadute" });
                const params = new URLSearchParams(searchParams.toString());
                params.delete("tab");
                const qs = params.toString();
                router.replace(qs ? `/fatturazione?${qs}` : "/fatturazione", { scroll: false });
              }}
              onDaIncassareClick={() => {
                setFattureFilterBoost({ status: "parzialmente_pagata" });
              }}
            />
            <FatturazioneHubNav activeTab={activeTab} />
            {section}
          </div>

          {detailOpen ? (
            <FatturazioneDetailDrawer
              detail={detail}
              open={detailOpen}
              onClose={() => setDetailOpen(false)}
              canWrite={perms.canWrite}
              onChanged={() => void refetch()}
              onRegisterPayment={() => setPaymentOpen(true)}
              onEditDraft={
                perms.canWrite
                  ? () => {
                      if (!detail) return;
                      setEditDraft(detail);
                      setWizardOpen(true);
                      setDetailOpen(false);
                    }
                  : undefined
              }
            />
          ) : null}

          {paymentOpen && detail ? (
            <FatturaPaymentModal
              invoice={detail.invoice}
              onRequestClose={() => setPaymentOpen(false)}
              onSaved={() => {
                void refetch();
                void openDetail(detail.invoice.id);
              }}
            />
          ) : null}

          {wizardOpen ? (
            <FatturazioneWizardModal
              onRequestClose={() => {
                setWizardOpen(false);
                setEditDraft(null);
              }}
              onSaved={() => void refetch()}
              preventiviRecords={preventiviQuery.records}
              preventiviBilling={preventiviBilling}
              billingCustomers={customers}
              eligibleDdtDocuments={eligibleDdtDocuments}
              initialOrigine={wizardOrigine}
              editDetail={editDraft}
            />
          ) : null}

          <FatturazioneLogDrawer
            open={logOpen}
            onClose={() => setLogOpen(false)}
            entries={logEntries}
            isLoading={logQuery.isLoading}
          />
        </div>
      </PageActionMenuProvider>
    </GestionaleSectionGate>
  );
}
