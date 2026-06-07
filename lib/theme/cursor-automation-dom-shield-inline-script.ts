/**
 * Dev-only IIFE for `<head>` — strips `data-cursor-ref` injected by Cursor Browser / IDE
 * automation before React hydrates. Not loaded in production (see app/layout.tsx).
 */
export const CAB_CURSOR_AUTOMATION_DOM_SHIELD_INLINE_SCRIPT = `(function(){function strip(){var nodes=document.querySelectorAll("[data-cursor-ref]");for(var i=0;i<nodes.length;i++){nodes[i].removeAttribute("data-cursor-ref");}}strip();if(typeof MutationObserver==="undefined")return;var obs=new MutationObserver(function(){strip();});obs.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:["data-cursor-ref"],childList:true});if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",strip);}window.addEventListener("load",function(){window.setTimeout(function(){obs.disconnect();},15000);});})();` as const;
