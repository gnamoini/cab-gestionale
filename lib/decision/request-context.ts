import type { NextRequest } from "next/server";

export type RuntimeSource = "edge" | "server" | "client";

export type OperationType = "read" | "write" | "upload" | "download";

export type SanitizedHeaders = {
  accept?: string;
  correlationId?: string;
  edgeDeliveryRoute?: string;
  edgeCachePolicy?: string;
};

export type RequestContextFlags = {
  isPreviewPath?: boolean;
  hasAuthCookie?: boolean;
  jwtExpSeconds?: number | null;
  normalizedStoragePath?: string;
};

export type RequestContext = {
  route: string;
  method: string;
  entityType?: string;
  entityId?: string;
  userRole?: string | null;
  headers: SanitizedHeaders;
  operationType: OperationType;
  runtimeSource: RuntimeSource;
  query: Record<string, string | undefined>;
  flags?: RequestContextFlags;
};

export type RequestContextExtras = {
  userRole?: string | null;
  flags?: RequestContextFlags;
};

const AUTH_COOKIE_SUFFIX = "-auth-token";

function queryRecordFromSearchParams(searchParams: URLSearchParams): Record<string, string | undefined> {
  const query: Record<string, string | undefined> = {};
  for (const [key, value] of searchParams.entries()) {
    query[key] = value;
  }
  return query;
}

function inferOperationType(method: string, pathname: string): OperationType {
  if (method === "POST" && pathname === "/api/documents/upload-policy") return "upload";
  if (method !== "GET") return "write";
  const mode = new URL(`http://x${pathname}`).searchParams.get("mode");
  void mode;
  return "read";
}

function inferEntityFromRoute(pathname: string, query: Record<string, string | undefined>): {
  entityType?: string;
  entityId?: string;
} {
  if (pathname === "/api/media/image") {
    return { entityType: "image", entityId: query.path };
  }
  if (pathname === "/api/documents/upload-policy") {
    return { entityType: query.source === "lavorazione" ? "lavorazione" : "documento" };
  }
  const docMatch = pathname.match(/^\/api\/documents\/([^/]+)/);
  if (docMatch) {
    return {
      entityType: query.source === "lavorazione" ? "lavorazione" : "documento",
      entityId: docMatch[1],
    };
  }
  return {};
}

export function decodeJwtExpSeconds(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export function extractAccessTokenFromAuthCookieValue(value: string): string | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed) && typeof parsed[0] === "string") return parsed[0];
    if (parsed && typeof parsed === "object" && "access_token" in parsed) {
      const t = (parsed as { access_token?: unknown }).access_token;
      return typeof t === "string" ? t : null;
    }
  } catch {
    try {
      const decoded = atob(value);
      const parsed: unknown = JSON.parse(decoded);
      if (Array.isArray(parsed) && typeof parsed[0] === "string") return parsed[0];
      if (parsed && typeof parsed === "object" && "access_token" in parsed) {
        const t = (parsed as { access_token?: unknown }).access_token;
        return typeof t === "string" ? t : null;
      }
    } catch {
      return null;
    }
  }
  return null;
}

export function jwtExpFromCookies(cookies: ReadonlyArray<{ name: string; value: string }>): {
  hasAuthCookie: boolean;
  jwtExpSeconds: number | null;
} {
  const authCookie = cookies.find((c) => c.name.includes(AUTH_COOKIE_SUFFIX));
  if (!authCookie?.value) return { hasAuthCookie: false, jwtExpSeconds: null };
  const token = extractAccessTokenFromAuthCookieValue(authCookie.value);
  if (!token) return { hasAuthCookie: true, jwtExpSeconds: null };
  return { hasAuthCookie: true, jwtExpSeconds: decodeJwtExpSeconds(token) };
}

/** ponytail: fixed 60s slack — upgrade path: env-tunable slack for staging. */
export function isJwtFreshForProxyCache(jwtExpSeconds: number | null, slackSec = 60): boolean {
  if (jwtExpSeconds == null) return false;
  return jwtExpSeconds - Math.floor(Date.now() / 1000) >= slackSec;
}

export function buildRequestContextFromUrl(
  url: string | URL,
  method: string,
  runtimeSource: RuntimeSource,
  extras?: RequestContextExtras,
): RequestContext {
  const u = typeof url === "string" ? new URL(url, "http://localhost") : url;
  const query = queryRecordFromSearchParams(u.searchParams);
  const entity = inferEntityFromRoute(u.pathname, query);
  const operationType =
    query.mode === "download" ? "download" : inferOperationType(method, u.pathname);

  return {
    route: u.pathname,
    method: method.toUpperCase(),
    entityType: entity.entityType,
    entityId: entity.entityId,
    userRole: extras?.userRole ?? null,
    headers: {},
    operationType,
    runtimeSource,
    query,
    flags: {
      isPreviewPath: u.pathname.endsWith("/preview"),
      ...extras?.flags,
    },
  };
}

export function buildRequestContextFromEdge(request: NextRequest, extras?: RequestContextExtras): RequestContext {
  const auth = jwtExpFromCookies(request.cookies.getAll());
  const ctx = buildRequestContextFromUrl(request.nextUrl, request.method, "edge", {
    ...extras,
    flags: {
      ...extras?.flags,
      hasAuthCookie: auth.hasAuthCookie,
      jwtExpSeconds: auth.jwtExpSeconds,
      isPreviewPath: request.nextUrl.pathname.endsWith("/preview"),
    },
  });
  ctx.headers = {
    accept: request.headers.get("accept") ?? undefined,
    correlationId: request.headers.get("X-Correlation-Id") ?? undefined,
    edgeDeliveryRoute: request.headers.get("x-edge-delivery-route") ?? undefined,
    edgeCachePolicy: request.headers.get("x-edge-cache-policy") ?? undefined,
  };
  return ctx;
}

export function buildRequestContextFromServer(request: Request, extras?: RequestContextExtras): RequestContext {
  const u = new URL(request.url);
  const ctx = buildRequestContextFromUrl(u, request.method, "server", {
    ...extras,
    flags: {
      ...extras?.flags,
      isPreviewPath: u.pathname.endsWith("/preview"),
    },
  });
  ctx.headers = {
    accept: request.headers.get("accept") ?? undefined,
    correlationId: request.headers.get("X-Correlation-Id") ?? undefined,
    edgeDeliveryRoute: request.headers.get("x-edge-delivery-route") ?? undefined,
    edgeCachePolicy: request.headers.get("x-edge-cache-policy") ?? undefined,
  };
  return ctx;
}

export function buildRequestContextFromClientPath(
  pathname: string,
  query?: Record<string, string | undefined>,
  extras?: RequestContextExtras,
): RequestContext {
  const search = new URLSearchParams();
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v != null) search.set(k, v);
    }
  }
  const url = `${pathname}${search.toString() ? `?${search}` : ""}`;
  return buildRequestContextFromUrl(url, "GET", "client", extras);
}

export function requestContextFingerprint(ctx: RequestContext): string {
  try {
    return JSON.stringify({
      route: ctx.route,
      method: ctx.method,
      operationType: ctx.operationType,
      entityType: ctx.entityType,
      entityId: ctx.entityId?.slice(0, 36),
      query: ctx.query,
      flags: ctx.flags,
    });
  } catch {
    return `${ctx.route}:${ctx.method}`;
  }
}
