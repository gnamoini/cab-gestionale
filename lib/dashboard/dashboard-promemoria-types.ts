/** Riga `dashboard_promemoria`. */
export type DashboardPromemoriaRow = {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  event_date: string;
  /** `HH:MM:SS` da Postgres; null = notifica alle 09:00. */
  event_time: string | null;
  title: string;
  description: string | null;
  deleted_at: string | null;
  notified_on: string | null;
  entity_type: string | null;
  entity_id: string | null;
};

export type DashboardPromemoriaInput = {
  eventDate: string;
  eventTime?: string | null;
  title: string;
  description?: string | null;
};

export type DashboardPromemoriaUpdateInput = DashboardPromemoriaInput & {
  id: string;
};

/** Chiave mese `YYYY-MM` per query e cache. */
export type DashboardPromemoriaMonthKey = `${number}-${string}`;

export function monthKeyFromParts(year: number, month1: number): DashboardPromemoriaMonthKey {
  return `${year}-${String(month1).padStart(2, "0")}` as DashboardPromemoriaMonthKey;
}

export function parseMonthKey(key: DashboardPromemoriaMonthKey): { year: number; month: number } {
  const [y, m] = key.split("-");
  return { year: Number(y), month: Number(m) };
}

export function monthDateRange(key: DashboardPromemoriaMonthKey): { from: string; to: string } {
  const { year, month } = parseMonthKey(key);
  const lastDay = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, "0");
  return {
    from: `${year}-${mm}-01`,
    to: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}
