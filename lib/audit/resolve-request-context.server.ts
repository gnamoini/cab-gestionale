import "server-only";

import { headers } from "next/headers";
import {
  generateRequestId,
  resolveRequestId as resolveRequestIdBase,
  setRequestIdForContext,
} from "@/lib/audit/resolve-request-context";

const REQUEST_ID_HEADER = "x-request-id";

export { generateRequestId, setRequestIdForContext };

export async function getRequestIdFromHeaders(): Promise<string | null> {
  try {
    const h = await headers();
    const raw = h.get(REQUEST_ID_HEADER);
    if (raw && raw.trim()) return raw.trim();
  } catch {
    // headers() unavailable outside request context
  }
  return null;
}

export async function resolveRequestId(explicit?: string | null): Promise<string | null> {
  return (await resolveRequestIdBase(explicit)) ?? (await getRequestIdFromHeaders());
}
