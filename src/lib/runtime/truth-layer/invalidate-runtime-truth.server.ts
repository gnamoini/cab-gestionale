import "server-only";

import { revalidatePath } from "next/cache";
import { clearServerAuthSnapshotCache } from "@/src/lib/auth/server-session-cache";

/** Invalida snapshot auth server + layout RSC dopo mutazioni permessi/ruolo/pilot. */
export function invalidateServerRuntimeTruth(): void {
  clearServerAuthSnapshotCache();
  revalidatePath("/", "layout");
}
