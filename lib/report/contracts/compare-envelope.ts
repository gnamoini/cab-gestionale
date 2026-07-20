export type CompareEnvelope = {
  previousValue: number;
  deltaAbs: number | null;
  deltaPercent: number | null;
  compareLabel?: string;
};
