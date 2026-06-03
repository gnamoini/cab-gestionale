"use client";

import { GestionaleInfoCard, GestionaleInfoRow } from "@/components/design-system/gestionale-info-card";

export function KpiPerformanceCompliance() {
  return (
    <GestionaleInfoCard title="Scadenze e compliance" subtitle="Dati non presenti nel gestionale">
      <GestionaleInfoRow
        label="Revisioni, assicurazioni, collaudi, tagliandi"
        value="Non sono modellati in anagrafica mezzi o in database. Per monitorare la compliance serve un modulo dedicato o campi strutturati su mezzi.meta."
      />
    </GestionaleInfoCard>
  );
}
