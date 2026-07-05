"use client";

import Image from "next/image";
import { useBranding } from "@/context/branding-context";

/** Asset unico in `public/cab-logo.png` (790×226, PNG trasparente). */
export const CAB_LOGO_PATH = "/cab-logo.png";

export const CAB_LOGO_INTRINSIC_WIDTH = 790;
export const CAB_LOGO_INTRINSIC_HEIGHT = 226;
export const CAB_LOGO_ASPECT = CAB_LOGO_INTRINSIC_WIDTH / CAB_LOGO_INTRINSIC_HEIGHT;

export const CAB_APP_PRODUCT_NAME = "CAB Gestionale Officina";

/** Sottotitolo sotto il logo (login, privacy): il marchio CAB è già nel logo. */
export const AUTH_STANDALONE_LOGO_SUBTITLE = "Gestionale officina";

type CabLogoProps = {
  className?: string;
  /** Altezza visiva del logo (larghezza automatica, aspect ratio preservato). */
  height?: number;
  /** App logo above-the-fold: default true. Pass `false` per filigrane decorative. */
  priority?: boolean;
  sizes?: string;
};

/** Logo C.A.B. — unica sorgente branding (`CabLogo` / `CAB_LOGO_PATH`). */
export function CabLogo({ className = "", height = 28, priority = true, sizes }: CabLogoProps) {
  const { logoUrl, isCustomLogo } = useBranding();
  const displayWidth = Math.round(height * CAB_LOGO_ASPECT);
  const sidebarBrand = className.includes("cab-sidebar-brand-logo");

  return (
    <Image
      src={logoUrl}
      alt="C.A.B."
      width={sidebarBrand ? CAB_LOGO_INTRINSIC_WIDTH : displayWidth}
      height={sidebarBrand ? CAB_LOGO_INTRINSIC_HEIGHT : height}
      priority={priority}
      quality={75}
      unoptimized={isCustomLogo}
      sizes={sizes ?? `${displayWidth}px`}
      className={`block shrink-0 object-contain ${className}`}
    />
  );
}

type CabLogoFillProps = {
  className?: string;
  sizes?: string;
};

/** Logo decorativo a riempimento (filigrane) — lazy, no priority. */
export function CabLogoFill({ className = "", sizes }: CabLogoFillProps) {
  const { logoUrl, isCustomLogo } = useBranding();

  return (
    <Image
      src={logoUrl}
      alt=""
      fill
      quality={75}
      unoptimized={isCustomLogo}
      sizes={sizes ?? "(max-width: 640px) 220px, 280px"}
      className={`object-contain ${className}`}
      loading="lazy"
    />
  );
}
