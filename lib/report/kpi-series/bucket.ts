import {
  endOfLocalDay,
  startOfLocalDay,
  startOfLocalWeekMonday,
  ymdFromDate,
  type DateRange,
} from "@/lib/report/date-ranges";
import type { KpiSeriesGranularity } from "@/lib/report/metrics/report-metric-types";

export const MAX_SERIES_POINTS = 500;

const MS_DAY = 86_400_000;

export function rangeDayCount(range: DateRange): number {
  const s = startOfLocalDay(range.start).getTime();
  const e = startOfLocalDay(range.end).getTime();
  return Math.max(0, Math.floor((e - s) / MS_DAY) + 1);
}

export function suggestBucketForRange(range: DateRange): KpiSeriesGranularity {
  const days = rangeDayCount(range);
  if (days <= 90) return "day";
  if (days <= 730) return "week";
  return "month";
}

export function downgradeBucket(bucket: KpiSeriesGranularity): KpiSeriesGranularity | null {
  if (bucket === "day") return "week";
  if (bucket === "week") return "month";
  return null;
}

function addLocalDays(d: Date, n: number): Date {
  return startOfLocalDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

/** Bucket start dates (ISO YYYY-MM-DD) covering `range`. */
export function enumerateBucketDates(range: DateRange, bucket: KpiSeriesGranularity): string[] {
  const start = startOfLocalDay(range.start);
  const end = startOfLocalDay(range.end);
  const out: string[] = [];

  if (bucket === "day") {
    for (let cur = start; cur <= end; cur = addLocalDays(cur, 1)) {
      out.push(ymdFromDate(cur));
    }
    return out;
  }

  if (bucket === "week") {
    let cur = startOfLocalWeekMonday(start);
    const endWeek = startOfLocalWeekMonday(end);
    while (cur <= endWeek) {
      out.push(ymdFromDate(cur));
      cur = addLocalDays(cur, 7);
    }
    return out;
  }

  let y = start.getFullYear();
  let m = start.getMonth();
  const endY = end.getFullYear();
  const endM = end.getMonth();
  while (y < endY || (y === endY && m <= endM)) {
    out.push(ymdFromDate(new Date(y, m, 1)));
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return out;
}

export function bucketDateRange(bucketStartYmd: string, bucket: KpiSeriesGranularity): DateRange {
  const d = startOfLocalDay(new Date(`${bucketStartYmd}T12:00:00`));
  if (bucket === "day") {
    return { start: startOfLocalDay(d), end: endOfLocalDay(d) };
  }
  if (bucket === "week") {
    const start = startOfLocalWeekMonday(d);
    const end = endOfLocalDay(addLocalDays(start, 6));
    return { start, end };
  }
  const start = startOfLocalDay(new Date(d.getFullYear(), d.getMonth(), 1));
  const end = endOfLocalDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  return { start, end };
}

export function resolveBucket(
  range: DateRange,
  requested?: KpiSeriesGranularity,
): { bucket: KpiSeriesGranularity; downgraded: boolean } {
  let bucket = requested ?? suggestBucketForRange(range);
  let downgraded = false;
  while (enumerateBucketDates(range, bucket).length > MAX_SERIES_POINTS) {
    const next = downgradeBucket(bucket);
    if (!next) break;
    bucket = next;
    downgraded = true;
  }
  return { bucket, downgraded };
}
