import type { Viewport } from "next";
import { THEME_CRITICAL_BG } from "@/lib/theme/cab-theme-storage";

export const siteViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_CRITICAL_BG.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_CRITICAL_BG.dark },
  ],
};
