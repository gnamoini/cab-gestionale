"use client";

import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { dsBtnDanger, dsBtnNeutral } from "@/lib/ui/design-system";
import type { MezzoGestito } from "@/lib/mezzi/types";
import {
  mezzoDeleteBlockedBy,
  mezzoDeleteBlockedByLavorazioni,
  type MezzoDependencies,
} from "@/src/services/mezzi.service";

function mezzoLabel(mezzo: MezzoGestito): string {
  const label = `${mezzo.marca} ${mezzo.modello !== "—" ? mezzo.modello : ""}`.trim();
  return label || mezzo.id.slice(0, 8);
}

function mezzoIdentLine(mezzo: MezzoGestito): string | null {
  const parts: string[] = [];
  const matricola = mezzo.matricola.trim();
  const targa = mezzo.targa.trim();
  if (matricola && matricola !== "Non assegnata") parts.push(matricola);
  if (targa && targa !== "—") parts.push(targa);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function mezzoDeleteSubtitle(mezzo: MezzoGestito): string | undefined {
  const cliente = mezzo.cliente.trim();
  const ident = mezzoIdentLine(mezzo);
  const parts = [cliente, ident].filter(Boolean);
  return parts.length > 0 ? parts.join(" — ") : undefined;
}

function dependencyLines(deps: MezzoDependencies, identityLinkedLavorazione: boolean): string[] {
  const lines: string[] = [];
  if (deps.lavorazioniInCorso > 0) {
    lines.push(
      `${deps.lavorazioniInCorso} lavorazion${deps.lavorazioniInCorso === 1 ? "e in corso" : "i in corso"}`,
    );
  }
  if (deps.lavorazioniArchiviate > 0) {
    lines.push(
      `${deps.lavorazioniArchiviate} lavorazion${deps.lavorazioniArchiviate === 1 ? "e archiviata" : "i archiviate"}`,
    );
  }
  if (
    identityLinkedLavorazione &&
    deps.lavorazioniInCorso === 0 &&
    deps.lavorazioniArchiviate === 0
  ) {
    lines.push("1 lavorazione collegata (identificata per targa, matricola o modello)");
  }
  if (deps.lavorazioniStoriche > 0) {
    lines.push(
      `${deps.lavorazioniStoriche} lavorazion${deps.lavorazioniStoriche === 1 ? "e eliminata" : "i eliminate"} (storico)`,
    );
  }
  if (deps.preventivi > 0) {
    lines.push(`${deps.preventivi} preventiv${deps.preventivi === 1 ? "o" : "i"}`);
  }
  if (deps.schedeAttive > 0) {
    lines.push(`${deps.schedeAttive} sched${deps.schedeAttive === 1 ? "a attiva" : "e attive"}`);
  }
  if (deps.schedeStoriche > 0) {
    lines.push(
      `${deps.schedeStoriche} sched${deps.schedeStoriche === 1 ? "a eliminata" : "e eliminate"} (storico)`,
    );
  }
  if (deps.documenti > 0) {
    lines.push(`${deps.documenti} document${deps.documenti === 1 ? "o" : "i"}`);
  }
  return lines;
}

function hasAnyDependency(deps: MezzoDependencies, identityLinkedLavorazione: boolean): boolean {
  return (
    deps.lavorazioniInCorso +
      deps.lavorazioniArchiviate +
      deps.lavorazioniStoriche +
      deps.preventivi +
      deps.schedeAttive +
      deps.schedeStoriche +
      deps.documenti >
      0 || identityLinkedLavorazione
  );
}

function storicoPurgeMessage(deps: MezzoDependencies): string {
  const sentences: string[] = [];
  if (deps.lavorazioniStoriche > 0) {
    sentences.push(
      deps.lavorazioniStoriche === 1
        ? "La lavorazione già eliminata verrà rimossa definitivamente dal database"
        : `Le ${deps.lavorazioniStoriche} lavorazioni già eliminate verranno rimosse definitivamente dal database`,
    );
  }
  if (deps.schedeStoriche > 0) {
    sentences.push(
      deps.schedeStoriche === 1
        ? "la scheda collegata verrà eliminata definitivamente"
        : `le ${deps.schedeStoriche} schede collegate verranno eliminate definitivamente`,
    );
  }
  if (deps.documenti > 0) {
    sentences.push(
      deps.documenti === 1
        ? "il documento collegato perderà il riferimento al mezzo"
        : `i ${deps.documenti} documenti collegati perderanno il riferimento al mezzo`,
    );
  }
  if (sentences.length === 0) return "";
  const head = sentences[0]!;
  const tail = sentences.slice(1);
  if (tail.length === 0) return `${head}.`;
  return `${head}; ${tail.join("; ")}.`;
}

export function MezzoEliminaConfirmDialog({
  open,
  mezzo,
  deps,
  identityLinkedLavorazione = false,
  loadingDeps,
  onCancel,
  onConfirm,
  pending,
}: {
  open: boolean;
  mezzo: MezzoGestito | null;
  deps: MezzoDependencies | null;
  /** Lavorazione non eliminata collegata per identità (targa/matricola), non solo mezzo_id. */
  identityLinkedLavorazione?: boolean;
  loadingDeps?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  pending?: boolean;
}) {
  if (!open || !mezzo) return null;

  const blockedLavorazioni =
    deps != null
      ? mezzoDeleteBlockedByLavorazioni(deps, identityLinkedLavorazione)
      : identityLinkedLavorazione;
  const blocked = deps != null ? mezzoDeleteBlockedBy(deps, identityLinkedLavorazione) : identityLinkedLavorazione;
  const lines =
    deps != null
      ? dependencyLines(deps, identityLinkedLavorazione)
      : identityLinkedLavorazione
        ? ["1 lavorazione collegata (identificata per targa, matricola o modello)"]
        : [];
  const showDeps =
    (deps != null && hasAnyDependency(deps, identityLinkedLavorazione)) || identityLinkedLavorazione;
  const storicoPurge =
    deps != null &&
    !blockedLavorazioni &&
    deps.lavorazioniStoriche > 0 &&
    deps.preventivi === 0 &&
    !identityLinkedLavorazione;

  return (
    <LavorazioniModalShell
      onRequestClose={pending || loadingDeps ? () => {} : onCancel}
      title={`Eliminare «${mezzoLabel(mezzo)}»?`}
      subtitle={mezzoDeleteSubtitle(mezzo)}
    >
      <div className="p-4 sm:p-6">
        {loadingDeps ? (
          <p className="text-sm text-zinc-500">Verifica collegamenti in corso…</p>
        ) : (
          <>
            {showDeps ? (
              <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
                <p>Questo mezzo è collegato a:</p>
                <ul className="list-inside list-disc space-y-1 pl-1">
                  {lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                {blockedLavorazioni ? (
                  <p className="rounded-md border border-[color:var(--cab-danger)]/30 bg-[color:var(--cab-danger)]/8 px-3 py-2 text-[color:var(--cab-text)]">
                    Elimina la lavorazione collegata dalla sezione Lavorazioni prima di eliminare questo mezzo.
                    Concludere o archiviare la lavorazione non è sufficiente.
                  </p>
                ) : blocked ? (
                  <p className="rounded-md border border-[color:var(--cab-danger)]/30 bg-[color:var(--cab-danger)]/8 px-3 py-2 text-[color:var(--cab-text)]">
                    Impossibile eliminare: restano preventivi collegati.
                  </p>
                ) : storicoPurge && deps ? (
                  <p className="text-[color:var(--cab-text-muted)]">{storicoPurgeMessage(deps)}</p>
                ) : (
                  <p className="text-[color:var(--cab-text-muted)]">
                    Eliminandolo potresti perdere riferimenti storici su documenti o schede collegate.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                Questa operazione è irreversibile.
                <br />
                Il mezzo verrà eliminato definitivamente dal sistema.
              </p>
            )}
          </>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className={dsBtnNeutral} onClick={onCancel} disabled={pending || loadingDeps}>
            Annulla
          </button>
          <button
            type="button"
            className={dsBtnDanger}
            onClick={onConfirm}
            disabled={pending || loadingDeps || blocked}
          >
            {pending ? "Eliminazione…" : "Elimina mezzo"}
          </button>
        </div>
      </div>
    </LavorazioniModalShell>
  );
}
