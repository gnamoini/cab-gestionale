import Image from "next/image";

export const CAB_LOGO_PATH = "/cab-logo.png";

export const CAB_APP_PRODUCT_NAME = "Gestionale Officina v1.00 Pilot";

type CabLogoProps = {
  className?: string;
  /** Altezza visiva del logo (larghezza automatica, aspect ratio preservato). */
  height?: number;
  priority?: boolean;
};

/** Logo C.A.B. (asset in `public/cab-logo.png`). */
export function CabLogo({ className = "", height = 28, priority }: CabLogoProps) {
  const width = Math.round(height * 3.4);
  return (
    <Image
      src={CAB_LOGO_PATH}
      alt="C.A.B."
      width={width}
      height={height}
      priority={priority}
      quality={100}
      className={`h-auto max-w-full object-contain object-left ${className}`}
      style={{ height, width: "auto", maxHeight: height }}
    />
  );
}
