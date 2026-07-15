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
