import type { SVGProps } from "react";
import {
  dsPageHeaderIconGlyph,
  dsPageHeaderIconGlyphDense,
  dsPageHeaderIconStroke,
} from "@/lib/ui/design-system";

export type ShellNavIconProps = SVGProps<SVGSVGElement> & {
  /** Artwork più pieno (refresh, back, close) — stessa percezione del menu. */
  dense?: boolean;
};

function shellNavIconProps({
  className,
  dense = false,
  strokeWidth,
  ...rest
}: ShellNavIconProps): SVGProps<SVGSVGElement> {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: strokeWidth ?? dsPageHeaderIconStroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: className ?? (dense ? dsPageHeaderIconGlyphDense : dsPageHeaderIconGlyph),
    "aria-hidden": true,
    ...rest,
  };
}

export function ShellNavIconMenu(props: ShellNavIconProps) {
  const svg = shellNavIconProps(props);
  return (
    <svg {...svg}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function ShellNavIconBack(props: ShellNavIconProps) {
  const svg = shellNavIconProps({ dense: true, ...props });
  return (
    <svg {...svg}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

export function ShellNavIconClose(props: ShellNavIconProps) {
  const svg = shellNavIconProps({ dense: true, ...props });
  return (
    <svg {...svg}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function ShellNavIconRefresh(props: ShellNavIconProps) {
  const svg = shellNavIconProps({ dense: true, ...props });
  return (
    <svg {...svg}>
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M21 21v-5h-5" />
    </svg>
  );
}

export function ShellNavIconFileText(props: ShellNavIconProps) {
  const svg = shellNavIconProps({ dense: true, ...props });
  return (
    <svg {...svg}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </svg>
  );
}

export function ShellNavIconAlertTriangle(props: ShellNavIconProps) {
  const svg = shellNavIconProps({ dense: true, ...props });
  return (
    <svg {...svg}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function ShellNavIconWifiOff(props: ShellNavIconProps) {
  const svg = shellNavIconProps({ dense: true, ...props });
  return (
    <svg {...svg}>
      <path d="M12 20h.01" />
      <path d="M8.5 16.429a5 5 0 0 1 7 0" />
      <path d="M5 12.859a10 10 0 0 1 5.17-2.69" />
      <path d="M19 12.859a10 10 0 0 0-2.007-1.523" />
      <path d="M2 8.82a15 15 0 0 1 4.177-2.643" />
      <path d="M22 8.82a15 15 0 0 0-11.853-3.36" />
      <path d="m2 2 20 20" />
    </svg>
  );
}
