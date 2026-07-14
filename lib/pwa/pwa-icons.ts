import type { Metadata } from "next";
import type { MetadataRoute } from "next";

export const PWA_ICON_BASE_PATH = "/icons" as const;

export const PWA_ICON_SIZES = [
  16, 32, 48, 64, 72, 96, 128, 144, 152, 167, 180, 192, 256, 384, 512,
] as const;

export const PWA_APPLE_TOUCH_SIZES = [152, 167, 180] as const;

export const PWA_FAVICON_ICO_PATH = `${PWA_ICON_BASE_PATH}/favicon.ico` as const;
export const PWA_MASKABLE_ICON_PATH = `${PWA_ICON_BASE_PATH}/icon-512x512-maskable.png` as const;
export const PWA_MONOCHROME_ICON_PATH = `${PWA_ICON_BASE_PATH}/icon-monochrome.png` as const;

function iconPath(size: number): string {
  return `${PWA_ICON_BASE_PATH}/icon-${size}x${size}.png`;
}

function appleTouchIconPath(size: number): string {
  return `${PWA_ICON_BASE_PATH}/apple-touch-icon-${size}x${size}.png`;
}

/** File generati da `scripts/generate-pwa-icons.ts` — usato da regression test. */
export const PWA_GENERATED_ICON_FILES = [
  PWA_FAVICON_ICO_PATH,
  ...PWA_ICON_SIZES.map((size) => iconPath(size)),
  ...PWA_APPLE_TOUCH_SIZES.map((size) => appleTouchIconPath(size)),
  PWA_MASKABLE_ICON_PATH,
  PWA_MONOCHROME_ICON_PATH,
] as const;

export function buildPwaManifestIcons(): NonNullable<MetadataRoute.Manifest["icons"]> {
  const icons: NonNullable<MetadataRoute.Manifest["icons"]> = PWA_ICON_SIZES.map((size) => ({
    src: iconPath(size),
    sizes: `${size}x${size}`,
    type: "image/png",
    purpose: "any",
  }));

  icons.push({
    src: PWA_MASKABLE_ICON_PATH,
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  });

  icons.push({
    src: PWA_MONOCHROME_ICON_PATH,
    sizes: "512x512",
    type: "image/png",
    purpose: "monochrome",
  });

  return icons;
}

export function buildPwaMetadataIcons(): Metadata["icons"] {
  return {
    icon: [
      { url: PWA_FAVICON_ICO_PATH, sizes: "any" },
      ...PWA_ICON_SIZES.map((size) => ({
        url: iconPath(size),
        sizes: `${size}x${size}`,
        type: "image/png",
      })),
    ],
    apple: PWA_APPLE_TOUCH_SIZES.map((size) => ({
      url: appleTouchIconPath(size),
      sizes: `${size}x${size}`,
      type: "image/png",
    })),
    shortcut: [{ url: iconPath(192), sizes: "192x192", type: "image/png" }],
  };
}
