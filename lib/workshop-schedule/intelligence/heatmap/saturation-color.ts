/** Green → yellow → red gradient for saturation 0–100 */
export function heatmapSaturationColor(saturation: number): string {
  const s = Math.max(0, Math.min(100, saturation));
  if (s <= 50) {
    const t = s / 50;
    const r = Math.round(34 + t * (234 - 34));
    const g = Math.round(197 + t * (179 - 197));
    const b = Math.round(94 + t * (8 - 94));
    return `rgb(${r},${g},${b})`;
  }
  const t = (s - 50) / 50;
  const r = Math.round(234 + t * (239 - 234));
  const g = Math.round(179 + t * (68 - 179));
  const b = Math.round(8 + t * (68 - 8));
  return `rgb(${r},${g},${b})`;
}

export function heatmapSaturationBgClass(saturation: number): string {
  if (saturation >= 85) return "bg-red-400/80 dark:bg-red-600/60";
  if (saturation >= 60) return "bg-amber-400/70 dark:bg-amber-600/50";
  if (saturation >= 30) return "bg-yellow-300/60 dark:bg-yellow-700/40";
  return "bg-emerald-300/50 dark:bg-emerald-700/40";
}
