/** CSS critico + IIFE boot cold start — un solo export, pattern tema. */

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
.cab-app-boot-spinner{
  width:2.5rem;height:2.5rem;border-radius:9999px;border:2px solid color-mix(in srgb,var(--cab-border) 90%,transparent);
  border-top-color:var(--cab-primary);animation:cab-app-boot-spin 300ms linear infinite;
}
@keyframes cab-app-boot-spin{to{transform:rotate(360deg)}}
#cab-app-boot-msg{max-width:16rem;line-height:1.375;margin:0.25rem 0 0}
` as const;

export const CAB_APP_BOOT_INLINE_SCRIPT = `(function(){
  try{
    document.documentElement.classList.add("cab-app-boot-active");
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
