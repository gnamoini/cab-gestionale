/**
 * Dev-only IIFE — Turbopack CSS HMR can reject with
 * "No link element found for chunk …css" when a lazy/dynamic subtree unmounts
 * but its chunk list stays subscribed (vercel/next.js#74749).
 * Recover with a single soft reload instead of an unhandled rejection + stale styles.
 */
export const CAB_TURBOPACK_CSS_HMR_RECOVERY_INLINE_SCRIPT = `(function(){var k="__cabTurbopackCssHmrRecovering";window.addEventListener("unhandledrejection",function(e){var r=e.reason;var m=r&&(r.message||String(r));if(typeof m!=="string"||m.indexOf("No link element found for chunk")===-1)return;e.preventDefault();if(window[k])return;window[k]=true;window.setTimeout(function(){window.location.reload();},50);});})();` as const;
