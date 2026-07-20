export type OperationalPeriodType = "weekly" | "monthly" | "custom";

export type OperationalPeriodStatus = "open" | "closed" | "brief_generated";

export type OperationalPeriod = {
  id: string;
  type: OperationalPeriodType;
  startDate: string;
  endDate: string;
  previousPeriodId: string | null;
  label: string;
  status: OperationalPeriodStatus;
  generatedAt: string | null;
};
