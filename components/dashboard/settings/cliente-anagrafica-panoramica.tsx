"use client";

import { LIST_DIVIDER_UL } from "@/lib/ui/list-primitives";
import {
  CLIENTE_CONTATTO_TIPO_LABELS,
  type ClienteAnagrafica,
} from "@/lib/clienti/clienti-anagrafica-types";
import { GestionaleInfoCard } from "@/components/design-system/gestionale-info-card";

function formatSedeLine(fields: ClienteAnagrafica["sedi"]["operativa"]): string {
  const parts = [
    [fields.via, fields.numeroCivico].filter(Boolean).join(" "),
    [fields.cap, fields.citta].filter(Boolean).join(" "),
    fields.provincia,
    fields.stato !== "IT" ? fields.stato : "",
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

function contattoHref(tipo: string, valore: string): string | null {
  const v = valore.trim();
  if (!v) return null;
  if (tipo === "email" || tipo === "pec") return `mailto:${v}`;
  if (tipo === "telefono" || tipo === "cellulare" || tipo === "whatsapp") return `tel:${v.replace(/\s/g, "")}`;
  if (tipo === "sito_web") return /^https?:\/\//i.test(v) ? v : `https://${v}`;
  return null;
}

export function ClienteAnagraficaPanoramica({ model }: { model: ClienteAnagrafica }) {
  const grouped = new Map<string, typeof model.contatti>();
  for (const c of model.contatti) {
    const key = c.etichetta.trim() || "Contatto";
    const list = grouped.get(key) ?? [];
    list.push(c);
    grouped.set(key, list);
  }

  return (
    <div className="space-y-4">
      <GestionaleInfoCard title="Dati generali">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-bold uppercase text-[color:var(--cab-text-muted)]">Cliente (elenco)</dt>
            <dd className="font-medium text-[color:var(--cab-text)]">{model.nomeDisplay || "—"}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase text-[color:var(--cab-text-muted)]">Ragione sociale</dt>
            <dd>{model.ragioneSociale || "—"}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase text-[color:var(--cab-text-muted)]">Partita IVA</dt>
            <dd>{model.partitaIva || "—"}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase text-[color:var(--cab-text-muted)]">Codice destinatario</dt>
            <dd>{model.codiceDestinatario || "—"}</dd>
          </div>
        </dl>
      </GestionaleInfoCard>

      <div className="grid gap-3 md:grid-cols-2">
        <GestionaleInfoCard title="Sede operativa">
          <p className="text-sm text-[color:var(--cab-text)]">{formatSedeLine(model.sedi.operativa)}</p>
        </GestionaleInfoCard>
        <GestionaleInfoCard
          title="Sede legale"
          subtitle={model.sedeLegaleUgualeOperativa ? "Uguale a operativa" : undefined}
        >
          <p className="text-sm text-[color:var(--cab-text)]">
            {formatSedeLine(model.sedeLegaleUgualeOperativa ? model.sedi.operativa : model.sedi.legale)}
          </p>
        </GestionaleInfoCard>
      </div>

      <GestionaleInfoCard title="Contatti">
        {grouped.size === 0 ? (
          <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun contatto registrato.</p>
        ) : (
          <ul className={`${LIST_DIVIDER_UL}`}>
            {[...grouped.entries()].map(([label, items]) => (
              <li key={label} className="py-2 first:pt-0 last:pb-0">
                <p className="text-xs font-semibold text-[color:var(--cab-text)]">{label}</p>
                <ul className="mt-1 space-y-1">
                  {items.map((c) => {
                    const href = contattoHref(c.tipo, c.valore);
                    return (
                      <li key={c.id} className="text-sm text-[color:var(--cab-text-muted)]">
                        <span className="text-[10px] uppercase">{CLIENTE_CONTATTO_TIPO_LABELS[c.tipo]}:</span>{" "}
                        {href ? (
                          <a href={href} className="text-[color:var(--cab-primary)] underline-offset-2 hover:underline">
                            {c.valore}
                          </a>
                        ) : (
                          c.valore
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </GestionaleInfoCard>
    </div>
  );
}
