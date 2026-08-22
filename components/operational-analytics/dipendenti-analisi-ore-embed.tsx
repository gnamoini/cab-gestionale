"use client";

import { useMemo } from "react";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import { useOperationalLavorazioniData } from "@/lib/report/operational-module/use-operational-lavorazioni-data";
import { buildReportSemanticIndex } from "@/lib/report/report-semantic-index";
import { buildReportRangeKey } from "@/lib/report/report-domain-types";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import { useSchedeBundlesQuery } from "@/src/hooks/use-schede-store-query";
import ReportAnalisiOreOfficinaSectionView from "@/components/report/sections/report-analisi-ore-officina-section";

/** Analisi ore officina on Dipendenti — functional owner confirmed in P9 ownership SSOT. */
export function DipendentiAnalisiOreEmbed({ monthKey }: { monthKey: string }) {
  const data = useOperationalLavorazioniData();
  const settingsQ = useCabAppSettingsPayloadQuery({ tier: "static" });

  const range = useMemo(() => {
    const [y, m] = monthKey.split("-").map(Number);
    const start = new Date(y!, m! - 1, 1, 12, 0, 0, 0);
    const end = new Date(y!, m!, 0, 12, 0, 0, 0);
    return { start, end };
  }, [monthKey]);

  const lavIds = useMemo(() => data.completate.map((c) => c.id), [data.completate]);
  const schedeQ = useSchedeBundlesQuery(!data.isLoading, { lavorazioneIds: lavIds });

  const costoOrario = useMemo(() => {
    const v = settingsQ.data?.resolved?.preventiviDefaults?.costoOrarioDefault;
    return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 48;
  }, [settingsQ.data]);

  const semanticIndex = useMemo(
    () =>
      buildReportSemanticIndex({
        completate: data.completate,
        manualByMonth: data.manualByMonth,
        mezzi: data.mezzi,
      }),
    [data.completate, data.manualByMonth, data.mezzi],
  );

  const magazzinoRows = useMemo(
    () =>
      data.magazzino.map((p) => ({
        id: p.id,
        costo: p.prezzoFornitoreOriginale,
      })) as DomainReportSectionProps["magazzinoRows"],
    [data.magazzino],
  );

  const domainProps: DomainReportSectionProps = {
    sectionId: "analisi_ore_officina",
    fetchEnabled: true,
    range,
    compareRange: null,
    rangeKey: buildReportRangeKey(range, null),
    anchor: data.anchor,
    compareDetail: null,
    semanticIndex,
    derivedBundle: data.derivedBundle,
    attive: data.attive,
    storico: data.storico,
    completate: data.completate,
    manualEntries: [],
    prodotti: data.magazzino,
    histRev: 0,
    onHistRev: () => {},
    topsMezzi: [],
    topsClienti: [],
    topsRicambi: [],
    showCompare: false,
    manualByMonth: data.manualByMonth,
    lavListRows: data.lavListRows,
    magLog: data.magLog,
    magazzinoRows,
    costoOrario,
    schedeStore: schedeQ.store ?? null,
    schedeLoaded: !schedeQ.isLoading,
    analyticsContext: {
      perf: null,
      perfLoading: false,
      partitioned: { lavorazioni: [], fleet: [], magazzino: [], economic: [] },
      compareMode: "none",
    },
  };

  return <ReportAnalisiOreOfficinaSectionView {...domainProps} />;
}
