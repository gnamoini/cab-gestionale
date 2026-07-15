"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { ShellCard } from "@/components/gestionale/shell-card";
import { LoadingErrorState } from "@/components/design-system";
import { LoadingCardSkeleton } from "@/components/design-system";
import { useAuthUserId } from "@/context/auth-context";
import { useReportSectionVisibility } from "@/components/report/layout/report-section-visibility-context";
import {
  filterReportSectionsByPermission,
  REPORT_SECTIONS,
  type ReportSectionConfig,
  type ReportSectionId,
} from "@/components/report/report-sections-config";
import { REPORT_SECTION_UI } from "@/components/report/report-section-ui-config";
import { loadReportSection } from "@/components/report/report-section-loaders";
import type { DomainReportSectionProps, ReportAiSectionProps } from "@/components/report/report-section-types";
import { reportZoneShellClass } from "@/components/report/report-ui-tokens";
import { readSection } from "@/lib/ui/collapsible-prefs";
import { moduleAllows } from "@/src/lib/auth/effective-module-access";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";

function ReportSectionBody({
  section,
  lazyEnabled,
  mounted,
  domainProps,
  aiProps,
}: {
  section: ReportSectionConfig;
  lazyEnabled: boolean;
  mounted: boolean;
  domainProps: DomainReportSectionProps;
  aiProps: ReportAiSectionProps;
}) {
  const [loadState, setLoadState] = useState<
    | { status: "loading" }
    | { status: "loaded"; Component: ComponentType<DomainReportSectionProps | ReportAiSectionProps> }
    | { status: "error"; retry: () => void }
  >({ status: "loading" });

  const load = useCallback(() => {
    setLoadState({ status: "loading" });
    void loadReportSection(section.id).then((result) => {
      if (result.status === "loaded") {
        setLoadState({ status: "loaded", Component: result.component });
      } else {
        setLoadState({
          status: "error",
          retry: () => {
            result.retry();
            load();
          },
        });
      }
    });
  }, [section.id]);

  useEffect(() => {
    if (!mounted) return;
    load();
  }, [mounted, load]);

  if (!mounted) return null;

  if (loadState.status === "loading") {
    return <LoadingCardSkeleton minHeightClass="min-h-[10rem]" />;
  }

  if (loadState.status === "error") {
    return (
      <LoadingErrorState
        title="Impossibile caricare la sezione"
        description="Errore nel caricamento del modulo. Riprova."
        onRetry={loadState.retry}
      />
    );
  }

  const { Component } = loadState;
  if (section.id === "analisi_ai") {
    return <Component {...aiProps} />;
  }

  return (
    <Component
      {...domainProps}
      sectionId={section.id as Exclude<ReportSectionId, "analisi_ai">}
      fetchEnabled={lazyEnabled}
    />
  );
}

export function ReportSections({
  domainProps,
  aiProps,
}: {
  domainProps: DomainReportSectionProps;
  aiProps: ReportAiSectionProps;
}) {
  const { snapshot } = useEffectivePermissions();
  const modules = snapshot?.modules;

  const visibleSections = useMemo(() => {
    if (!modules) return [...REPORT_SECTIONS];
    return filterReportSectionsByPermission(REPORT_SECTIONS, (perm) =>
      moduleAllows(modules, perm as GestionalePermissionModule, "read"),
    );
  }, [modules]);

  return (
    <div className="min-w-0 space-y-4">
      {visibleSections.map((section) => (
        <ReportSectionShell
          key={section.id}
          section={section}
          domainProps={domainProps}
          aiProps={aiProps}
        />
      ))}
    </div>
  );
}

function ReportSectionShell({
  section,
  domainProps,
  aiProps,
}: {
  section: ReportSectionConfig;
  domainProps: DomainReportSectionProps;
  aiProps: ReportAiSectionProps;
}) {
  const ui = REPORT_SECTION_UI[section.id];
  const { setOpen } = useReportSectionVisibility();
  const userId = useAuthUserId();
  const didSyncPersistedRef = useRef(false);
  const [lazyEnabled, setLazyEnabled] = useState(!section.defaultCollapsed);
  const [mounted, setMounted] = useState(!section.defaultCollapsed);

  useEffect(() => {
    if (didSyncPersistedRef.current || !userId) return;
    didSyncPersistedRef.current = true;

    const collapsed = readSection(
      userId,
      "report",
      section.id,
      section.defaultCollapsed,
      (raw, fallback) => (typeof raw === "boolean" ? raw : fallback),
    );

    if (!collapsed) {
      setLazyEnabled(true);
      setMounted(true);
    } else if (ui.lazyMode === "unmount-on-close") {
      setMounted(false);
    }
  }, [section.defaultCollapsed, section.id, ui.lazyMode, userId]);

  const onCollapsedChange = useCallback(
    (collapsed: boolean) => {
      setOpen(section.id, !collapsed);
      if (!collapsed) {
        setLazyEnabled(true);
        setMounted(true);
      } else if (ui.lazyMode === "unmount-on-close") {
        setMounted(false);
      }
    },
    [section.id, setOpen, ui.lazyMode],
  );

  return (
    <ShellCard
      id={`report-section-${section.id}`}
      title={section.title}
      subtitle={section.subtitle}
      collapsible
      defaultCollapsed={section.defaultCollapsed}
      persistScope="report"
      persistKey={section.id}
      className={reportZoneShellClass}
      onCollapsedChange={onCollapsedChange}
    >
      <ReportSectionBody
        section={section}
        lazyEnabled={lazyEnabled}
        mounted={mounted}
        domainProps={domainProps}
        aiProps={aiProps}
      />
    </ShellCard>
  );
}
