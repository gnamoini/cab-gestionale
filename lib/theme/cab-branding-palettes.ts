import { CAB_DEFAULT_PRIMARY } from "@/lib/theme/cab-branding-defaults";

export type CabBrandingPalette = {
  id: string;
  label: string;
  hex: string;
};

export const CAB_BRANDING_PALETTES: CabBrandingPalette[] = [
  { id: "cab-orange", label: "Arancione CAB", hex: CAB_DEFAULT_PRIMARY },
  { id: "red", label: "Rosso", hex: "#dc2626" },
  { id: "amber", label: "Ambra", hex: "#d97706" },
  { id: "green", label: "Verde", hex: "#059669" },
  { id: "teal", label: "Teal", hex: "#0d9488" },
  { id: "cyan", label: "Ciano", hex: "#0891b2" },
  { id: "blue", label: "Blu", hex: "#2563eb" },
  { id: "indigo", label: "Indigo", hex: "#4f46e5" },
  { id: "violet", label: "Viola", hex: "#7c3aed" },
  { id: "pink", label: "Rosa", hex: "#db2777" },
  { id: "slate", label: "Antracite", hex: "#334155" },
  { id: "gray", label: "Grigio", hex: "#64748b" },
];
