import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";
import { magazzinoMarcaBadgeStyle } from "@/lib/magazzino/marca-badge-color";

export function MagazzinoMarcaMobileBadge({
  marca,
  magazzinoMaster,
}: {
  marca: string;
  magazzinoMaster?: MagazzinoMasterPrefs | null;
}) {
  const label = marca.trim();
  if (!label) return null;
  return (
    <span
      className="inline-flex max-w-full truncate rounded-md border px-1.5 py-px text-base font-semibold uppercase leading-snug tracking-tight"
      style={magazzinoMarcaBadgeStyle(label, magazzinoMaster)}
    >
      {label}
    </span>
  );
}
