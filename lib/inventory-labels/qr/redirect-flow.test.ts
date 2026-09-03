import assert from "node:assert/strict";
import { canonicalSiteOriginString } from "@/lib/core/site-origin";
import { buildInventoryQrUrl } from "@/lib/inventory-labels/domain/tokens";
import {
  buildMagazzinoOpenRicambioHref,
  Q_OPEN_RICAMBIO,
  Q_OPEN_SOURCE,
} from "@/lib/navigation/dashboard-log-links";

const ENV_KEYS = [
  "NEXT_PUBLIC_SITE_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
] as const;

function withEnv(
  values: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>,
  fn: () => void,
): void {
  const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
  try {
    fn();
  } finally {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

const token = "CAB-8K4J9P2X7M";
const ricambioId = "ric-uuid-1";
const request = new Request("http://localhost:3000/api/inventory-labels/ricambi/x/render");

withEnv({ NEXT_PUBLIC_SITE_URL: "https://cab-gestionale.vercel.app" }, () => {
  const origin = canonicalSiteOriginString(request);
  const qrUrl = buildInventoryQrUrl(token, origin);
  assert.equal(qrUrl, "https://cab-gestionale.vercel.app/r/CAB-8K4J9P2X7M");
  assert.ok(!qrUrl.includes("localhost"));

  const redirectPath = buildMagazzinoOpenRicambioHref(ricambioId, "qr");
  const redirectUrl = new URL(redirectPath, origin);
  assert.equal(redirectUrl.origin, "https://cab-gestionale.vercel.app");
  assert.equal(redirectUrl.searchParams.get(Q_OPEN_RICAMBIO), ricambioId);
  assert.equal(redirectUrl.searchParams.get(Q_OPEN_SOURCE), "qr");
  assert.equal(redirectUrl.pathname, "/magazzino");

  const qrRoute = new URL(`/r/${encodeURIComponent(token)}`, origin);
  assert.equal(qrRoute.href, "https://cab-gestionale.vercel.app/r/CAB-8K4J9P2X7M");

  const errorUrl = new URL("/r/errore?reason=inactive", origin);
  assert.equal(errorUrl.pathname, "/r/errore");
  assert.equal(errorUrl.searchParams.get("reason"), "inactive");
});

console.log("inventory-labels/qr/redirect-flow.test.ts OK");
