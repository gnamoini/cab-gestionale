"use client";

import { CardMobile, CardMobileActions, IconActionButton } from "@/components/design-system";
import { GlobalTable, GlobalTableHeadLabel } from "@/components/gestionale/global-table";
import {
  dsScrollbar,
  dsTableActionBtnPrimary,
  dsTableActionGlyph,
  dsTableActionsGroup,
  dsTableRow,
  dsTableTdActions,
} from "@/lib/ui/design-system";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import {
  fmtPreventivoDataTabella,
  fmtPreventivoMarcaModello,
} from "@/lib/preventivi/preventivi-per-macchina";

/** Allineato a `preventivi-view` (archivio). */
const prevTableTd = "px-2 align-middle text-center";
const prevTableTdCliente =
  "min-w-0 border-l border-zinc-200/90 px-3 align-middle text-center text-zinc-800 dark:border-zinc-700/90 dark:text-zinc-100";

type LavorazionePreventiviHubListProps = {
  rows: PreventivoRecord[];
  onApriNeiPreventivi: (p: PreventivoRecord) => void;
};

function PreventivoIdentCell({ p }: { p: PreventivoRecord }) {
  const targa = p.targa?.trim() || "—";
  const matricola = p.matricola?.trim() || "—";
  const scuderia = p.nScuderia?.trim();
  return (
    <div className="min-w-0 text-left leading-tight">
      <div className="truncate font-mono text-xs font-medium text-zinc-800 dark:text-zinc-100">{targa}</div>
      <div className="truncate font-mono text-[10px] text-zinc-500 dark:text-zinc-400">{matricola}</div>
      {scuderia ? (
        <div className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">N. {scuderia}</div>
      ) : null}
    </div>
  );
}

export function LavorazionePreventiviHubList({ rows, onApriNeiPreventivi }: LavorazionePreventiviHubListProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-[color:var(--cab-text-muted)]">Nessun preventivo passato per questa macchina.</p>;
  }

  return (
    <>
      <GlobalTable
        visibilityClass="hidden xl:block"
        className="w-full min-w-0 text-sm text-zinc-900 dark:text-zinc-100"
        colgroup={
          <>
            <col className="w-[5.25rem]" />
            <col className="w-[5.75rem]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[14%]" />
            <col className="w-[9.75rem]" />
            <col className="w-[10.5rem]" />
          </>
        }
        headRow={
          <>
            <GlobalTableHeadLabel label="N." thClassName="w-[5.25rem] min-w-[5.25rem]" />
            <GlobalTableHeadLabel label="Data" thClassName="w-[5.75rem] min-w-[5.75rem]" />
            <GlobalTableHeadLabel
              label="Cliente"
              thClassName="border-l border-zinc-200/90 pl-3 dark:border-zinc-700/90"
            />
            <GlobalTableHeadLabel label="Cantiere" thClassName="min-w-0 px-2" />
            <GlobalTableHeadLabel label="Utilizzatore" thClassName="min-w-0 px-2" />
            <GlobalTableHeadLabel label="Attrezzatura" thClassName="min-w-0 px-2" />
            <GlobalTableHeadLabel label="Targa / Matricola" thClassName="w-[9.75rem] min-w-[9.75rem] px-2" />
            <GlobalTableHeadLabel label="Azioni" align="center" thClassName="w-[10.5rem] min-w-[10.5rem]" />
          </>
        }
        empty={false}
        colSpan={8}
      >
        {rows.map((p) => (
          <tr key={p.id} className={`${dsTableRow} h-14 bg-white dark:bg-zinc-900/40`}>
            <td
              className={`whitespace-nowrap ${prevTableTd} font-mono text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-100`}
            >
              {p.numero}
            </td>
            <td className={`whitespace-nowrap ${prevTableTd} text-xs tabular-nums text-zinc-600 dark:text-zinc-300`}>
              {fmtPreventivoDataTabella(p.dataCreazione)}
            </td>
            <td className={prevTableTdCliente}>
              <span className="line-clamp-2 break-words text-sm leading-snug">{p.cliente || "—"}</span>
            </td>
            <td className={`min-w-0 ${prevTableTd} text-zinc-700 dark:text-zinc-200`}>
              <span className="line-clamp-2 break-words text-xs leading-snug">{p.cantiere || "—"}</span>
            </td>
            <td className={`min-w-0 ${prevTableTd} text-zinc-700 dark:text-zinc-200`}>
              <span className="line-clamp-2 break-words text-xs leading-snug">{p.utilizzatore || "—"}</span>
            </td>
            <td className={`min-w-0 max-w-[1px] ${prevTableTd} text-zinc-700 dark:text-zinc-200`}>
              <span className="line-clamp-2 break-words text-sm leading-snug">{fmtPreventivoMarcaModello(p)}</span>
            </td>
            <td className={`min-w-0 ${prevTableTd}`}>
              <PreventivoIdentCell p={p} />
            </td>
            <td className={dsTableTdActions}>
              <div className={dsTableActionsGroup}>
                <IconActionButton label="Apri" className={dsTableActionBtnPrimary} onClick={() => onApriNeiPreventivi(p)}>
                  <svg className={dsTableActionGlyph} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 0L21 3m0 0h-5.25M21 3v5.25"
                    />
                  </svg>
                </IconActionButton>
              </div>
            </td>
          </tr>
        ))}
      </GlobalTable>

      <div className={`space-y-3 xl:hidden ${dsScrollbar}`}>
        {rows.map((p) => (
          <CardMobile key={p.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs font-semibold tabular-nums text-[color:var(--cab-text-muted)]">{p.numero}</p>
                <p className="mt-1 text-sm font-semibold text-[color:var(--cab-text)]">{p.cliente || "—"}</p>
                <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">{fmtPreventivoMarcaModello(p)}</p>
              </div>
              <p className="shrink-0 text-xs tabular-nums text-[color:var(--cab-text-muted)]">
                {fmtPreventivoDataTabella(p.dataCreazione)}
              </p>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <div>
                <dt className="text-[color:var(--cab-text-muted)]">Cantiere</dt>
                <dd className="font-medium text-[color:var(--cab-text)]">{p.cantiere || "—"}</dd>
              </div>
              <div>
                <dt className="text-[color:var(--cab-text-muted)]">Utilizzatore</dt>
                <dd className="font-medium text-[color:var(--cab-text)]">{p.utilizzatore || "—"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[color:var(--cab-text-muted)]">Targa / Matricola</dt>
                <dd className="mt-0.5">
                  <PreventivoIdentCell p={p} />
                </dd>
              </div>
            </dl>
            <CardMobileActions>
              <IconActionButton label="Apri" className={dsTableActionBtnPrimary} onClick={() => onApriNeiPreventivi(p)}>
                <svg className={dsTableActionGlyph} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 0L21 3m0 0h-5.25M21 3v5.25"
                  />
                </svg>
              </IconActionButton>
            </CardMobileActions>
          </CardMobile>
        ))}
      </div>
    </>
  );
}
