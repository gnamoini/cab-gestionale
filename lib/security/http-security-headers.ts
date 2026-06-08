/** SSOT header HTTP di sicurezza — consumato da next.config.ts `headers()`. */

export type HttpSecurityHeader = {
  key: string;
  value: string;
};

function resolveSupabaseConnectOrigins(): string[] {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) {
    return ["https://*.supabase.co", "wss://*.supabase.co"];
  }
  try {
    const origin = new URL(url).origin;
    const wssOrigin = origin.replace(/^https:/i, "wss:");
    return [origin, wssOrigin, "https://*.supabase.co", "wss://*.supabase.co"];
  } catch {
    return ["https://*.supabase.co", "wss://*.supabase.co"];
  }
}

/** CSP pragmatica: compatibile con script boot inline, Supabase, blob PDF. */
export function buildContentSecurityPolicy(): string {
  const connectSrc = ["'self'", ...resolveSupabaseConnectOrigins()].join(" ");
  const scriptSrcParts = ["'self'", "'unsafe-inline'"];
  // React dev tooling (callstack reconstruction) requires eval; omitted in production.
  if (process.env.NODE_ENV !== "production") {
    scriptSrcParts.push("'unsafe-eval'");
  }
  const scriptSrc = `script-src ${scriptSrcParts.join(" ")}`;
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "frame-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join("; ");
}

/** Header globali applicati a tutte le route HTML/API del gestionale. */
export function getHttpSecurityHeaders(): HttpSecurityHeader[] {
  return [
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-DNS-Prefetch-Control", value: "on" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    },
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy() },
  ];
}
