import { resolveAssetLifecycleV1EnabledClient } from "@/lib/officina/resolve-asset-lifecycle-v1-client";
import { isAssetLifecycleSubFlagActive } from "@/lib/officina/asset-lifecycle-v1-flag";
import { assetMileageService } from "@/src/services/asset-mileage.service";

export function parseKmFromScheda(kmText: string | undefined | null): number | null {
  const raw = kmText?.trim().replace(",", ".");
  if (!raw) return null;
  const km = Number.parseFloat(raw);
  if (!Number.isFinite(km) || km < 0) return null;
  return km;
}

/** Append mileage reading da scheda ingresso se sub-flag mileage_history attivo. */
export async function appendMileageFromScheda(input: {
  mezzoId: string;
  kmText: string | undefined | null;
  lavorazioneId?: string | null;
}): Promise<void> {
  const flags = resolveAssetLifecycleV1EnabledClient();
  if (!isAssetLifecycleSubFlagActive(flags, "mileage_history")) return;
  const km = parseKmFromScheda(input.kmText);
  if (km == null || !input.mezzoId.trim()) return;
  await assetMileageService.appendReading({
    mezzo_id: input.mezzoId.trim(),
    km,
    source: "scheda",
    lavorazione_id: input.lavorazioneId ?? null,
  });
}
