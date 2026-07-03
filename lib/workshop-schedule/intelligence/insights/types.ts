export type PlannerInsight = {
  type: "inefficiency" | "overload" | "gap" | "optimization";
  severity: "low" | "medium" | "high";
  message: string;
  relatedWorkOrders?: string[];
  relatedDates?: string[];
};
