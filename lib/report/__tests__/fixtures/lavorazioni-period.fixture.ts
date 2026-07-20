export const FIXTURE_PERIOD = {
  start: "2026-06-01",
  end: "2026-06-30",
  preset: "custom" as const,
};

export const lavorazioniPeriodFixture = {
  period: FIXTURE_PERIOD,
  openedInPeriod: 128,
  completedInPeriod: 97,
  openedIds: ["lav-001", "lav-002"],
};
