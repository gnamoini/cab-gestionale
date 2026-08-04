"use client";

import { useEffect, useState } from "react";

type CommLogItem = {
  id: string;
  created_at: string;
  template_key: string;
  subject: string;
  status: string;
};

const LABELS: Record<string, string> = {
  "work_order.created": "Scheda ingresso inviata",
  "work_order.completed": "Mezzo pronto",
  "estimate.published": "Preventivo inviato",
  "estimate.approved": "Preventivo confermato",
  "supplier_order.sent": "Ordine inviato",
  "maintenance.reminder": "Promemoria tagliando",
};

export function ClienteComunicazioniPanel({ clienteId }: { clienteId: string }) {
  const [items, setItems] = useState<CommLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clienteId) return;
    setLoading(true);
    fetch(`/api/communications/log?clienteId=${encodeURIComponent(clienteId)}&limit=50`)
      .then(async (res) => {
        const json = await res.json();
        if (res.ok) setItems(json.items ?? []);
      })
      .finally(() => setLoading(false));
  }, [clienteId]);

  if (loading) return <p className="text-sm text-[color:var(--cab-text-muted)]">Caricamento comunicazioni…</p>;
  if (!items.length) return <p className="text-sm text-[color:var(--cab-text-muted)]">Nessuna comunicazione registrata.</p>;

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="rounded-md border border-[color:var(--cab-border)] px-3 py-2 text-sm">
          <div className="font-medium">{LABELS[item.template_key] ?? item.subject ?? item.template_key}</div>
          <div className="text-xs text-[color:var(--cab-text-muted)]">
            {new Date(item.created_at).toLocaleDateString("it-IT")} — {item.status}
          </div>
        </li>
      ))}
    </ul>
  );
}
