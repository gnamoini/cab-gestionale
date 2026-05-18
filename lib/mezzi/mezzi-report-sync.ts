import type { MezzoGestito } from "@/lib/mezzi/types";

let snapshot: MezzoGestito[] = [];
const listeners = new Set<() => void>();

export function setMezziReportSnapshot(next: MezzoGestito[]): void {
  snapshot = next.map((m) => ({ ...m }));
  listeners.forEach((fn) => fn());
}

export function getMezziReportSnapshot(): MezzoGestito[] {
  return snapshot.map((m) => ({ ...m }));
}

export function subscribeMezziReportSync(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}
