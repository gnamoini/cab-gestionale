import { CAB_THEME_STORAGE_KEY } from "@/lib/theme/cab-theme-storage";

/** IIFE sincrono per `<head>` — applica `dark` / `colorScheme` prima dell'hydration React. */
export function buildThemeBootInlineScript(
  storageKey: string = CAB_THEME_STORAGE_KEY,
): string {
  return `(function(){try{var k=${JSON.stringify(storageKey)};var s=localStorage.getItem(k);var d;if(s==="dark")d=true;else if(s==="light")d=false;else d=window.matchMedia("(prefers-color-scheme: dark)").matches;var r=document.documentElement;r.classList.toggle("dark",!!d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
}
