import { CAB_DEFAULT_PRIMARY } from "@/lib/theme/cab-branding-defaults";

export type CabBrandingPalette = {
  id: string;
  label: string;
  hex: string;
};

export const CAB_BRANDING_PALETTES: CabBrandingPalette[] = [
  { id: "cab-orange", label: "Arancione CAB", hex: CAB_DEFAULT_PRIMARY },
  { id: "blue", label: "Blu", hex: "#2563eb" },
  { id: "green", label: "Verde", hex: "#059669" },
  { id: "violet", label: "Viola", hex: "#7c3aed" },
  { id: "slate", label: "Antracite", hex: "#334155" },
];
