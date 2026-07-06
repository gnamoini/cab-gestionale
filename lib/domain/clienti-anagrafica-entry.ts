"use client";

import { withPageReadGuard, withPageWriteGuard } from "@/lib/domain/with-page-write-guard";
import { clientiAnagraficaService } from "@/src/services/clienti-anagrafica.service";

export const clientiAnagraficaEntry = {
  getByNomeDisplay: clientiAnagraficaService.getByNomeDisplay.bind(clientiAnagraficaService),
  getOwnForClientePortal: withPageReadGuard(
    "lavorazioni_clienti",
    clientiAnagraficaService.getOwnForClientePortal.bind(clientiAnagraficaService),
  ),
  upsert: withPageWriteGuard("impostazioni", clientiAnagraficaService.upsert.bind(clientiAnagraficaService)),
  ensureStub: withPageWriteGuard("impostazioni", clientiAnagraficaService.ensureStub.bind(clientiAnagraficaService)),
  markRemovedFromLista: withPageWriteGuard("impostazioni", clientiAnagraficaService.markRemovedFromLista.bind(clientiAnagraficaService)),
  renameNomeDisplay: withPageWriteGuard("impostazioni", clientiAnagraficaService.renameNomeDisplay.bind(clientiAnagraficaService)),
};
