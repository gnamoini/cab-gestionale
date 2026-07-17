import type { Viewport } from "next";
import { THEME_CRITICAL_BG } from "@/lib/theme/cab-theme-storage";

export const siteViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 1,
  interactiveWidget: "resizes-content",
  themeColor: THEME_CRITICAL_BG.dark,
};
