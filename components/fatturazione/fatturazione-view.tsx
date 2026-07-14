"use client";

import "@/components/gestionale/lavorazioni/lavorazioni-scroll.css";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { PageHeader } from "@/components/gestionale/page-header";
import { GestionalePageToolbarActions } from "@/components/gestionale/page-header-toolbar";
import { FatturazioneDetailDrawer } from "@/components/fatturazione/fatturazione-detail-drawer";
import { FatturaPaymentModal } from "@/components/fatturazione/fattura-payment-modal";
import { FatturazioneFattureSection } from "@/components/fatturazione/fatturazione-fatture-section";
import { FatturazioneHubNav } from "@/components/fatturazione/fatturazione-hub-nav";
import { FatturazioneKpiGrid } from "@/components/fatturazione/fatturazione-kpi-grid";
import { FatturazioneNoteCreditoSection } from "@/components/fatturazione/fatturazione-note-credito-section";
import { FatturazionePagamentiSection } from "@/components/fatturazione/fatturazione-pagamenti-section";
import { FatturazioneScadenziarioSection } from "@/components/fatturazione/fatturazione-scadenziario-section";
import { buildInvoiceKpi } from "@/lib/fatturazione/invoice-calculations";
import { parseFatturazioneTab } from "@/lib/fatturazione/fatturazione-sections-config";
import type { FatturazionePageFilters } from "@/lib/fatturazione/fatturazione-list-ui-filters";
import type { FatturazioneOrigine, InvoiceDetail } from "@/lib/fatturazione/types";
import { invoicesEntry } from "@/lib/domain/invoices-entry";
import { useInvoicesQuery } from "@/src/hooks/gestionale/use-invoices-query";
import { usePreventiviRecordsQuery } from "@/src/hooks/gestionale/use-preventivi-records-query";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { ddtListQueryKey } from "@/lib/render/query-key-factory";
import { ddtEntry } from "@/lib/domain/ddt-entry";
import { usePermissionsSnapshot } from "@/src/hooks/use-permissions";
import { GestionaleSectionGate } from "@/components/gestionale/gestionale-section-gate";
import { Drawer } from "@/components/design-system";
import {
  buildLogModificheDisplayEntries,
  logAutoreLabel,
} from "@/lib/gestionale-log/log-modifiche-view-model";
import {
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
  gestionaleLogDrawerPanelClass,
  gestionaleLogScrollEmbeddedClass,
} from "@/components/gestionale/gestionale-log-ui";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";
import { useGestionaleListLayout } from "@/lib/ui/use-gestionale-list-layout";
import { dsStackPage } from "@/lib/ui/design-system";
import { useLogListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";

const FatturazioneWizardModal = dynamic(
  () => import("@/components/fatturazione/fatturazione-wizard-modal").then((m) => m.FatturazioneWizardModal),
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

export function FatturazioneView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = parseFatturazioneTab(searchParams.get("tab"));
  const { user } = useAuth();
  const authorName = user?.nome?.trim() || user?.email?.split("@")[0]?.trim() || "Operatore";
  const { modules: permModules } = usePermissionsSnapshot();
  const perms = permModules.fatturazione;
  const { containerRef, layoutClassName } = useGestionaleListLayout();
  const { invoices, links, customers, preventiviBilling, isLoading, refetch } = useInvoicesQuery();
  const preventiviQuery = usePreventiviRecordsQuery();
  const gestOpts = useGestionaleQueryOpts();
  const ddtQuery = useServiceQuery(ddtListQueryKey(), () => ddtEntry.getList(), gestOpts);
  const eligibleDdtDocuments = useMemo(
    () => (ddtQuery.data?.documents ?? []).filter((d) => d.status !== "annullato" && d.status !== "bozza"),
    [ddtQuery.data?.documents],
  );
  const logQuery = useLogListQuery({ entita: "invoices", limit: 100 });

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardOrigine, setWizardOrigine] = useState<FatturazioneOrigine>("manuale");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<InvoiceDetail | null>(null);
  const [fattureFilterBoost, setFattureFilterBoost] = useState<Partial<FatturazionePageFilters> | null>(null);

  const kpi = useMemo(() => buildInvoiceKpi(invoices), [invoices]);

  const openDetail = useCallback(async (id: string) => {
    const res = await invoicesEntry.getDetail(id);
    if (res.success && res.data) {
      setDetail(res.data);
      setDetailOpen(true);
    }
  }, []);

  const fattOpenId = searchParams.get("fattOpen");
  const nuovoRequested = searchParams.get("nuovo") === "1";
  const canWriteFatturazione = perms.canWrite;

  useEffect(() => {
    if (fattOpenId) void openDetail(fattOpenId);
  }, [fattOpenId, openDetail]);

  useEffect(() => {
    if (nuovoRequested && canWriteFatturazione) setWizardOpen(true);
  }, [nuovoRequested, canWriteFatturazione]);

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
            isLoading={isLoading}
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
            invoices={invoices}
            links={links}
            isLoading={isLoading}
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

  return (
    <GestionaleSectionGate module="fatturazione">
      <div ref={containerRef} className={`lavorazioni-scroll-scope ${layoutPageRoot} ${layoutClassName}`}>
        <PageHeader
          title="Fatturazione"
          actions={
            <GestionalePageToolbarActions
              canUndo={false}
              onOpenLog={() => setLogOpen(true)}
              logTitle="Log fatturazione"
            />
          }
        />
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

        <Drawer open={logOpen} onClose={() => setLogOpen(false)} title="Log fatturazione" ariaLabel="Log fatturazione">
          <div className={gestionaleLogDrawerPanelClass}>
            <div className={gestionaleLogScrollEmbeddedClass}>
              {logQuery.isLoading ? (
                <p className="p-4 text-sm text-[color:var(--cab-text-muted)]">Caricamento…</p>
              ) : logEntries.length === 0 ? (
                <GestionaleLogEmpty message="Nessuna voce di log." />
              ) : (
                <GestionaleLogList>
                  {logEntries.map((entry) => (
                    <li key={entry.id} className="list-none">
                      <GestionaleLogEntryFourLines vm={entry.vm} />
                    </li>
                  ))}
                </GestionaleLogList>
              )}
            </div>
          </div>
        </Drawer>
      </div>
    </GestionaleSectionGate>
  );
}
