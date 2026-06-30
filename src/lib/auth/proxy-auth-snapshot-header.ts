import "server-only";

import { headers } from "next/headers";
import type { ServerAuthSnapshot } from "@/src/lib/auth/server-auth-types";

/** Header interno proxy→RSC: evita doppio fetch auth edge+node sulla stessa request. */
export const CAB_AUTH_SNAPSHOT_HEADER = "x-cab-auth-snapshot";

export function encodeServerAuthSnapshotHeader(snapshot: ServerAuthSnapshot): string {
  return Buffer.from(JSON.stringify(snapshot), "utf8").toString("base64url");
}

export function decodeServerAuthSnapshotHeader(encoded: string): ServerAuthSnapshot | null {
  try {
    const raw = Buffer.from(encoded, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as ServerAuthSnapshot;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Legge snapshot inoltrato dal proxy (se presente e valido). */
export async function readProxyForwardedAuthSnapshot(): Promise<ServerAuthSnapshot | null> {
  const h = await headers();
  const encoded = h.get(CAB_AUTH_SNAPSHOT_HEADER);
  if (!encoded) return null;
  return decodeServerAuthSnapshotHeader(encoded);
}
