/** CSS critico + IIFE boot cold start — un solo export, pattern tema. */

import {
  CAB_SPINNER_SPIN_KEYFRAMES_CSS,
  cabSpinnerRingAnimationDecl,
  LOADING_SPINNER_DURATION_MS,
} from "@/components/design-system/loading/loading-tokens";

/** ponytail: boot critical autonomo — non dipende da .cab-spinner-ring in globals bundle. */
const CAB_APP_BOOT_SPINNER_CSS = `.cab-app-boot-spinner{
  width:2.5rem;height:2.5rem;border-radius:9999px;border:2px solid color-mix(in srgb,var(--cab-border) 90%,transparent);
  border-top-color:var(--cab-primary);${cabSpinnerRingAnimationDecl};
}`;

export const CAB_APP_BOOT_CRITICAL_STYLE = `
html.cab-app-boot-active #cab-app-boot{display:flex}
#cab-app-boot{
  position:fixed;inset:0;z-index:200;
  display:none;flex-direction:column;align-items:center;justify-content:center;gap:0.75rem;
  background:var(--cab-bg-app);color:var(--cab-text-muted);
  font-family:var(--font-geist-sans,system-ui,sans-serif);font-size:0.75rem;font-weight:500;
  text-align:center;padding:1rem;
}
#cab-app-boot img{display:block;height:56px;width:auto;object-fit:contain}
html.dark #cab-app-boot img{filter:brightness(1.08) contrast(0.95)}
${CAB_APP_BOOT_SPINNER_CSS}
${CAB_SPINNER_SPIN_KEYFRAMES_CSS}
#cab-app-boot-msg{max-width:16rem;line-height:1.375;margin:0.25rem 0 0}
` as const;

/** Parità test boot ↔ SSOT spinner. */
export const CAB_APP_BOOT_SPINNER_DURATION_MS = LOADING_SPINNER_DURATION_MS;

export const CAB_APP_BOOT_INLINE_SCRIPT = `(function(){
  try{
    document.documentElement.classList.add("cab-app-boot-active");
    if(typeof performance!=="undefined"&&performance.mark)performance.mark("cab_static_boot_visible");
    document.addEventListener("visibilitychange",function(){
      if(document.visibilityState==="hidden"){
        try{sessionStorage.setItem("cab_last_visibility_hidden",String(Date.now()));}catch(_){}
      }
    });
    var msgs=["Avvio del gestionale...","Caricamento dati...","Sincronizzazione...","Quasi pronto..."];
    var i=0;
    var el=document.getElementById("cab-app-boot-msg");
    if(!el)return;
    setInterval(function(){
      i=(i+1)%msgs.length;
      el.textContent=msgs[i];
    },1500);
  }catch(_){}
})();` as const;
