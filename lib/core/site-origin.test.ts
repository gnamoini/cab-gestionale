import assert from "node:assert/strict";
import { canonicalSiteOriginString, resolveCanonicalSiteOrigin } from "@/lib/core/site-origin";

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

function requestWith(
  url: string,
  headers?: Record<string, string>,
): Request {
  return new Request(url, { headers });
}

withEnv(
  { NEXT_PUBLIC_SITE_URL: "https://cab-gestionale.vercel.app" },
  () => {
    const origin = canonicalSiteOriginString(
      requestWith("http://localhost:3000/api/inventory-labels/ricambi/x/render"),
    );
    assert.equal(origin, "https://cab-gestionale.vercel.app");
  },
);

withEnv(
  { NEXT_PUBLIC_SITE_URL: "https://cab-gestionale.vercel.app/" },
  () => {
    assert.equal(canonicalSiteOriginString(), "https://cab-gestionale.vercel.app");
  },
);

withEnv({}, () => {
  const origin = canonicalSiteOriginString(
    requestWith("https://cab-gestionale.vercel.app/api/inventory-labels/ricambi/x/render"),
  );
  assert.equal(origin, "https://cab-gestionale.vercel.app");
});

withEnv({}, () => {
  const origin = canonicalSiteOriginString(
    requestWith("http://localhost:3000/foo", {
      "x-forwarded-proto": "https",
      "x-forwarded-host": "cab-gestionale.vercel.app",
    }),
  );
  assert.equal(origin, "https://cab-gestionale.vercel.app");
});

withEnv({}, () => {
  const origin = canonicalSiteOriginString(
    requestWith("http://localhost:3000/foo", {
      "x-forwarded-proto": "https, http",
      "x-forwarded-host": "proxy.local, cab-gestionale.vercel.app",
    }),
  );
  assert.equal(origin, "https://proxy.local");
});

withEnv({}, () => {
  assert.equal(
    canonicalSiteOriginString(requestWith("http://localhost:3000/foo")),
    "http://localhost:3000",
  );
});

withEnv(
  {
    VERCEL_PROJECT_PRODUCTION_URL: "cab-gestionale.vercel.app",
  },
  () => {
    assert.equal(canonicalSiteOriginString(), "https://cab-gestionale.vercel.app");
  },
);

withEnv(
  { VERCEL_URL: "preview-abc.vercel.app" },
  () => {
    assert.equal(resolveCanonicalSiteOrigin().origin, "https://preview-abc.vercel.app");
  },
);

console.log("lib/core/site-origin.test.ts OK");
