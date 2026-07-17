import "server-only";

import { cache } from "react";
import {
  fetchFatturazioneOpenItemsServer,
  fetchFatturazionePaymentsServer,
  fetchInvoiceListPayloadServer,
} from "@/lib/fatturazione/fatturazione-fetch-server";
import type { InvoiceListPayload } from "@/lib/fatturazione/types";
import type { ServiceResult } from "@/src/services/service-result";
import type { CustomerOpenItemRow, CustomerPaymentRow } from "@/src/types/supabase-tables";

export type FatturazionePageDTO = {
  list: InvoiceListPayload;
  openItems?: CustomerOpenItemRow[];
  payments?: CustomerPaymentRow[];
};

const emptyList: InvoiceListPayload = {
  invoices: [],
  rows: [],
  links: [],
  payments: [],
  customers: [],
  preventiviBilling: [],
};

function unwrap<T>(result: ServiceResult<T>, fallback: T): T {
  return result.success ? (result.data ?? fallback) : fallback;
}

/** BFF pagina Fatturazione — lista; open-items/payments opzionali (deep link tab). */
export const fetchFatturazionePageDTOServer = cache(
  async (opts?: { includeOpenItems?: boolean; includePayments?: boolean }): Promise<FatturazionePageDTO> => {
    const [listRes, openItemsRes, paymentsRes] = await Promise.all([
      fetchInvoiceListPayloadServer(),
      opts?.includeOpenItems ? fetchFatturazioneOpenItemsServer() : Promise.resolve(null),
      opts?.includePayments ? fetchFatturazionePaymentsServer() : Promise.resolve(null),
    ]);

    const dto: FatturazionePageDTO = {
      list: unwrap(listRes, emptyList),
    };
    if (opts?.includeOpenItems && openItemsRes) {
      dto.openItems = unwrap(openItemsRes, []);
    }
    if (opts?.includePayments && paymentsRes) {
      dto.payments = unwrap(paymentsRes, []);
    }
    return dto;
  },
);
