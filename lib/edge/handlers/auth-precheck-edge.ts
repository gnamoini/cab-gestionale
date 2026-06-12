import { buildRequestContextFromUrl, jwtExpFromCookies } from "@/lib/decision/request-context";
import { getAuthPrecheckStrategy } from "@/lib/decision/request-decision-registry";
import type { EdgeHandlerResult } from "@/lib/edge/edge-types";

const ESTIMATED_GET_USER_MS = 80;

export function runAuthPrecheckEdgeFromCookies(
  cookies: ReadonlyArray<{ name: string; value: string }>,
  pathname: string,
): EdgeHandlerResult {
  const auth = jwtExpFromCookies(cookies);
  const ctx = buildRequestContextFromUrl(pathname, "GET", "edge", {
    flags: {
      hasAuthCookie: auth.hasAuthCookie,
      jwtExpSeconds: auth.jwtExpSeconds,
    },
  });

  const decision = getAuthPrecheckStrategy(ctx);

  if (decision.strategy === "reject_expired") {
    return {
      outcome: "handled",
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "session_expired" }),
      latencySavedEstimate: ESTIMATED_GET_USER_MS,
    };
  }

  if (!auth.hasAuthCookie) {
    return { outcome: "fallback", reason: "no_auth_cookie" };
  }

  if (auth.jwtExpSeconds == null) {
    return { outcome: "fallback", reason: "jwt_decode_failed" };
  }

  return { outcome: "fallback", reason: "token_not_expired" };
}

export function runAuthPrecheckEdge(request: Request): EdgeHandlerResult {
  const url = new URL(request.url);
  const cookies = (request as Request & { cookies?: { getAll(): { name: string; value: string }[] } }).cookies;
  const cookieList = typeof cookies?.getAll === "function" ? cookies.getAll() : [];
  return runAuthPrecheckEdgeFromCookies(cookieList, url.pathname);
}
