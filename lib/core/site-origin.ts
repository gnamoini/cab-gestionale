const LOCALHOST_FALLBACK = "http://localhost:3000";

function trimEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function normalizeSiteUrl(value: string): string {
  const withoutTrailingSlash = value.replace(/\/+$/, "");
  if (/^https?:\/\//i.test(withoutTrailingSlash)) {
    return new URL(withoutTrailingSlash).origin;
  }
  return new URL(`https://${withoutTrailingSlash.replace(/^https?:\/\//, "")}`).origin;
}

function originFromEnv(): string | null {
  const site = trimEnv(process.env.NEXT_PUBLIC_SITE_URL);
  if (site) return normalizeSiteUrl(site);

  const production = trimEnv(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (production) return normalizeSiteUrl(production);

  const vercel = trimEnv(process.env.VERCEL_URL);
  if (vercel) return normalizeSiteUrl(vercel);

  return null;
}

function firstHeaderValue(value: string | null): string | undefined {
  if (!value) return undefined;
  const first = value.split(",")[0]?.trim();
  return first || undefined;
}

function originFromForwardedHeaders(request: Request): string | null {
  const host = firstHeaderValue(request.headers.get("x-forwarded-host"));
  if (!host) return null;

  const proto = firstHeaderValue(request.headers.get("x-forwarded-proto")) ?? "https";
  return new URL(`${proto}://${host}`).origin;
}

/** SSOT per origin pubblico dell'app (QR, email, webhook, deep link, metadata). */
export function resolveCanonicalSiteOrigin(request?: Request): URL {
  const fromEnv = originFromEnv();
  if (fromEnv) return new URL(fromEnv);

  if (request) {
    const fromForwarded = originFromForwardedHeaders(request);
    if (fromForwarded) return new URL(fromForwarded);

    try {
      return new URL(new URL(request.url).origin);
    } catch {
      // ponytail: malformed request.url — fall through to localhost
    }
  }

  return new URL(LOCALHOST_FALLBACK);
}

export function canonicalSiteOriginString(request?: Request): string {
  return resolveCanonicalSiteOrigin(request).origin;
}
