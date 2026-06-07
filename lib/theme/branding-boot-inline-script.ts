import { CAB_BRANDING_STORAGE_KEY } from "@/lib/theme/cab-branding-defaults";

/**
 * IIFE sincrono per `<head>` — applica colore primario da cache locale prima dell'hydration.
 */
export const CAB_BRANDING_BOOT_INLINE_SCRIPT = `(function(){try{var k=${JSON.stringify(CAB_BRANDING_STORAGE_KEY)};var raw=localStorage.getItem(k);if(!raw)return;var o=JSON.parse(raw);var c=o&&o.primaryColor;if(typeof c!=="string"||!c)return;var h=c.trim();if(h.charAt(0)!=="#")h="#"+h;if(h.length===4){h="#"+h.charAt(1)+h.charAt(1)+h.charAt(2)+h.charAt(2)+h.charAt(3)+h.charAt(3);}if(!/^#[0-9a-fA-F]{6}$/.test(h))return;var r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);var mix=function(n){return Math.round(n*0.88);};var hx=function(n){return n.toString(16).padStart(2,"0");};var el=document.documentElement;el.style.setProperty("--cab-primary",h.toLowerCase());el.style.setProperty("--cab-primary-hover","#"+hx(mix(r))+hx(mix(g))+hx(mix(b)));}catch(e){}})();` as const;
