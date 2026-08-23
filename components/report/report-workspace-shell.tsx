"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useUIAutonomyFixEngine } from "@/lib/ui-autonomy-fix/use-ui-autonomy-fix-engine";
import { ReportPeriodContextProvider } from "@/components/report/context/report-period-context";
import { buildReportRangeKey } from "@/lib/report/report-domain-types";
import {
  endOfLocalDay,
  resolvePresetRange,
  resolveReportCompareRange,
  startOfLocalDay,
  type ReportCompareMode,
  type ReportPeriodPreset,
} from "@/lib/report/date-ranges";
import type { DateRange } from "@/lib/report/date-ranges";
import { saveReportPeriodPrefs } from "@/lib/report/report-period-persistence";
import { readInitialReportPeriodPrefs } from "@/lib/report/report-period-init";
import { mergeReportPeriodIntoPath } from "@/lib/report/report-period-url-sync";
import { resolveLegacyReportAnchor } from "@/lib/report/report-hub-areas-config";
import { dsStackPage } from "@/lib/ui/design-system";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";

function fmtYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDaysLocal(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12, 0, 0, 0);
}

function useStableDateRange(range: DateRange | null | undefined): DateRange | null {
  const startMs = range?.start.getTime();
  const endMs = range?.end.getTime();
  return useMemo(() => {
    if (startMs == null || endMs == null) return null;
    return { start: new Date(startMs), end: new Date(endMs) };
  }, [startMs, endMs]);
}

/** Light shell: period context + legacy anchor redirect only. No BI data loading. */
export function ReportWorkspaceShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const anchor = useMemo(() => new Date(), []);
  const [initialPrefs] = useState(() => readInitialReportPeriodPrefs(searchParams));
  const [preset, setPreset] = useState<ReportPeriodPreset>(initialPrefs.preset);
  const [customFrom, setCustomFrom] = useState(initialPrefs.customFrom);
  const [customTo, setCustomTo] = useState(initialPrefs.customTo);
  const [compareMode, setCompareMode] = useState<ReportCompareMode>(initialPrefs.compareMode);
  const [compareCustomFrom, setCompareCustomFrom] = useState(initialPrefs.compareCustomFrom);
  const [compareCustomTo, setCompareCustomTo] = useState(initialPrefs.compareCustomTo);

  useUIAutonomyFixEngine("/report", [preset, compareMode]);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const target = resolveLegacyReportAnchor(hash);
    if (target) {
      router.replace(target);
    }
  }, [router]);

  useEffect(() => {
    saveReportPeriodPrefs({
      preset,
      compareMode,
      customFrom,
      customTo,
      compareCustomFrom,
      compareCustomTo,
    });
  }, [preset, compareMode, customFrom, customTo, compareCustomFrom, compareCustomTo]);

  const onCompareMode = useCallback((m: ReportCompareMode) => {
    setCompareMode(m);
    if (m !== "custom_range") {
      setCompareCustomFrom("");
      setCompareCustomTo("");
    }
  }, []);

  const onPreset = useCallback(
    (p: ReportPeriodPreset) => {
      setPreset(p);
      if (p === "custom" && anchor && !customFrom.trim() && !customTo.trim()) {
        const end = endOfLocalDay(anchor);
        const start = startOfLocalDay(addDaysLocal(end, -30));
        setCustomFrom(fmtYmd(start));
        setCustomTo(fmtYmd(end));
      }
    },
    [anchor, customFrom, customTo],
  );

  const filterRange = useStableDateRange(
    useMemo(
      () =>
        resolvePresetRange(
          anchor,
          preset,
          preset === "custom" ? customFrom : undefined,
          preset === "custom" ? customTo : undefined,
        ),
      [anchor, preset, customFrom, customTo],
    ),
  );

  const compareRange = useMemo(() => {
    if (!filterRange || compareMode === "none") return null;
    return resolveReportCompareRange(
      filterRange,
      compareMode,
      compareMode === "custom_range" ? compareCustomFrom : undefined,
      compareMode === "custom_range" ? compareCustomTo : undefined,
    );
  }, [filterRange, compareMode, compareCustomFrom, compareCustomTo]);

  const rangeKey = useMemo(
    () => (filterRange ? buildReportRangeKey(filterRange, compareRange) : ""),
    [filterRange, compareRange],
  );

  const periodContextValue = useMemo(() => {
    if (!filterRange) {
      return null;
    }
    return {
      anchor,
      preset,
      customFrom,
      customTo,
      compareMode,
      compareCustomFrom,
      compareCustomTo,
      range: filterRange,
      compareRange,
      rangeKey,
      showCompare: Boolean(compareRange),
      setPreset: onPreset,
      setCustomFrom,
      setCustomTo,
      setCompareMode: onCompareMode,
      setCompareCustomFrom,
      setCompareCustomTo,
    };
  }, [
    anchor,
    preset,
    customFrom,
    customTo,
    compareMode,
    compareCustomFrom,
    compareCustomTo,
    filterRange,
    compareRange,
    rangeKey,
    onPreset,
    onCompareMode,
  ]);

  useEffect(() => {
    if (!periodContextValue || pathname === "/report") return;
    const next = mergeReportPeriodIntoPath(pathname, {
      preset: periodContextValue.preset,
      compareMode: periodContextValue.compareMode,
      customFrom: periodContextValue.customFrom,
      customTo: periodContextValue.customTo,
    });
    const current = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    if (next !== current) {
      router.replace(next, { scroll: false });
    }
  }, [periodContextValue, pathname, router, searchParams]);

  if (!periodContextValue) {
    return null;
  }

  return (
    <div className={`${dsStackPage} ${layoutPageRoot} min-w-0 max-w-full`}>
      <ReportPeriodContextProvider value={periodContextValue}>{children}</ReportPeriodContextProvider>
    </div>
  );
}
