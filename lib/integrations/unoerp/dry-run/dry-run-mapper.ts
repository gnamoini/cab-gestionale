import type { CabOwnedSnapshot } from "@/lib/integrations/unoerp/verification/payload-hash";

export function dryRunMapperLog(snapshot: CabOwnedSnapshot, payload: Record<string, unknown>): {
  snapshot: CabOwnedSnapshot;
  payload: Record<string, unknown>;
  write: false;
} {
  return { snapshot, payload, write: false };
}
