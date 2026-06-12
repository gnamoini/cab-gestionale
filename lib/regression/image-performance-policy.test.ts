import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const cabLogo = read("components/gestionale/cab-logo.tsx");
assert.doesNotMatch(cabLogo, /quality=\{100\}/, "CabLogo should not use quality=100");

const clientView = read("components/lavorazioni-clienti/client-lavorazioni-view.tsx");
assert.doesNotMatch(
  clientView,
  /ClientLavorazionePhotoStrip[^]*lazy=\{false\}/,
  "client portal list must not eagerly load all photo strips",
);

const recordManager = read("components/gestionale/media/record-image-manager.tsx");
assert.match(recordManager, /GestionaleMediaImage/, "RecordImageManager must use GestionaleMediaImage");

const clientPhotos = read("components/lavorazioni-clienti/client-lavorazione-photos.tsx");
assert.match(clientPhotos, /GestionaleMediaImage/, "client photos must use GestionaleMediaImage");

const imageStorage = read("lib/media/image-storage.ts");
assert.match(imageStorage, /\.thumb\.webp/, "upload must emit thumb WebP variant");
assert.match(imageStorage, /\.full\.(avif|webp)/, "upload must emit full AVIF/WebP variants");
assert.doesNotMatch(
  imageStorage,
  /toBlob\([^)]*image\/jpeg[^)]*\)[\s\S]*uploadStoredImage/,
  "uploadStoredImage must not emit sole JPEG variant for new uploads",
);

const mediaProxy = read("app/api/media/image/route.ts");
assert.match(mediaProxy, /sharp/, "media proxy must use sharp");
assert.match(mediaProxy, /immutable/, "media proxy must set immutable cache for content-addressed paths");

const mediaDelivery = read("lib/media/media-delivery-url.ts");
assert.match(mediaDelivery, /buildMediaDeliveryUrl/, "media delivery URL helper required");

const brandingRoute = read("app/api/branding/logo/route.ts");
assert.match(brandingRoute, /sharp|image\/avif|image\/webp/, "branding logo route must support modern formats");

const cabLogoPngBytes = fs.statSync(path.join(ROOT, "public/cab-logo.png")).size;
assert.ok(cabLogoPngBytes < 150 * 1024, "cab-logo.png audit: under 150KB — skip static avif/webp generation");

console.log("image-performance-policy: ok");
