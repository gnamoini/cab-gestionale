import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";
import { isValidEmail } from "@/lib/validation/email";
import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";
import type { AppSettingRow } from "@/src/types/supabase-tables";

export function resolveSupplierEmailFromSnapshot(snapshot: Record<string, unknown>): string {
  const email = snapshot.email ?? snapshot.email_fornitore;
  if (typeof email === "string" && isValidEmail(email)) return email.trim();
  return "";
}

export function resolveOrdineFornitoreSupplierEmailFromMagazzinoRows(
  fornitoreLabel: string,
  settingsRows: AppSettingRow[],
): string {
  const mag = settingsRows.find((r) => r.module === "magazzino" && r.key === "master");
  if (!mag?.value || typeof mag.value !== "object") return "";
  const raw = (mag.value as Record<string, unknown>).fornitoreAnagraficaByFornitore;
  if (!raw || typeof raw !== "object") return "";

  const label = fornitoreLabel.trim();
  if (!label) return "";

  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (k.toLowerCase() === label.toLowerCase() || k === label) {
      const em = (v as Record<string, unknown>).email;
      if (typeof em === "string" && isValidEmail(em)) return em.trim();
    }
  }
  return "";
}

export function resolveOrdineFornitoreSupplierEmail(
  record: Pick<OrdineFornitoreRecord, "fornitoreLabel" | "fornitoreSnapshot">,
  magazzinoMaster?: MagazzinoMasterPrefs | null,
  settingsRows?: AppSettingRow[] | null,
): string {
  let email = resolveSupplierEmailFromSnapshot(record.fornitoreSnapshot ?? {});
  if (email) return email;

  if (settingsRows?.length) {
    email = resolveOrdineFornitoreSupplierEmailFromMagazzinoRows(record.fornitoreLabel, settingsRows);
    if (email) return email;
  }

  const label = record.fornitoreLabel.trim();
  if (!label || !magazzinoMaster?.fornitoreAnagraficaByFornitore) return "";

  const key = label.toLowerCase();
  for (const [k, v] of Object.entries(magazzinoMaster.fornitoreAnagraficaByFornitore)) {
    if (k.toLowerCase() === key || k === label) {
      const raw = v as Record<string, unknown>;
      const em = raw.email;
      if (typeof em === "string" && isValidEmail(em)) return em.trim();
    }
  }
  return "";
}
