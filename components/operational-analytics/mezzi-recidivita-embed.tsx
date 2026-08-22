"use client";

import { useMemo, useState } from "react";
import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import { useOperationalLavorazioniData } from "@/lib/report/operational-module/use-operational-lavorazioni-data";
import { buildReportSemanticIndex } from "@/lib/report/report-semantic-index";
import { buildReportRangeKey } from "@/lib/report/report-domain-types";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import { useSchedeBundlesQuery } from "@/src/hooks/use-schede-store-query";
import ReportRecidivitaMezziSectionView from "@/components/report/sections/report-recidivita-mezzi-section";

/** Embed recidività section on Mezzi — reuses legacy section SSOT. */
export function MezziRecidivitaEmbed() {
  const data = useOperationalLavorazioniData();
  const settingsQ = useCabAppSettingsPayloadQuery({ tier: "static" });
  const [histRev] = useState(0);

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
    sectionId: "recidivita_mezzi",
    fetchEnabled: true,
    range: data.range,
    compareRange: null,
    rangeKey: buildReportRangeKey(data.range, null),
    anchor: data.anchor,
    compareDetail: null,
    semanticIndex,
    derivedBundle: data.derivedBundle,
    attive: data.attive,
    storico: data.storico,
    completate: data.completate,
    manualEntries: [],
    prodotti: data.magazzino,
    histRev,
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

  return <ReportRecidivitaMezziSectionView {...domainProps} />;
}
