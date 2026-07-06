import { buildRequestContextFromUrl, jwtExpFromCookies } from "@/lib/decision/request-context";
import { getAuthPrecheckStrategy } from "@/lib/decision/request-decision-registry";
import type { EdgeHandlerResult } from "@/lib/edge/edge-types";

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
  if (decision.strategy === "not_applicable") {
    return { outcome: "fallback", reason: "not_applicable" };
  }

  if (!auth.hasAuthCookie) {
    return { outcome: "fallback", reason: "no_auth_cookie" };
  }

  return { outcome: "fallback", reason: "defer_to_auth" };
}

export function runAuthPrecheckEdge(request: Request): EdgeHandlerResult {
  const url = new URL(request.url);
  const cookies = (request as Request & { cookies?: { getAll(): { name: string; value: string }[] } }).cookies;
  const cookieList = typeof cookies?.getAll === "function" ? cookies.getAll() : [];
  return runAuthPrecheckEdgeFromCookies(cookieList, url.pathname);
}
