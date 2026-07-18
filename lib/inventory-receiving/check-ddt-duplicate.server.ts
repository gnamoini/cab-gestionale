import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { INVENTORY_DOCUMENTS_COLUMNS } from "@/lib/db/table-select-columns";
import { buildDdtSemanticKey } from "@/lib/inventory-receiving/ddt-semantic-key";

export { buildDdtSemanticKey };

export type DdtDuplicateHit = {
  documentId: string;
  documentNumber: string | null;
  supplierLabel: string | null;
  status: string;
};

export async function checkDdtDuplicateByHash(
  sb: SupabaseClient,
  companyId: string,
  contentHash: string,
): Promise<DdtDuplicateHit | null> {
  const hash = contentHash.trim();
  if (!hash) return null;

  const { data } = await sb
    .from("inventory_documents")
    .select(INVENTORY_DOCUMENTS_COLUMNS)
    .eq("company_id", companyId)
    .eq("content_hash", hash)
    .neq("status", "FAILED")
    .maybeSingle();

  if (!data?.id) return null;
  return {
    documentId: data.id,
    documentNumber: data.document_number,
    supplierLabel: data.supplier_label,
    status: data.status,
  };
}

export async function checkDdtDuplicateBySemantic(
  sb: SupabaseClient,
  companyId: string,
  input: { supplierLabel?: string; documentNumber?: string; documentDate?: string },
): Promise<DdtDuplicateHit | null> {
  const number = input.documentNumber?.trim();
  const date = input.documentDate?.trim().slice(0, 10);
  const supplier = input.supplierLabel?.trim();
  if (!number || !date || !supplier) return null;

  const { data } = await sb
    .from("inventory_documents")
    .select(INVENTORY_DOCUMENTS_COLUMNS)
    .eq("company_id", companyId)
    .ilike("supplier_label", supplier)
    .eq("document_number", number)
    .eq("document_date", date)
    .neq("status", "FAILED")
    .maybeSingle();

  if (!data?.id) return null;
  return {
    documentId: data.id,
    documentNumber: data.document_number,
    supplierLabel: data.supplier_label,
    status: data.status,
  };
}
