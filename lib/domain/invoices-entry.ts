"use client";

import { withPageWriteGuard } from "@/lib/domain/with-page-write-guard";
import { invoicesService } from "@/src/services/invoices.service";

export const invoicesEntry = {
  getList: invoicesService.getList.bind(invoicesService),
  getCustomers: invoicesService.getCustomers.bind(invoicesService),
  getDetail: invoicesService.getDetail.bind(invoicesService),
  create: withPageWriteGuard("fatturazione", invoicesService.create.bind(invoicesService)),
  updateDraft: withPageWriteGuard("fatturazione", invoicesService.updateDraft.bind(invoicesService)),
  updateDraftWithRows: withPageWriteGuard("fatturazione", invoicesService.updateDraftWithRows.bind(invoicesService)),
  issue: withPageWriteGuard("fatturazione", invoicesService.issue.bind(invoicesService)),
  registerPayment: withPageWriteGuard("fatturazione", invoicesService.registerPayment.bind(invoicesService)),
  cancel: withPageWriteGuard("fatturazione", invoicesService.cancel.bind(invoicesService)),
  createCreditNote: withPageWriteGuard("fatturazione", invoicesService.createCreditNote.bind(invoicesService)),
  registerCustomerPaymentMulti: withPageWriteGuard(
    "fatturazione",
    invoicesService.registerCustomerPaymentMulti.bind(invoicesService),
  ),
  remove: withPageWriteGuard("fatturazione", invoicesService.remove.bind(invoicesService)),
};

export { invoiceIsDeletable } from "@/src/services/invoices.service";
