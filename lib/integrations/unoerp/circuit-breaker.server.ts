import { isUnoerpSyncHardStop } from "@/lib/env/unoerp.server";

export function assertWritesAllowed(): void {
  if (isUnoerpSyncHardStop()) {
    throw new Error("UNOERP_SYNC_HARD_STOP");
  }
}
