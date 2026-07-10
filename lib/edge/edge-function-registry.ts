import type { EdgeEligibility, EdgeHandlerId, EdgeRouteGroup } from "@/lib/edge/edge-types";
import { NON_EDGE_PREFIXES } from "@/lib/decision/request-decision-registry";

export type EdgeRouteMatch = {
  handlerId: EdgeHandlerId;
  group: EdgeRouteGroup;
  eligibility: EdgeEligibility;
  /** Human-readable pattern for docs/audit. */
  pattern: string;
};

const DOCUMENT_ID_RE = /^\/api\/documents\/([^/]+)$/;

export function isNonEdgeApiPath(pathname: string): boolean {
  return NON_EDGE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function matchEdgeRoute(pathname: string, method: string): EdgeRouteMatch | null {
  if (!pathname.startsWith("/api/")) return null;
  if (isNonEdgeApiPath(pathname)) return null;

  if (method === "POST" && pathname === "/api/documents/upload-policy") {
    return {
      handlerId: "upload-policy-precheck-edge",
      group: "upload",
      eligibility: "EDGE_SAFE",
      pattern: "POST /api/documents/upload-policy",
    };
  }

  if (method === "GET" && pathname === "/api/media/image") {
    return {
      handlerId: "media-cache-edge",
      group: "media",
      eligibility: "EDGE_SAFE",
      pattern: "GET /api/media/image",
    };
  }

  if (method === "GET") {
    if (pathname.endsWith("/preview")) {
      const base = pathname.slice(0, -"/preview".length);
      const m = base.match(DOCUMENT_ID_RE);
      if (m) {
        return {
          handlerId: "document-route-edge",
          group: "documents",
          eligibility: "EDGE_SAFE",
          pattern: "GET /api/documents/:id/preview",
        };
      }
    }
    const m = pathname.match(DOCUMENT_ID_RE);
    if (m) {
      return {
        handlerId: "document-route-edge",
        group: "documents",
        eligibility: "EDGE_SAFE",
        pattern: "GET /api/documents/:id",
      };
    }
  }

  return null;
}

/** Auth precheck applies to all /api/* not in NON_EDGE list. */
export function matchAuthPrecheckRoute(pathname: string): EdgeRouteMatch | null {
  if (!pathname.startsWith("/api/")) return null;
  if (isNonEdgeApiPath(pathname)) return null;
  return {
    handlerId: "auth-precheck-edge",
    group: "auth",
    eligibility: "EDGE_SAFE",
    pattern: "/api/* auth precheck",
  };
}

export function extractDocumentIdFromPath(pathname: string): string | null {
  if (pathname.endsWith("/preview")) {
    const base = pathname.slice(0, -"/preview".length);
    const m = base.match(DOCUMENT_ID_RE);
    return m?.[1]?.trim() || null;
  }
  const m = pathname.match(DOCUMENT_ID_RE);
  return m?.[1]?.trim() || null;
}
