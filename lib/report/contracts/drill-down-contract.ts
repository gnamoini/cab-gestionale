export type DrillDownRef = {
  metricId: string;
  targetSection: string;
  targetTab?: string;
  filterPreset?: Record<string, string | number | boolean>;
};

export function assertValidDrillDownRef(ref: DrillDownRef): void {
  if (!ref.metricId?.trim()) {
    throw new Error("DrillDownRef.metricId required");
  }
  if (!ref.targetSection?.trim()) {
    throw new Error("DrillDownRef.targetSection required");
  }
}
