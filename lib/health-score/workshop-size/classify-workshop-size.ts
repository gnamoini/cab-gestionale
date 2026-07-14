import type { InputSnapshot, WorkshopSize } from "@/lib/health-score/types";

const SIZE_ORDER: WorkshopSize[] = ["micro", "piccola", "media", "grande", "enterprise"];

export function classifyWorkshopSize(snapshot: InputSnapshot): WorkshopSize {
  const signals = [
    snapshot.backlog + snapshot.closed < 10 ? 0 : snapshot.backlog + snapshot.closed < 50 ? 1 : snapshot.backlog + snapshot.closed < 200 ? 2 : snapshot.backlog + snapshot.closed < 1000 ? 3 : 4,
    snapshot.dipendentiAttivi < 3 ? 0 : snapshot.dipendentiAttivi < 10 ? 1 : snapshot.dipendentiAttivi < 30 ? 2 : snapshot.dipendentiAttivi < 100 ? 3 : 4,
    snapshot.fatturato < 10000 ? 0 : snapshot.fatturato < 100000 ? 1 : snapshot.fatturato < 500000 ? 2 : snapshot.fatturato < 2000000 ? 3 : 4,
    snapshot.mezziCount < 5 ? 0 : snapshot.mezziCount < 20 ? 1 : snapshot.mezziCount < 50 ? 2 : snapshot.mezziCount < 200 ? 3 : 4,
  ];
  const avg = signals.reduce((s, v) => s + v, 0) / signals.length;
  const idx = Math.min(4, Math.max(0, Math.round(avg)));
  return SIZE_ORDER[idx]!;
}
