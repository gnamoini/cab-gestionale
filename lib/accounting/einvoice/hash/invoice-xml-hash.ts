import { createHash } from "node:crypto";

export function hashInvoiceXml(xml: string): string {
  return createHash("sha256").update(xml, "utf8").digest("hex");
}
