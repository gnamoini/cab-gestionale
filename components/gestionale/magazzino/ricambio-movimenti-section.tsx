"use client";

import { useQuery } from "@tanstack/react-query";
import { movimentiEntry } from "@/lib/domain/movimenti-entry";
import { RicambioCollapsibleSection } from "@/components/gestionale/magazzino/ricambio-modal-ui";
import { LoadingFormSkeleton } from "@/components/design-system";
import type { MovimentoRicambioRow } from "@/src/types/supabase-tables";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function movementLabel(m: MovimentoRicambioRow): string {
  if (m.meta?.origine === "storno") return "Storno";
  if (m.meta?.origine === "lavorazione") return "Scarico lav.";
  if (m.meta?.origine === "import") return "Import";
  if (m.meta?.origine === "ddt") return "DDT";
  if (m.tipo === "entrata") return "Carico";
  return "Scarico";
}

export function RicambioMovimentiSection({ ricambioId }: { ricambioId: string }) {
  const q = useQuery({
    queryKey: ["movimenti", "ricambio", ricambioId] as const,
    queryFn: async () => {
      const res = await movimentiEntry.getAll({ ricambio_id: ricambioId });
      if (!res.success) throw new Error(res.error ?? "Errore movimenti");
      return res.data ?? [];
    },
    staleTime: 30_000,
  });

  const rows = (q.data ?? []).slice(0, 20);

  return (
    <RicambioCollapsibleSection title="Movimenti magazzino" defaultCollapsed>
      {q.isPending ? (
        <LoadingFormSkeleton fields={2} className="py-1" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun movimento registrato.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[18rem] border-collapse text-xs">
            <thead>
              <tr className="border-b border-[color:var(--cab-border)] text-left text-[color:var(--cab-text-muted)]">
                <th className="whitespace-nowrap py-1 pe-2 font-medium">Data</th>
                <th className="whitespace-nowrap py-1 pe-2 font-medium">Tipo</th>
                <th className="whitespace-nowrap py-1 pe-2 font-medium">Qty</th>
                <th className="whitespace-nowrap py-1 font-medium">Origine</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-[color:color-mix(in_srgb,var(--cab-border)_55%,transparent)]"
                >
                  <td className="whitespace-nowrap py-1.5 pe-2 font-mono tabular-nums">{formatWhen(m.created_at)}</td>
                  <td className="whitespace-nowrap py-1.5 pe-2">{movementLabel(m)}</td>
                  <td className="whitespace-nowrap py-1.5 pe-2 font-mono tabular-nums">
                    {m.tipo === "entrata" ? "+" : "−"}
                    {m.quantita}
                  </td>
                  <td className="whitespace-nowrap py-1.5 text-[color:var(--cab-text-muted)]">
                    {m.meta?.origine ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </RicambioCollapsibleSection>
  );
}
