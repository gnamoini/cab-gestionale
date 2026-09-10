import "server-only";

import { generateValidatedInvoiceXml, type GeneratedInvoiceXml } from "@/lib/accounting/einvoice";
import { InvoiceBusinessRuleError } from "@/lib/accounting/einvoice/errors/invoice-business-rule-error";
import { InvoiceCanonicalizationError } from "@/lib/accounting/einvoice/errors/invoice-canonicalization-error";
import { InvoiceXmlValidationError } from "@/lib/accounting/einvoice/errors/invoice-xml-validation-error";
import { buildCanonicalInvoice } from "@/lib/fatturazione/einvoice/map-cab-invoice.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { createClient } from "@supabase/supabase-js";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";

export type GenerateXmlError = {
  ok: false;
  code: string;
  message: string;
  issues?: string[];
};

export type GenerateXmlSuccess = { ok: true; result: GeneratedInvoiceXml; xmlDocumentId?: string };

async function assertInvoiceAccess(sb: Awaited<ReturnType<typeof createSupabaseServerUserClient>>, invoiceId: string) {
  const { data, error } = await sb.from("invoices").select("id, company_id, sdi_status").eq("id", invoiceId).maybeSingle();
  if (error || !data) throw new Error("INVOICE_NOT_FOUND");
  const blocked = ["inviata", "accettata", "consegnata"].includes(String(data.sdi_status ?? ""));
  if (blocked) throw new Error("XML_REGENERATION_BLOCKED_POST_TRANSMISSION");
  return data;
}

export async function generateElectronicInvoiceXml(
  invoiceId: string,
  opts?: { persist?: boolean; userId?: string },
): Promise<GenerateXmlSuccess | GenerateXmlError> {
  const userSb = await createSupabaseServerUserClient();
  try {
    await assertInvoiceAccess(userSb, invoiceId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ACCESS_DENIED";
    return { ok: false, code: msg, message: msg };
  }

  let canonical;
  try {
    canonical = await buildCanonicalInvoice(userSb as never, invoiceId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "CANONICALIZATION_FAILED";
    return { ok: false, code: msg, message: msg };
  }

  try {
    const result = generateValidatedInvoiceXml(canonical, { requireCabEnabled: true });

    if (opts?.persist !== false) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = readSupabaseServiceRoleKey();
      if (!url || !key) {
        return { ok: false, code: "SERVICE_CLIENT_UNAVAILABLE", message: "Persistenza XML non configurata" };
      }
      const serviceSb = createClient(url, key);
      const { data: docId, error } = await serviceSb.rpc("store_invoice_xml_document", {
        p_payload: {
          invoice_id: invoiceId,
          xml_content: result.xml,
          xml_sha256: result.sha256,
          schema_version: `${result.transmissionFormat}-${result.schemaVersion}`,
        },
      });
      if (error) {
        return { ok: false, code: "XML_STORE_FAILED", message: error.message };
      }
      return { ok: true, result, xmlDocumentId: String(docId) };
    }

    return { ok: true, result };
  } catch (e) {
    if (e instanceof InvoiceBusinessRuleError || e instanceof InvoiceCanonicalizationError) {
      return { ok: false, code: e.code, message: e.message };
    }
    if (e instanceof InvoiceXmlValidationError) {
      return { ok: false, code: e.code, message: e.message, issues: e.issues };
    }
    const msg = e instanceof Error ? e.message : "XML_GENERATION_FAILED";
    return { ok: false, code: "XML_GENERATION_FAILED", message: msg };
  }
}
