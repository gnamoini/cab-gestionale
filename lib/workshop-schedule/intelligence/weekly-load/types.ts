export type WeeklyLoadSnapshot = {
  weekRange: string;
  totalPlannedHours: number;
  dailyBreakdown: {
    date: string;
    loadPct: number;
  }[];
  bottlenecks: string[];
};
