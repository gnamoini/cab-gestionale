import { createHash } from "node:crypto";
import type { InputSnapshot } from "@/lib/health-score/types";

export function hashInputSnapshot(snapshot: InputSnapshot): string {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex").slice(0, 16);
}

/** Assert deterministic ordering for registry iteration. */
export function assertDeterministicOrder<T extends { id: string }>(items: T[]): T[] {
  const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id));
  for (let i = 0; i < items.length; i++) {
    if (items[i]!.id !== sorted[i]!.id) {
      throw new Error("Registry iteration order is not deterministic");
    }
  }
  return sorted;
}
