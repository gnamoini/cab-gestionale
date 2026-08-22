"use client";

import { loadBrandingLogoDataUrl } from "@/lib/branding/branding-logo-for-pdf";
import { openNativeContactHref } from "@/lib/lavorazioni/client-portal-contact";
import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";
import {
  buildOrdineFornitoreMailtoHref,
  classifyOrdineFornitoreShareError,
  ordineFornitoreEmailAttachmentFileName,
  ordineFornitoreEmailDraftBody,
  ordineFornitoreEmailDraftSubject,
  ORDINE_FORNITORE_SUPPLIER_EMAIL_MISSING_MESSAGE,
} from "@/lib/ordini-fornitori/ordine-fornitore-email-draft";
import { resolveOrdineFornitoreSupplierEmail } from "@/lib/ordini-fornitori/ordine-fornitore-supplier-email";
import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";
import type { AppSettingRow } from "@/src/types/supabase-tables";

export type OrdineFornitoreEmailDraftOutcome =
  | { outcome: "shared" }
  | { outcome: "cancelled" }
  | { outcome: "fallback_manual" }
  | { outcome: "error"; message: string };

function triggerPdfDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function runFallbackManual(
  blob: Blob,
  fileName: string,
  email: string,
  record: OrdineFornitoreRecord,
): OrdineFornitoreEmailDraftOutcome {
  triggerPdfDownload(blob, fileName);
  openNativeContactHref(buildOrdineFornitoreMailtoHref(email, record));
  return { outcome: "fallback_manual" };
}

export type OrdineFornitoreEmailDraftNavigator = {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
};

/** ponytail: share OK = OS accepted handoff to mail client, not proof supplier received email. */
export async function tryShareOrdineFornitorePdfDraft(
  file: File,
  subject: string,
  body: string,
  nav: OrdineFornitoreEmailDraftNavigator = typeof navigator !== "undefined" ? navigator : {},
): Promise<"shared" | "cancelled" | "fallback"> {
  if (typeof nav.share !== "function") return "fallback";

  const shareData: ShareData = { title: subject, text: body, files: [file] };
  if (typeof nav.canShare === "function" && !nav.canShare(shareData)) return "fallback";

  try {
    await nav.share(shareData);
    return "shared";
  } catch (err) {
    return classifyOrdineFornitoreShareError(err) === "cancelled" ? "cancelled" : "fallback";
  }
}

export async function openOrdineFornitoreEmailDraft(
  record: OrdineFornitoreRecord,
  magazzinoMaster?: MagazzinoMasterPrefs | null,
  nav?: OrdineFornitoreEmailDraftNavigator,
  settingsRows?: AppSettingRow[] | null,
): Promise<OrdineFornitoreEmailDraftOutcome> {
  const email = resolveOrdineFornitoreSupplierEmail(record, magazzinoMaster, settingsRows);
  if (!email) {
    return { outcome: "error", message: ORDINE_FORNITORE_SUPPLIER_EMAIL_MISSING_MESSAGE };
  }

  const subject = ordineFornitoreEmailDraftSubject(record);
  const body = ordineFornitoreEmailDraftBody();
  const fileName = ordineFornitoreEmailAttachmentFileName(record);

  try {
    const [{ generateOrdineFornitorePdfBytes }, logo] = await Promise.all([
      import("@/lib/ordini-fornitori/ordine-fornitore-pdf-generate"),
      loadBrandingLogoDataUrl(),
    ]);
    const bytes = generateOrdineFornitorePdfBytes(record, logo);
    const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
    const file = new File([blob], fileName, { type: "application/pdf" });

    const shareResult = await tryShareOrdineFornitorePdfDraft(file, subject, body, nav);
    if (shareResult === "shared") return { outcome: "shared" };
    if (shareResult === "cancelled") return { outcome: "cancelled" };
    return runFallbackManual(blob, fileName, email, record);
  } catch {
    return { outcome: "error", message: "Generazione PDF non riuscita." };
  }
}
