"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RicambioCollapsibleSection } from "@/components/gestionale/magazzino/ricambio-modal-ui";
import { LoadingFormSkeleton } from "@/components/design-system";
import { fetchOrdiniFornitoriRigheByRicambioId } from "@/lib/ordini-fornitori/ordine-fornitore-by-ricambio-fetch";

function formatDataOrdine(iso: string): string {
  if (!iso.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("it-IT");
}

export function RicambioOrdiniSection({ ricambioId }: { ricambioId: string }) {
  const q = useQuery({
    queryKey: ["ordini-fornitori", "ricambio", ricambioId] as const,
    queryFn: async () => {
      const res = await fetchOrdiniFornitoriRigheByRicambioId(ricambioId);
      if (!res.success) throw new Error(res.error ?? "Errore ordini");
      return res.data ?? [];
    },
    staleTime: 60_000,
  });

  const rows = q.data ?? [];

  return (
    <RicambioCollapsibleSection title="Ordini fornitore" defaultCollapsed>
      {q.isPending ? (
        <LoadingFormSkeleton fields={2} className="py-1" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun ordine collegato a questo ricambio.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[20rem] border-collapse text-xs">
            <thead>
              <tr className="border-b border-[color:var(--cab-border)] text-left text-[color:var(--cab-text-muted)]">
                <th className="whitespace-nowrap py-1 pe-2 font-medium">N°</th>
                <th className="whitespace-nowrap py-1 pe-2 font-medium">Data</th>
                <th className="whitespace-nowrap py-1 pe-2 font-medium">Fornitore</th>
                <th className="whitespace-nowrap py-1 pe-2 font-medium">Qty</th>
                <th className="whitespace-nowrap py-1 font-medium">Stato</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.rigaId} className="border-b border-[color:color-mix(in_srgb,var(--cab-border)_55%,transparent)]">
                  <td className="whitespace-nowrap py-1.5 pe-2 font-mono tabular-nums">
                    <Link
                      href={`/ordini-fornitori?ordine=${encodeURIComponent(r.ordineId)}`}
                      className="text-[color:var(--cab-primary)] hover:underline"
                    >
                      {r.numero}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap py-1.5 pe-2 tabular-nums">{formatDataOrdine(r.dataOrdine)}</td>
                  <td className="max-w-[10rem] truncate py-1.5 pe-2" title={r.fornitoreLabel}>
                    {r.fornitoreLabel || "—"}
                  </td>
                  <td className="whitespace-nowrap py-1.5 pe-2 font-mono tabular-nums">{r.quantita}</td>
                  <td className="whitespace-nowrap py-1.5 capitalize">{r.status || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </RicambioCollapsibleSection>
  );
}
