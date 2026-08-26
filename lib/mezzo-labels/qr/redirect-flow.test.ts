import assert from "node:assert/strict";
import { canonicalSiteOriginString } from "@/lib/core/site-origin";
import { buildMezzoQrUrl } from "@/lib/mezzo-labels/domain/tokens";
import {
  buildNuovaLavorazioneWithMezzoTokenHref,
  Q_CREATE_NUOVA_LAVORAZIONE,
  Q_MEZZO_ENTRY_SOURCE,
  Q_MEZZO_QR_TOKEN,
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
const request = new Request("http://localhost:3000/api/mezzo-labels/mezzi/x/render");

withEnv({ NEXT_PUBLIC_SITE_URL: "https://cab-gestionale.vercel.app" }, () => {
  const origin = canonicalSiteOriginString(request);
  const qrUrl = buildMezzoQrUrl(token, origin);
  assert.equal(qrUrl, "https://cab-gestionale.vercel.app/m/q/CAB-8K4J9P2X7M");
  assert.ok(!qrUrl.includes("mezzoId"));

  const deepLink = buildNuovaLavorazioneWithMezzoTokenHref(token, "qr");
  const url = new URL(deepLink, origin);
  assert.equal(url.searchParams.get(Q_CREATE_NUOVA_LAVORAZIONE), "1");
  assert.equal(url.searchParams.get(Q_MEZZO_QR_TOKEN), token);
  assert.equal(url.searchParams.get(Q_MEZZO_ENTRY_SOURCE), "qr");
  assert.equal(url.searchParams.get("mezzoId"), null);
});

console.log("mezzo-labels/qr/redirect-flow.test.ts OK");
