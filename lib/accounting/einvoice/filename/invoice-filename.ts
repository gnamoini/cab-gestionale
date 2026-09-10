import type { CanonicalElectronicInvoice } from "@/lib/accounting/einvoice/canonical/model";

const FILENAME_SAFE = /[^A-Za-z0-9._-]/g;

function sanitizeSegment(value: string, maxLen = 50): string {
  return value.replace(FILENAME_SAFE, "").slice(0, maxLen) || "0";
}

/** Deterministic FatturaPA XML filename (IT + trasmittente + progressivo). */
export function generateInvoiceXmlFilename(invoice: CanonicalElectronicInvoice): string {
  const country = sanitizeSegment(invoice.transmission.sender.countryCode || "IT", 2);
  const senderId = sanitizeSegment(
    invoice.transmission.sender.vatNumber ?? invoice.transmission.sender.fiscalCode ?? "00000000000",
    16,
  );
  const progressive = sanitizeSegment(invoice.transmission.progressiveTransmissionId, 20);
  const name = `${country}${senderId}_${progressive}.xml`;
  if (name.length > 255) {
    return `${name.slice(0, 251)}.xml`;
  }
  return name;
}
