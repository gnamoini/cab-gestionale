import {
  CAB_THEME_CLIENT_MIGRATION_KEY,
  CAB_THEME_COOKIE_MAX_AGE,
  CAB_THEME_STORAGE_KEY,
  THEME_CRITICAL_BG,
} from "@/lib/theme/cab-theme-storage";
import { DEFAULT_PERSISTED_THEME_MODE } from "@/lib/theme/user-theme-prefs";

/**
 * CSS critico inline — primo elemento in `<head>`, prima del bundle CSS.
 * Garantisce sfondo e color-scheme corretti al primo paint.
 */
export const CAB_THEME_CRITICAL_INLINE_STYLE =
  `html{background-color:${THEME_CRITICAL_BG.dark};color-scheme:dark}html:not(.dark){background-color:${THEME_CRITICAL_BG.light};color-scheme:light}` as const;

/**
 * IIFE sincrono per `<head>` — stringa fissa SSR/CSR (no Date/random).
 * Applica `dark` / `colorScheme` e sincronizza cookie prima dell'hydration React.
 */
export const CAB_THEME_BOOT_INLINE_SCRIPT = `(function(){try{var mig=${JSON.stringify(CAB_THEME_CLIENT_MIGRATION_KEY)};var k=${JSON.stringify(CAB_THEME_STORAGE_KEY)};var def=${JSON.stringify(DEFAULT_PERSISTED_THEME_MODE)};var ck=";path=/;max-age=${CAB_THEME_COOKIE_MAX_AGE};SameSite=Lax";if(localStorage.getItem(mig)!=="1"){localStorage.setItem(k,def);localStorage.setItem(mig,"1");}var s=localStorage.getItem(k);var d;if(s==="dark")d=true;else if(s==="light")d=false;else d=def==="dark";var m=d?"dark":"light";var r=document.documentElement;r.classList.toggle("dark",!!d);r.style.colorScheme=m;document.cookie=k+"="+m+ck}catch(e){var r=document.documentElement;r.classList.add("dark");r.style.colorScheme="dark";document.cookie=${JSON.stringify(CAB_THEME_STORAGE_KEY)}+"=dark;path=/;max-age=${CAB_THEME_COOKIE_MAX_AGE};SameSite=Lax"}})();` as const;

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
  return `(function(){try{var mig=${JSON.stringify(migrationKey)};var k=${JSON.stringify(storageKey)};var def=${JSON.stringify(defaultMode)};var ck=";path=/;max-age=${CAB_THEME_COOKIE_MAX_AGE};SameSite=Lax";if(localStorage.getItem(mig)!=="1"){localStorage.setItem(k,def);localStorage.setItem(mig,"1");}var s=localStorage.getItem(k);var d;if(s==="dark")d=true;else if(s==="light")d=false;else d=def==="dark";var m=d?"dark":"light";var r=document.documentElement;r.classList.toggle("dark",!!d);r.style.colorScheme=m;document.cookie=k+"="+m+ck}catch(e){var r=document.documentElement;r.classList.add("dark");r.style.colorScheme="dark";document.cookie=${JSON.stringify(storageKey)}+"=dark;path=/;max-age=${CAB_THEME_COOKIE_MAX_AGE};SameSite=Lax"}})();`;
}
