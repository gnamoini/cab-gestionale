/**
 * SSOT dimensioni modali gestionale — larghezza, altezza e drawer.
 * Modificare i valori qui (o le CSS var in globals.css) per aggiornare tutti i consumer.
 */

import {
  dsLavorazioniModalDialog,
  dsLavorazioniModalDialogCompact,
  dsLavorazioniModalDialogTall,
} from "@/lib/ui/design-system";

/** Categorie semantiche overlay gestionale. */
export type ModalSize =
  | "confirmation"
  | "info"
  | "formSmall"
  | "formMedium"
  | "formLarge"
  | "analytics"
  | "fullscreen"
  | "drawerLog"
  | "drawerFilter"
  | "drawerNav";

export type ModalHeight = "auto" | "compact" | "standard" | "tall";

export type DrawerSize = "drawerLog" | "drawerFilter" | "drawerNav";

const MOBILE_FULL_BLEED = "max-md:max-w-none";

/** Larghezze desktop (mobile: full-bleed su shell form). */
/** Min-width desktop: classi `.cab-modal-min-w-*` in globals.css (var --cab-modal-width-*). */
const MODAL_WIDTH_CLASSES: Record<
  Exclude<ModalSize, "drawerLog" | "drawerFilter" | "drawerNav">,
  string
> = {
  confirmation: `${MOBILE_FULL_BLEED} md:w-full md:max-w-[28rem]`,
  info: `${MOBILE_FULL_BLEED} md:w-full md:max-w-[32rem]`,
  formSmall: `${MOBILE_FULL_BLEED} md:w-full cab-modal-min-w-form-small md:max-w-xl`,
  formMedium: `${MOBILE_FULL_BLEED} cab-modal-min-w-form-medium md:max-w-3xl`,
  formLarge: `${MOBILE_FULL_BLEED} cab-modal-min-w-form-large md:max-w-4xl`,
  analytics: `${MOBILE_FULL_BLEED} cab-modal-min-w-analytics md:max-w-5xl`,
  fullscreen: "w-full max-w-full",
};

const DRAWER_ASIDE_CLASSES: Record<DrawerSize, string> = {
  drawerLog:
    "flex h-full max-h-dvh min-h-0 w-full max-w-[28rem] flex-col overflow-hidden border-l border-[color:var(--cab-border)] bg-[var(--cab-card)] shadow-2xl",
  drawerFilter:
    "cab-drawer-panel absolute inset-y-0 right-0 flex w-[min(100%,var(--cab-modal-width-drawer-filter,22rem))] max-w-full flex-col border-l border-[color:var(--cab-border)] bg-[var(--cab-card)] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-[var(--cab-shadow-lg)]",
  drawerNav:
    "cab-nav-drawer-panel absolute inset-y-0 left-0 flex min-h-0 w-[min(var(--cab-modal-width-drawer-nav,19.5rem),88vw)] max-w-full flex-col border-r border-zinc-200 bg-white pt-[env(safe-area-inset-top)] shadow-2xl dark:border-zinc-800 dark:bg-zinc-900",
};

const DEFAULT_HEIGHT_BY_SIZE: Record<
  Exclude<ModalSize, "drawerLog" | "drawerFilter" | "drawerNav" | "confirmation" | "fullscreen">,
  ModalHeight
> = {
  info: "compact",
  formSmall: "compact",
  formMedium: "standard",
  formLarge: "standard",
  analytics: "tall",
};

const HEIGHT_SURFACE_CLASS: Record<Exclude<ModalHeight, "auto">, string> = {
  compact: dsLavorazioniModalDialogCompact,
  standard: dsLavorazioniModalDialog,
  tall: dsLavorazioniModalDialogTall,
};

/** Larghezza modale/shell (esclude drawer-only sizes). */
export function resolveModalWidthClasses(
  size: Exclude<ModalSize, "drawerLog" | "drawerFilter" | "drawerNav">,
): string {
  return MODAL_WIDTH_CLASSES[size];
}

/** Altezza finestra shell su desktop. */
export function resolveModalHeightClasses(height: ModalHeight): string {
  if (height === "auto") return "";
  return HEIGHT_SURFACE_CLASS[height];
}

/** Altezza default per `modalSize` se non specificata. */
export function defaultModalHeightForSize(
  size: Exclude<ModalSize, "drawerLog" | "drawerFilter" | "drawerNav" | "confirmation" | "fullscreen">,
): ModalHeight {
  return DEFAULT_HEIGHT_BY_SIZE[size];
}

/** Risolve width + height per shell gestionale. */
export function resolveShellModalLayout(opts: {
  modalSize?: ModalSize;
  modalHeight?: ModalHeight;
  /** @deprecated Usare `modalSize` / `modalHeight`. */
  legacyDialogSize?: "hub" | "compact";
}): { widthClass: string; surfaceClass: string; modalSize: ModalSize; modalHeight: ModalHeight } {
  const modalSize = opts.modalSize ?? "formMedium";
  const isDrawerOnly =
    modalSize === "drawerLog" || modalSize === "drawerFilter" || modalSize === "drawerNav";

  let modalHeight = opts.modalHeight;
  if (!modalHeight) {
    if (opts.legacyDialogSize === "compact") {
      modalHeight = "compact";
    } else if (opts.legacyDialogSize === "hub") {
      modalHeight = "standard";
    } else if (
      modalSize === "confirmation" ||
      modalSize === "fullscreen" ||
      isDrawerOnly
    ) {
      modalHeight = modalSize === "fullscreen" ? "standard" : "auto";
    } else {
      modalHeight = defaultModalHeightForSize(modalSize);
    }
  }

  const widthClass =
    modalSize === "fullscreen"
      ? MODAL_WIDTH_CLASSES.fullscreen
      : isDrawerOnly
        ? MODAL_WIDTH_CLASSES.formMedium
        : MODAL_WIDTH_CLASSES[modalSize as keyof typeof MODAL_WIDTH_CLASSES];

  const surfaceClass =
    modalHeight === "auto"
      ? dsLavorazioniModalDialog
      : resolveModalHeightClasses(modalHeight);

  return { widthClass, surfaceClass, modalSize, modalHeight };
}

/** Classi aside drawer (log, filtri mobile, nav mobile). */
export function resolveDrawerAsideClasses(size: DrawerSize): string {
  return DRAWER_ASIDE_CLASSES[size];
}

/** @deprecated Mappa `standard`/`wide` → `formMedium`. */
export type GestionaleModalWidth = "standard" | "wide";

export function resolveGestionaleModalWidthFromLegacy(
  _size: GestionaleModalWidth = "standard",
): string {
  return resolveModalWidthClasses("formMedium");
}
