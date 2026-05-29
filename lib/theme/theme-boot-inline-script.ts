import {
  CAB_THEME_CLIENT_MIGRATION_KEY,
  CAB_THEME_STORAGE_KEY,
} from "@/lib/theme/cab-theme-storage";
import { DEFAULT_PERSISTED_THEME_MODE } from "@/lib/theme/user-theme-prefs";

/**
 * IIFE sincrono per `<head>` — stringa fissa SSR/CSR (no Date/random).
 * Applica `dark` / `colorScheme` prima dell'hydration React.
 */
export const CAB_THEME_BOOT_INLINE_SCRIPT = `(function(){try{var mig=${JSON.stringify(CAB_THEME_CLIENT_MIGRATION_KEY)};var k=${JSON.stringify(CAB_THEME_STORAGE_KEY)};var def=${JSON.stringify(DEFAULT_PERSISTED_THEME_MODE)};if(localStorage.getItem(mig)!=="1"){localStorage.setItem(k,def);localStorage.setItem(mig,"1");}var s=localStorage.getItem(k);var d;if(s==="dark")d=true;else if(s==="light")d=false;else d=def==="dark";var r=document.documentElement;r.classList.toggle("dark",!!d);r.style.colorScheme=d?"dark":"light";}catch(e){var r=document.documentElement;r.classList.add("dark");r.style.colorScheme="dark";}})();` as const;

/** @deprecated Preferire `CAB_THEME_BOOT_INLINE_SCRIPT` in layout (output identico ai default). */
export function buildThemeBootInlineScript(
  storageKey: string = CAB_THEME_STORAGE_KEY,
  migrationKey: string = CAB_THEME_CLIENT_MIGRATION_KEY,
  defaultMode: string = DEFAULT_PERSISTED_THEME_MODE,
): string {
  if (
    storageKey === CAB_THEME_STORAGE_KEY &&
    migrationKey === CAB_THEME_CLIENT_MIGRATION_KEY &&
    defaultMode === DEFAULT_PERSISTED_THEME_MODE
  ) {
    return CAB_THEME_BOOT_INLINE_SCRIPT;
  }
  return `(function(){try{var mig=${JSON.stringify(migrationKey)};var k=${JSON.stringify(storageKey)};var def=${JSON.stringify(defaultMode)};if(localStorage.getItem(mig)!=="1"){localStorage.setItem(k,def);localStorage.setItem(mig,"1");}var s=localStorage.getItem(k);var d;if(s==="dark")d=true;else if(s==="light")d=false;else d=def==="dark";var r=document.documentElement;r.classList.toggle("dark",!!d);r.style.colorScheme=d?"dark":"light";}catch(e){var r=document.documentElement;r.classList.add("dark");r.style.colorScheme="dark";}})();`;
}
