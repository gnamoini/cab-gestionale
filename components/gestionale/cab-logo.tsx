import Image from "next/image";



/** Asset unico in `public/cab-logo.png` (790×226, PNG trasparente). */

export const CAB_LOGO_PATH = "/cab-logo.png";



export const CAB_LOGO_INTRINSIC_WIDTH = 790;

export const CAB_LOGO_INTRINSIC_HEIGHT = 226;

export const CAB_LOGO_ASPECT = CAB_LOGO_INTRINSIC_WIDTH / CAB_LOGO_INTRINSIC_HEIGHT;



export const CAB_APP_PRODUCT_NAME = "CAB Gestionale Officina";



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

  const displayWidth = Math.round(height * CAB_LOGO_ASPECT);

  return (

    <Image

      src={CAB_LOGO_PATH}

      alt="C.A.B."

      width={CAB_LOGO_INTRINSIC_WIDTH}

      height={CAB_LOGO_INTRINSIC_HEIGHT}

      priority={priority}

      quality={100}

      sizes={sizes ?? `${displayWidth}px`}

      className={`block h-auto w-auto max-w-full shrink-0 object-contain ${className}`}

      style={{ maxHeight: height }}

    />

  );

}



type CabLogoFillProps = {

  className?: string;

  sizes?: string;

};



/** Logo decorativo a riempimento (filigrane) — lazy, no priority. */

export function CabLogoFill({ className = "", sizes }: CabLogoFillProps) {

  return (

    <Image

      src={CAB_LOGO_PATH}

      alt=""

      fill

      sizes={sizes ?? "(max-width: 640px) 220px, 280px"}

      className={`object-contain ${className}`}

      loading="lazy"

    />

  );

}

