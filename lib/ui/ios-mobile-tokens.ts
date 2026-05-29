/** Classi Tailwind condivise per stabilità touch / safe-area (iOS Safari). */

/** Input/select/textarea: 16px su mobile evita zoom automatico iOS. */
export const dsIosInputTextSize = "text-base md:text-sm";

/** Contenitori scroll principali: no bleed orizzontale, scroll verticale fluido. */
export const cabIosScrollContainer =
  "max-w-full overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]";

/** Overlay modale/drawer: blocca scroll chaining sul backdrop. */
export const cabIosOverlaySurface =
  "touch-none overscroll-none overflow-x-hidden overflow-y-auto overscroll-contain";

/** Pannello modale (legacy): preferire cabModalDialogDesktop su md+. */
export const cabIosModalPanelMaxH =
  "max-h-[min(92dvh,calc(var(--cab-vv-height,100dvh)-1.5rem))]";

/** Padding safe-area orizzontale/verticale per sheet e modali. */
export const cabIosSafePad =
  "pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]";

/** Layer modale: backdrop condiviso (z-index aggiunto dal consumer). */
export const cabModalLayerShared =
  `${cabIosOverlaySurface} bg-[var(--cab-overlay)] backdrop-blur-[2px]`;

/** Layer mobile: sheet fullscreen edge-to-edge. */
export const cabModalLayerMobile =
  "max-md:items-stretch max-md:justify-stretch max-md:p-0 max-md:pt-[env(safe-area-inset-top)] max-md:pb-[env(safe-area-inset-bottom)]";

/** Layer desktop: finestra centrata con padding. */
export const cabModalLayerDesktop =
  "md:items-center md:justify-center md:p-4 md:pt-[max(1rem,env(safe-area-inset-top))] md:pb-[max(1rem,env(safe-area-inset-bottom))]";

/** Dialog modale: base strutturale (senza max-width globale). */
export const cabModalDialogBase =
  "relative z-[1] flex w-full min-h-0 flex-col overflow-hidden";

/** Dialog mobile: fullscreen, no radius desktop. */
export const cabModalDialogMobile =
  "max-md:max-w-none max-md:flex-1 max-md:min-h-0 max-md:max-h-[min(100dvh,calc(var(--cab-vv-height,100dvh)))] max-md:rounded-none max-md:shadow-none";

/** Dialog desktop: altezza windowed (max-width da prop md:max-w-*). */
export const cabModalDialogDesktop = "md:flex-none md:max-h-[min(92dvh,920px)]";
