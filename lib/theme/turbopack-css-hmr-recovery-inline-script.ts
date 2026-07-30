/**
 * Dev-only IIFE — Turbopack CSS HMR can reject with
 * "No link element found for chunk …css" when a lazy/dynamic subtree unmounts
 * but its chunk list stays subscribed (vercel/next.js#74749).
 * Recover with a single soft reload instead of an unhandled rejection + stale styles.
 */
export const CAB_TURBOPACK_CSS_HMR_RECOVERY_INLINE_SCRIPT = `(function(){var k="__cabTurbopackCssHmrRecovering";function match(r){var m=r&&(r.message||r.stack||String(r));if(typeof m!=="string")return false;return m.indexOf("No link element found for chunk")!==-1||(m.indexOf("root-of-the-server")!==-1&&m.indexOf(".css")!==-1);}function recover(e){if(e&&e.preventDefault)e.preventDefault();if(e&&e.stopImmediatePropagation)e.stopImmediatePropagation();if(window[k])return;window[k]=true;window.location.reload();}function onReject(e){if(!match(e.reason))return;recover(e);}function onErr(e){if(!match(e.error||e.message))return;recover(e);}window.addEventListener("unhandledrejection",onReject,true);window.addEventListener("error",onErr,true);})();` as const;
