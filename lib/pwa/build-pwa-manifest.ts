import type { MetadataRoute } from "next";
import {
  PWA_BACKGROUND_COLOR,
  PWA_CATEGORIES,
  PWA_DESCRIPTION,
  PWA_DIR,
  PWA_DISPLAY,
  PWA_ID,
  PWA_LANG,
  PWA_NAME,
  PWA_ORIENTATION,
  PWA_PREFER_RELATED_APPLICATIONS,
  PWA_SCOPE,
  PWA_SHORT_NAME,
  PWA_START_URL,
  PWA_THEME_COLOR,
} from "@/lib/pwa/pwa-config";
import { buildPwaManifestIcons } from "@/lib/pwa/pwa-icons";
import { buildPwaShortcuts } from "@/lib/pwa/pwa-shortcuts";
import { GESTIONALE_PAGES } from "@/src/lib/permissions/gestionale-pages";

export function buildPwaManifest(): MetadataRoute.Manifest {
  return {
    id: PWA_ID,
    name: PWA_NAME,
    short_name: PWA_SHORT_NAME,
    description: PWA_DESCRIPTION,
    lang: PWA_LANG,
    dir: PWA_DIR,
    start_url: PWA_START_URL,
    scope: PWA_SCOPE,
    display: PWA_DISPLAY,
    orientation: PWA_ORIENTATION,
    theme_color: PWA_THEME_COLOR,
    background_color: PWA_BACKGROUND_COLOR,
    categories: [...PWA_CATEGORIES],
    prefer_related_applications: PWA_PREFER_RELATED_APPLICATIONS,
    icons: buildPwaManifestIcons(),
    shortcuts: buildPwaShortcuts(GESTIONALE_PAGES),
  };
}
