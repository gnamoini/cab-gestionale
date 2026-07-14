import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { CAB_APP_PRODUCT_NAME } from "@/lib/branding/cab-product-identity";
import { PWA_DESCRIPTION, PWA_NAME } from "@/lib/pwa/pwa-config";
import { PWA_GENERATED_ICON_FILES } from "@/lib/pwa/pwa-icons";
import { siteMetadata } from "@/lib/site/site-metadata";
import { buildPwaManifest } from "@/lib/pwa/build-pwa-manifest";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

for (const iconPath of PWA_GENERATED_ICON_FILES) {
  const abs = path.join(ROOT, "public", iconPath.replace(/^\//, ""));
  assert.ok(fs.existsSync(abs), `icona PWA mancante: ${iconPath}`);
}

assert.equal(PWA_NAME, CAB_APP_PRODUCT_NAME, "PWA_NAME deve consumare CAB_APP_PRODUCT_NAME");

const manifest = buildPwaManifest();
assert.equal(manifest.name, PWA_NAME);
assert.equal(manifest.short_name, "CAB");
assert.equal(manifest.description, PWA_DESCRIPTION);
assert.equal(manifest.start_url, "/");
assert.equal(manifest.display, "standalone");
assert.ok(manifest.icons?.some((icon) => icon.sizes === "192x192"));
assert.ok(manifest.icons?.some((icon) => icon.sizes === "512x512"));
assert.ok(manifest.icons?.some((icon) => icon.purpose === "maskable"));
assert.equal(manifest.shortcuts?.length, 5, "manifest deve esporre 5 shortcuts PWA");

assert.ok(siteMetadata.metadataBase instanceof URL);
assert.ok(siteMetadata.icons);
assert.ok(siteMetadata.appleWebApp);
assert.equal("manifest" in siteMetadata, false, "siteMetadata non deve configurare manifest");

assert.equal(fs.existsSync(path.join(ROOT, "public/manifest.webmanifest")), false);
assert.equal(fs.existsSync(path.join(ROOT, "public/manifest.json")), false);

const siteMetadataSource = read("lib/site/site-metadata.ts");
assert.match(siteMetadataSource, /from "@\/lib\/pwa"/, "site-metadata deve importare dalla SSOT PWA");

const buildManifestSource = read("lib/pwa/build-pwa-manifest.ts");
assert.match(buildManifestSource, /from "@\/lib\/pwa\/pwa-config"/, "build-pwa-manifest deve importare pwa-config");

const pwaConfigSource = read("lib/pwa/pwa-config.ts");
assert.match(
  pwaConfigSource,
  /from "@\/lib\/branding\/cab-product-identity"/,
  "pwa-config deve consumare il dominio branding",
);

console.log("pwa-manifest-policy: ok");
