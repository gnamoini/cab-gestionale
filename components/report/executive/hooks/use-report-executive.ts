"use client";

import { useEffect, useState } from "react";
import type { DateRange, ReportCompareMode } from "@/lib/report/date-ranges";
import type { ReportPayload } from "@/lib/report/contracts/report-payload";
import type { ExecutiveCardDto, ExecutivePayloadData } from "@/lib/report/executive/types";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mapCompareMode(mode: ReportCompareMode): string {
  if (mode === "prev_period" || mode === "prev_year" || mode === "none") return mode;
  return "none";
}

function buildExecutiveUrl(range: DateRange, compareMode: ReportCompareMode): string {
  const params = new URLSearchParams({
    preset: "custom",
    from: ymd(range.start),
    to: ymd(range.end),
    compareMode: mapCompareMode(compareMode),
  });
  return `/api/report/executive?${params.toString()}`;
}

export type UseReportExecutiveResult = {
  cards: ExecutiveCardDto[] | null;
  loading: boolean;
  error: string | null;
};

export function useReportExecutive(
  range: DateRange | null,
  compareMode: ReportCompareMode,
): UseReportExecutiveResult {
  const [cards, setCards] = useState<ExecutiveCardDto[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!range) {
      setCards(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetch(buildExecutiveUrl(range, compareMode), {
          signal: controller.signal,
          credentials: "same-origin",
        });
        if (res.status === 404) {
          setCards(null);
          setError(null);
          return;
        }
        if (!res.ok) {
          setError(res.status === 403 ? "Permesso negato" : `Errore ${res.status}`);
          setCards(null);
          return;
        }
        const payload = (await res.json()) as ReportPayload<ExecutivePayloadData>;
        setCards(payload.data.cards);
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Caricamento non riuscito");
        setCards(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [range?.start.getTime(), range?.end.getTime(), compareMode]);

  return { cards, loading, error };
}
