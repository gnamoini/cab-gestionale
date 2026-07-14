import type { MetadataRoute } from "next";
import { PWA_ICON_BASE_PATH } from "@/lib/pwa/pwa-icons";

export const PWA_SHORTCUT_PAGE_KEYS = [
  "dashboard",
  "lavorazioni",
  "magazzino",
  "agenda",
  "report",
] as const;

export type PwaShortcutPageKey = (typeof PWA_SHORTCUT_PAGE_KEYS)[number];

export type PwaShortcutPageSource = {
  key: string;
  href: string;
  label: string;
};

const PWA_SHORTCUT_ICON = `${PWA_ICON_BASE_PATH}/icon-192x192.png`;

/** Pure — il caller passa il catalogo pagine (SSOT `GESTIONALE_PAGES` in build manifest). */
export function buildPwaShortcuts(
  pages: readonly PwaShortcutPageSource[],
): NonNullable<MetadataRoute.Manifest["shortcuts"]> {
  return PWA_SHORTCUT_PAGE_KEYS.flatMap((key) => {
    const page = pages.find((entry) => entry.key === key);
    if (!page) return [];
    return [
      {
        name: page.label,
        short_name: page.label,
        url: page.href,
        icons: [{ src: PWA_SHORTCUT_ICON, sizes: "192x192", type: "image/png" }],
      },
    ];
  });
}
