# Tooltip UX Audit

> Generato: 2026-07-18 — `npm run audit:tooltip`

## Riepilogo

| Metrica | Conteggio |
| ------- | --------- |
| Totale tooltip | 234 |
| REMOVE_DUPLICATE | 0 |
| KEEP_INFORMATIONAL | 31 |
| KEEP_ACCESSIBILITY | 32 |
| KEEP_CONTEXTUAL | 3 |
| MANUAL_REVIEW | 168 |

## Mappa tooltip per route

### /agenda

| File | Linea | Elemento | Testo visibile | Tooltip | Verdict |
| ---- | ----- | -------- | -------------- | ------- | ------- |
| `components/workshop-schedule/agenda-auto-scheduler-panel.tsx` | 46 | Tooltip > Tooltip | — | Apre il form di creazione sessione con orari precompilati | KEEP_INFORMATIONAL |
| `components/workshop-schedule/agenda-capacity-card.tsx` | 26 | Tooltip > Tooltip | — | Percentuale del tempo disponibile già occupata da sessioni pianificate (esclusi blocchi) | KEEP_INFORMATIONAL |
| `components/workshop-schedule/agenda-day-timeline.tsx` | 87 | Tooltip > Tooltip | — | `Crea sessione alle ${label}` | MANUAL_REVIEW |
| `components/workshop-schedule/agenda-filters-bar.tsx` | 62 | Tooltip > Tooltip | — | {hint} | MANUAL_REVIEW |
| `components/workshop-schedule/agenda-filters-bar.tsx` | 168 | Tooltip > Tooltip | — | Il tuo profilo può consultare l'agenda ma non modificare le sessioni | KEEP_INFORMATIONAL |
| `components/workshop-schedule/agenda-filters-bar.tsx` | 173 | Tooltip > Tooltip | — | Filtro attivo dalla lavorazione collegata | KEEP_INFORMATIONAL |
| `components/workshop-schedule/agenda-gantt-view.tsx` | 65 | Tooltip > div | — | row.label | MANUAL_REVIEW |
| `components/workshop-schedule/agenda-gantt-view.tsx` | 73 | Tooltip > button | — | `${bar.title} · ${localTimeLabel(bar.startAt)}–${localTimeLabel(bar.endAt)}` | MANUAL_REVIEW |
| `components/workshop-schedule/agenda-heatmap-grid.tsx` | 56 | Tooltip > Tooltip | — | {tip} | MANUAL_REVIEW |
| `components/workshop-schedule/agenda-intelligence-sidebar.tsx` | 67 | Tooltip > Tooltip | — | Mostra heatmap sopra il pannello attivo | KEEP_INFORMATIONAL |
| `components/workshop-schedule/agenda-intelligence-sidebar.tsx` | 89 | Tooltip > Tooltip | — | p.hint | MANUAL_REVIEW |
| `components/workshop-schedule/agenda-officina-view.tsx` | 238 | Tooltip > Tooltip | — | Crea una nuova sessione o blocco agenda | KEEP_INFORMATIONAL |
| `components/workshop-schedule/agenda-officina-view.tsx` | 387 | Tooltip > Tooltip | — | `Score ${slot.slotScore}% · ${localTimeLabel(slot.startAt)}–${localTimeLabel(slot.endAt)}` | MANUAL_REVIEW |
| `components/workshop-schedule/agenda-session-block.tsx` | 48 | Tooltip > Tooltip | — | PLANNING_STATUS_LABELS[session.planningStatus] | MANUAL_REVIEW |
| `components/workshop-schedule/agenda-session-block.tsx` | 55 | TruncatedTextTooltip > TruncatedTextTooltip | — | session.title | MANUAL_REVIEW |
| `components/workshop-schedule/agenda-session-block.tsx` | 77 | TruncatedTextTooltip > TruncatedTextTooltip | — | {subtitle} | MANUAL_REVIEW |
| `components/workshop-schedule/agenda-session-detail-panel.tsx` | 50 | Tooltip > Tooltip | — | Apri la lavorazione collegata | KEEP_INFORMATIONAL |
| `components/workshop-schedule/agenda-view-tabs.tsx` | 55 | Tooltip > Tooltip | — | {hint} | MANUAL_REVIEW |
| `components/workshop-schedule/agenda-weekly-load-widget.tsx` | 26 | Tooltip > Tooltip | — | `${d.date}: carico ${d.loadPct}%` | MANUAL_REVIEW |

### /dashboard

| File | Linea | Elemento | Testo visibile | Tooltip | Verdict |
| ---- | ----- | -------- | -------------- | ------- | ------- |
| `components/dashboard/dashboard-health-score-ring.tsx` | 315 | IconActionButton | {targetsActionLabel} | {targetsActionLabel} | MANUAL_REVIEW |
| `components/dashboard/dashboard-health-score-ring.tsx` | 455 | Tooltip > Tooltip | — | Variazione rispetto al periodo precedente | KEEP_INFORMATIONAL |
| `components/dashboard/dashboard-tasks-panel.tsx` | 121 | TruncatedTextTooltip > TruncatedTextTooltip | — | task.text | MANUAL_REVIEW |
| `components/dashboard/promemoria/dashboard-promemoria-day-panel.tsx` | 41 | Tooltip > span | ↻ | seriesSummary ?? "Serie ricorrente" | MANUAL_REVIEW |
| `components/dashboard/promemoria/dashboard-promemoria-day-panel.tsx` | 57 | IconActionButton | `Modifica ${row.title}` | `Modifica ${row.title}` | MANUAL_REVIEW |
| `components/dashboard/promemoria/dashboard-promemoria-day-panel.tsx` | 64 | IconActionButton | `Elimina ${row.title}` | `Elimina ${row.title}` | MANUAL_REVIEW |
| `components/dashboard/security/page-access-level-cell.tsx` | 43 | Tooltip > Tooltip | — | {tooltip} | MANUAL_REVIEW |
| `components/dashboard/security/page-access-level-cell.tsx` | 55 | Tooltip > Tooltip | — | `${pageAccessLabel(effectiveLevel)} — clic per cambiare` | MANUAL_REVIEW |
| `components/dashboard/security/security-monitoring-section.tsx` | 89 | Tooltip > td | — | r.user_agent ?? "" | MANUAL_REVIEW |
| `components/dashboard/security/security-monitoring-section.tsx` | 291 | Tooltip > td | — | row.detail | MANUAL_REVIEW |
| `components/dashboard/security/security-page-matrix-editor.tsx` | 50 | Tooltip > th | — | p.label | MANUAL_REVIEW |
| `components/dashboard/security/security-release-section.tsx` | 110 | Tooltip > button | Toggle UI (env): | L'env non è modificabile dalla UI. | KEEP_INFORMATIONAL |
| `components/dashboard/security/security-users-permissions-panel.tsx` | 368 | Tooltip > button | — | hasClienteAssociationViolations ? "Correggi le associazioni cliente prima di salvare." : undefined | MANUAL_REVIEW |
| `components/dashboard/security/security-users-table.tsx` | 160 | Tooltip > div | @ | {title} | MANUAL_REVIEW |
| `components/dashboard/security/security-users-table.tsx` | 244 | Tooltip > span | — | row.clienteRef ?? undefined | MANUAL_REVIEW |
| `components/dashboard/security/security-users-table.tsx` | 295 | IconActionButton | Modifica profilo | Modifica profilo | KEEP_ACCESSIBILITY |
| `components/dashboard/security/security-users-table.tsx` | 304 | IconActionButton | Dettaglio utente | Dettaglio utente | KEEP_ACCESSIBILITY |
| `components/dashboard/settings-branding-section.tsx` | 58 | Tooltip > button | Selettore colore principale | Selettore colore principale | KEEP_ACCESSIBILITY |
| `components/dashboard/settings-dipendenti-assenze-section.tsx` | 44 | Tooltip > Tooltip | — | {ASSENZA_ALTRO_MOTIVO_TOOLTIP} | MANUAL_REVIEW |
| `components/dashboard/settings-list-ui.tsx` | 517 | IconActionButton | `Conferma modifica ${itemLabel}` | `Conferma modifica ${itemLabel}` | MANUAL_REVIEW |
| `components/dashboard/settings-list-ui.tsx` | 525 | IconActionButton | `Annulla modifica ${itemLabel}` | `Annulla modifica ${itemLabel}` | MANUAL_REVIEW |
| `components/dashboard/settings-list-ui.tsx` | 534 | IconActionButton | `Elimina ${itemLabel}` | {removeTooltipContent} | MANUAL_REVIEW |
| `components/dashboard/settings-list-ui.tsx` | 551 | IconActionButton | `Modifica ${itemLabel}` | `Modifica ${itemLabel}` | MANUAL_REVIEW |
| `components/dashboard/settings-list-ui.tsx` | 559 | IconActionButton | `Elimina ${itemLabel}` | {removeTooltipContent} | MANUAL_REVIEW |
| `components/dashboard/settings-rinomina-propaga-dialog.tsx` | 30 | Tooltip > button | Solo configurazione | Salva solo in configurazione, senza aggiornare i record esistenti | KEEP_INFORMATIONAL |
| `components/dashboard/settings-rinomina-propaga-dialog.tsx` | 33 | Tooltip > button | — | Aggiorna mezzi, preventivi, schede e altri record collegati | KEEP_INFORMATIONAL |
| `components/dashboard/settings/settings-overview-section.tsx` | 42 | TruncatedTextTooltip > TruncatedTextTooltip | — | item.label | MANUAL_REVIEW |
| `components/dashboard/settings/settings-overview-section.tsx` | 52 | TruncatedTextTooltip > TruncatedTextTooltip | — | AI Providers | KEEP_INFORMATIONAL |
| `components/dashboard/widgets/dashboard-operational-kpi-header-widget.tsx` | 145 | Tooltip > span | — | `Variazione rispetto al ${periodLabel} (${prevLabel})` | MANUAL_REVIEW |

### /design-system

| File | Linea | Elemento | Testo visibile | Tooltip | Verdict |
| ---- | ----- | -------- | -------------- | ------- | ------- |
| `components/design-system/close-button.tsx` | 35 | OptionalTooltip > OptionalTooltip | — | {tip} | MANUAL_REVIEW |
| `components/design-system/disabled-element-tooltip.tsx` | 25 | Tooltip > Tooltip | — | {content} | MANUAL_REVIEW |
| `components/design-system/icon-action-button.tsx` | 65 | Tooltip > Tooltip | — | {content} | MANUAL_REVIEW |
| `components/design-system/icon-action-button.tsx` | 79 | Tooltip > Tooltip | — | {content} | MANUAL_REVIEW |
| `components/design-system/icon-button.tsx` | 28 | OptionalTooltip > OptionalTooltip | — | {content} | MANUAL_REVIEW |
| `components/design-system/log-entry.tsx` | 182 | Tooltip > Tooltip | — | {title} | MANUAL_REVIEW |
| `components/design-system/optional-tooltip.tsx` | 15 | Tooltip > Tooltip | — | {content} | MANUAL_REVIEW |
| `components/design-system/page-toolbar.tsx` | 266 | <button title> | — | native title | KEEP_INFORMATIONAL |
| `components/design-system/shell-nav-icon-button.tsx` | 25 | OptionalTooltip > OptionalTooltip | — | {tip} | MANUAL_REVIEW |
| `components/design-system/shell-nav-icon-button.tsx` | 47 | OptionalTooltip > OptionalTooltip | — | {tip} | MANUAL_REVIEW |
| `components/design-system/toolbar-group.tsx` | 110 | Tooltip > span | — | Filtri attivi | KEEP_INFORMATIONAL |
| `components/design-system/truncated-text-tooltip.tsx` | 50 | Tooltip > Tooltip | — | {text} | MANUAL_REVIEW |

### /dipendenti

| File | Linea | Elemento | Testo visibile | Tooltip | Verdict |
| ---- | ----- | -------- | -------------- | ------- | ------- |
| `components/gestionale/dipendenti/dipendenti-pdf-toolbar.tsx` | 48 | Tooltip > button | — | needsAddetto ? "Seleziona un addetto nei filtri per esportare il PDF dipendente" : undefined | MANUAL_REVIEW |
| `components/gestionale/dipendenti/dipendenti-storico-section.tsx` | 93 | Tooltip > div | — | `${m.monthLabel}: ${m.totaleLavorato} h` | MANUAL_REVIEW |
| `components/gestionale/dipendenti/dipendenti-timesheet-compact-cell.tsx` | 54 | Tooltip > Tooltip | — | {tooltipLabel} | MANUAL_REVIEW |
| `components/gestionale/dipendenti/dipendenti-timesheet-grid.tsx` | 532 | Tooltip > Tooltip | — | formatTimesheetDayColumnTooltip(d, monthKey) | MANUAL_REVIEW |
| `components/gestionale/dipendenti/dipendenti-timesheet-grid.tsx` | 561 | Tooltip > Tooltip | — | Totali ore del mese (presenze in riga sopra, assenze in riga sotto) | KEEP_INFORMATIONAL |
| `components/gestionale/dipendenti/dipendenti-timesheet-grid.tsx` | 587 | Tooltip > Tooltip | — | buildTimesheetEmployeeNameTooltip(emp.display_name, {
                           | MANUAL_REVIEW |
| `components/gestionale/dipendenti/dipendenti-timesheet-grid.tsx` | 650 | Tooltip > Tooltip | — | `${emp.display_name} · Totale presenze mese: ${totals.totaleLavorato > 0 ? `${totals.totaleLavorato}h` : "—"}` | MANUAL_REVIEW |
| `components/gestionale/dipendenti/dipendenti-timesheet-grid.tsx` | 697 | Tooltip > Tooltip | — | `${emp.display_name} · Totale assenze mese: ${totals.oreAssenza > 0 ? `${totals.oreAssenza}h` : "—"}` | MANUAL_REVIEW |
| `components/gestionale/dipendenti/dipendenti-timesheet-grid.tsx` | 737 | Tooltip > Tooltip | — | formatTimesheetFooterDayTooltip(
                        d,
                     | MANUAL_REVIEW |
| `components/gestionale/dipendenti/dipendenti-timesheet-grid.tsx` | 758 | Tooltip > Tooltip | — | formatTimesheetFooterMonthTooltip(monthKey, "work", globalTotals.totaleLavorato) | MANUAL_REVIEW |
| `components/gestionale/dipendenti/dipendenti-timesheet-grid.tsx` | 788 | Tooltip > Tooltip | — | formatTimesheetFooterDayTooltip(
                        d,
                     | MANUAL_REVIEW |
| `components/gestionale/dipendenti/dipendenti-timesheet-grid.tsx` | 809 | Tooltip > Tooltip | — | formatTimesheetFooterMonthTooltip(monthKey, "absence", globalTotals.oreAssenza) | MANUAL_REVIEW |
| `components/gestionale/dipendenti/timesheet-cell-editor-popover.tsx` | 138 | Tooltip > button | Copia per tutti | !validation.ok ? validation.errors[0] : undefined | MANUAL_REVIEW |
| `components/gestionale/dipendenti/timesheet-cell-editor-popover.tsx` | 146 | Tooltip > button | — | !validation.ok ? validation.errors[0] : undefined | MANUAL_REVIEW |
| `components/gestionale/dipendenti/timesheet-header.tsx` | 245 | Tooltip > button | Oggi | Vai al mese corrente e evidenzia la colonna di oggi | KEEP_CONTEXTUAL |
| `components/gestionale/dipendenti/timesheet-header.tsx` | 249 | Tooltip > button | — | fillToday8hDisabled && fillToday8hDisabledReason
                              ? fillToday8hDisabledReason
                              : "Imposta 8 ore ordinarie per oggi su tutte le celle vuote d | MANUAL_REVIEW |

### /documenti

| File | Linea | Elemento | Testo visibile | Tooltip | Verdict |
| ---- | ----- | -------- | -------------- | ------- | ------- |
| `components/gestionale/documenti/documenti-modals.tsx` | 541 | OptionalTooltip > OptionalTooltip | — | !canDelete ? "Sola lettura" : undefined | MANUAL_REVIEW |
| `components/gestionale/documenti/documenti-modals.tsx` | 546 | OptionalTooltip > OptionalTooltip | — | !canEdit ? "Sola lettura" : undefined | MANUAL_REVIEW |
| `components/gestionale/documenti/documenti-view.tsx` | 233 | Tooltip > div | — | `${labelCategoria(doc.categoria)} · ${labelTipoFile(doc.tipoFile)}` | MANUAL_REVIEW |
| `components/gestionale/documenti/documenti-view.tsx` | 280 | IconActionButton | canOpen ? "Apri" : unavailableHint | canOpen ? "Apri" : unavailableHint | MANUAL_REVIEW |
| `components/gestionale/documenti/documenti-view.tsx` | 294 | IconActionButton | Importa in magazzino | Importa in magazzino | KEEP_ACCESSIBILITY |
| `components/gestionale/documenti/documenti-view.tsx` | 308 | IconActionButton | Info | Info | KEEP_ACCESSIBILITY |
| `components/gestionale/documenti/documenti-view.tsx` | 348 | TruncatedTextTooltip > TruncatedTextTooltip | — | doc.nome | MANUAL_REVIEW |
| `components/gestionale/documenti/documenti-view.tsx` | 351 | Tooltip > span | File non collegato | {unavailableHint} | MANUAL_REVIEW |
| `components/gestionale/documenti/documenti-view.tsx` | 356 | Tooltip > span | ⚠️ Senza marca | Assegna una marca per collocare il documento nell'archivio | KEEP_INFORMATIONAL |
| `components/gestionale/documenti/documenti-view.tsx` | 912 | OptionalTooltip > OptionalTooltip | — | !canUploadDocuments ? READONLY_PERMISSION_HINT : undefined | MANUAL_REVIEW |
| `components/gestionale/documenti/listino-import-preview-modal.tsx` | 350 | Tooltip > span | IA | Categoria suggerita da IA | KEEP_CONTEXTUAL |

### /impostazioni

| File | Linea | Elemento | Testo visibile | Tooltip | Verdict |
| ---- | ----- | -------- | -------------- | ------- | ------- |
| `components/data-import/data-import-export-toolbar.tsx` | 198 | OptionalTooltip > OptionalTooltip | — | item.title !== item.label ? item.title : undefined | MANUAL_REVIEW |
| `components/data-import/data-import-export-toolbar.tsx` | 308 | OptionalTooltip > OptionalTooltip | — | item.title !== item.label ? item.title : undefined | MANUAL_REVIEW |
| `components/data-import/data-import-wizard-modal.tsx` | 388 | Tooltip > td | — | {label} | MANUAL_REVIEW |

### /lavorazioni

| File | Linea | Elemento | Testo visibile | Tooltip | Verdict |
| ---- | ----- | -------- | -------------- | ------- | ------- |
| `components/document-capture/scheda-blank-pdf-actions.tsx` | 32 | Tooltip > Tooltip | — | Scarica una scheda vuota da stampare | KEEP_INFORMATIONAL |
| `components/gestionale/lavorazioni/copia-ultima-scheda-ingresso-banner.tsx` | 90 | Tooltip > Tooltip | — | disabled
              ? disabledTitle
              : mezzoInAnagraficaOnly
                ? "Nessuna scheda ingresso precedente da copiare"
                : "Copia campi dall’ultima scheda ing | MANUAL_REVIEW |
| `components/gestionale/lavorazioni/lavorazione-costo-discreto.tsx` | 92 | Tooltip > button | 💰  Costo totale | Costo interno lavorazione (solo staff) | KEEP_INFORMATIONAL |
| `components/gestionale/lavorazioni/lavorazione-mobile-cards.tsx` | 221 | IconActionButton | Concludi | {concludiTooltip} | MANUAL_REVIEW |
| `components/gestionale/lavorazioni/lavorazione-mobile-cards.tsx` | 231 | IconActionButton | Informazioni | Informazioni | KEEP_ACCESSIBILITY |
| `components/gestionale/lavorazioni/lavorazione-mobile-cards.tsx` | 239 | IconActionButton | Schede | Schede | KEEP_ACCESSIBILITY |
| `components/gestionale/lavorazioni/lavorazione-mobile-cards.tsx` | 346 | IconActionButton | Ripristina | canEditWorkOrders ? undefined : "Sola lettura" | MANUAL_REVIEW |
| `components/gestionale/lavorazioni/lavorazione-mobile-cards.tsx` | 355 | IconActionButton | Informazioni | Informazioni | KEEP_ACCESSIBILITY |
| `components/gestionale/lavorazioni/lavorazione-mobile-cards.tsx` | 362 | IconActionButton | Schede | Schede | KEEP_ACCESSIBILITY |
| `components/gestionale/lavorazioni/lavorazione-table-row.tsx` | 249 | IconActionButton | Concludi | row.stato === "completata" ? undefined : "Imposta come completata per archiviarla" | MANUAL_REVIEW |
| `components/gestionale/lavorazioni/lavorazione-table-row.tsx` | 261 | IconActionButton | Informazioni | Informazioni | KEEP_ACCESSIBILITY |
| `components/gestionale/lavorazioni/lavorazione-table-row.tsx` | 269 | IconActionButton | Schede | Schede | KEEP_ACCESSIBILITY |
| `components/gestionale/lavorazioni/lavorazione-table-row.tsx` | 394 | IconActionButton | Ripristina | canEditWorkOrders ? undefined : "Sola lettura" | MANUAL_REVIEW |
| `components/gestionale/lavorazioni/lavorazione-table-row.tsx` | 403 | IconActionButton | Informazioni | Informazioni | KEEP_ACCESSIBILITY |
| `components/gestionale/lavorazioni/lavorazione-table-row.tsx` | 410 | IconActionButton | Schede | Schede | KEEP_ACCESSIBILITY |
| `components/gestionale/lavorazioni/lavorazioni-inline-select.tsx` | 232 | Tooltip > button | — | Modifica data completamento | KEEP_INFORMATIONAL |
| `components/gestionale/lavorazioni/lavorazioni-inline-select.tsx` | 307 | Tooltip > Tooltip | — | {tooltip} | MANUAL_REVIEW |
| `components/gestionale/lavorazioni/lavorazioni-page-toolbar.tsx` | 268 | Tooltip > Tooltip | — | !canEditWorkOrders
                    ? READONLY_PERMISSION_HINT
                    : !createdBy
                      ? "Accedi per creare una lavorazione."
                      : undefined | MANUAL_REVIEW |
| `components/gestionale/lavorazioni/lavorazioni-settings-ui.tsx` | 305 | Tooltip > Tooltip | — | {tip} | MANUAL_REVIEW |
| `components/gestionale/lavorazioni/lavorazioni-settings-ui.tsx` | 371 | IconActionButton | `Sposta su ${itemLabel}` | `Sposta su ${itemLabel}` | MANUAL_REVIEW |
| `components/gestionale/lavorazioni/lavorazioni-settings-ui.tsx` | 379 | IconActionButton | `Sposta giù ${itemLabel}` | `Sposta giù ${itemLabel}` | MANUAL_REVIEW |
| `components/gestionale/lavorazioni/lavorazioni-settings-ui.tsx` | 575 | Tooltip > span | — | Anteprima pill in tabella e Kanban | KEEP_INFORMATIONAL |
| `components/gestionale/lavorazioni/lavorazioni-settings-ui.tsx` | 738 | Tooltip > span | — | Anteprima pill in tabella e Kanban | KEEP_INFORMATIONAL |
| `components/gestionale/lavorazioni/lavorazioni-settings-ui.tsx` | 932 | Tooltip > span | — | Anteprima come in tabella lavorazioni | KEEP_INFORMATIONAL |
| `components/gestionale/lavorazioni/lavorazioni-table-shared.tsx` | 250 | TruncatedTextTooltip > TruncatedTextTooltip | — | {cliente} | MANUAL_REVIEW |
| `components/gestionale/lavorazioni/lavorazioni-table-shared.tsx` | 255 | TruncatedTextTooltip > TruncatedTextTooltip | — | utilizzatore.trim() | MANUAL_REVIEW |
| `components/gestionale/lavorazioni/lavorazioni-table-shared.tsx` | 297 | TruncatedTextTooltip > TruncatedTextTooltip | — | {t} | MANUAL_REVIEW |
| `components/gestionale/lavorazioni/lavorazioni-table-shared.tsx` | 326 | TruncatedTextTooltip > TruncatedTextTooltip | — | {text} | MANUAL_REVIEW |
| `components/gestionale/lavorazioni/scheda-ingresso-form-modal.tsx` | 188 | Tooltip > Tooltip | — | hasFirma ? "Modifica firma" : "Acquisisci firma" | MANUAL_REVIEW |
| `components/lavorazioni/schede/lavorazione-preventivi-hub-list.tsx` | 93 | OptionalTooltip > button | Crea preventivo | disabled ? disabledTitle : undefined | MANUAL_REVIEW |
| `components/lavorazioni/schede/lavorazione-preventivi-hub-list.tsx` | 202 | IconActionButton | Apri | Apri | KEEP_ACCESSIBILITY |
| `components/lavorazioni/schede/schede-lavorazione-modal.tsx` | 1367 | OptionalTooltip > OptionalTooltip | — | !canEditWorkOrders ? READONLY_PERMISSION_HINT : undefined | MANUAL_REVIEW |
| `components/lavorazioni/schede/schede-lavorazione-modal.tsx` | 1410 | Tooltip > button | Crea | !preventiviPerm.canWrite
                        ? "Non hai permesso di creare preventivi"
                        : !canEditWorkOrders
                          ? READONLY_PERMISSION_HINT
            | MANUAL_REVIEW |
| `components/lavorazioni/schede/schede-lavorazione-modal.tsx` | 1714 | OptionalTooltip > OptionalTooltip | — | !canEdit ? READONLY_PERMISSION_HINT : undefined | MANUAL_REVIEW |
| `components/lavorazioni/schede/schede-lavorazione-modal.tsx` | 1723 | OptionalTooltip > OptionalTooltip | — | !canEdit ? READONLY_PERMISSION_HINT : undefined | MANUAL_REVIEW |
| `components/lavorazioni/schede/schede-lavorazione-modal.tsx` | 1738 | OptionalTooltip > OptionalTooltip | — | !canEdit ? READONLY_PERMISSION_HINT : undefined | MANUAL_REVIEW |

### /lavorazioni-clienti

| File | Linea | Elemento | Testo visibile | Tooltip | Verdict |
| ---- | ----- | -------- | -------------- | ------- | ------- |
| `components/lavorazioni-clienti/client-lavorazione-documents.tsx` | 27 | Tooltip > span | — | doc.filename | MANUAL_REVIEW |
| `components/lavorazioni-clienti/client-lavorazioni-view.tsx` | 186 | IconActionButton | Scheda ingresso | Scheda ingresso | KEEP_ACCESSIBILITY |
| `components/lavorazioni-clienti/client-lavorazioni-view.tsx` | 196 | IconActionButton | QR lavorazione | QR lavorazione | KEEP_ACCESSIBILITY |
| `components/lavorazioni-clienti/client-lavorazioni-view.tsx` | 206 | IconActionButton | Informazioni e avanzamento | Informazioni e avanzamento | KEEP_ACCESSIBILITY |
| `components/lavorazioni-clienti/client-portal-stato-progress.tsx` | 120 | Tooltip > Tooltip | — | {tooltipContent} | MANUAL_REVIEW |

### /magazzino

| File | Linea | Elemento | Testo visibile | Tooltip | Verdict |
| ---- | ----- | -------- | -------------- | ------- | ------- |
| `components/gestionale/magazzino/magazzino-giacenza-bell.tsx` | 88 | Tooltip > Tooltip | — | {alertLabel} | MANUAL_REVIEW |
| `components/gestionale/magazzino/magazzino-import-entry.tsx` | 62 | Tooltip > Tooltip | — | inactive ? "Sola lettura" : "Importa" | MANUAL_REVIEW |
| `components/gestionale/magazzino/magazzino-listino-ai-badge.tsx` | 29 | Tooltip > Tooltip | — | {label} | MANUAL_REVIEW |
| `components/gestionale/magazzino/magazzino-modals.tsx` | 87 | DisabledElementTooltip > DisabledElementTooltip | — | magCanCreateRicambio ? "Modifica" : READONLY_PERMISSION_HINT | MANUAL_REVIEW |
| `components/gestionale/magazzino/magazzino-scorta-adjust-actions.tsx` | 51 | IconActionButton | Diminuisci | {readonlyTip} | MANUAL_REVIEW |
| `components/gestionale/magazzino/magazzino-scorta-adjust-actions.tsx` | 60 | IconActionButton | Aumenta | {readonlyTip} | MANUAL_REVIEW |
| `components/gestionale/magazzino/magazzino-view.tsx` | 1458 | Tooltip > Tooltip | — | stale
                  ? `${formatTimestampHover(p.dataUltimaModifica)} · ${MAGAZZINO_STALE_MODIFICA_HINT}`
                  : formatTimestampHover(p.dataUltimaModifica) | MANUAL_REVIEW |
| `components/gestionale/magazzino/magazzino-view.tsx` | 1484 | OptionalTooltip > OptionalTooltip | — | magazzinoConsumoMedioTooltip(consumoRow, avgM) | MANUAL_REVIEW |
| `components/gestionale/magazzino/magazzino-view.tsx` | 1492 | IconActionButton | Info | Info | KEEP_ACCESSIBILITY |
| `components/gestionale/magazzino/magazzino-view.tsx` | 1600 | DisabledElementTooltip > DisabledElementTooltip | — | magCanCreateRicambio ? "Aggiungi un ricambio" : "Sola lettura" | MANUAL_REVIEW |
| `components/gestionale/magazzino/magazzino-view.tsx` | 1878 | Tooltip > Tooltip | — | low ? "Sotto scorta minima" : "Giacenza" | MANUAL_REVIEW |
| `components/gestionale/magazzino/magazzino-view.tsx` | 1903 | OptionalTooltip > OptionalTooltip | — | magazzinoConsumoMedioTooltip(consumoRow, avgM) | MANUAL_REVIEW |
| `components/gestionale/magazzino/magazzino-view.tsx` | 1912 | Tooltip > Tooltip | — | staleModifica
                        ? `${formatTimestampHover(p.dataUltimaModifica)} · ${MAGAZZINO_STALE_MODIFICA_HINT}`
                        : formatTimestampHover(p.dataUltimaModifica) | MANUAL_REVIEW |
| `components/gestionale/magazzino/magazzino-view.tsx` | 1950 | IconActionButton | Info | Info | KEEP_ACCESSIBILITY |
| `components/gestionale/magazzino/ricambio-edit-modal.tsx` | 233 | DisabledElementTooltip > DisabledElementTooltip | — | magCanDeleteRicambio ? "Elimina ricambio" : READONLY_PERMISSION_HINT | MANUAL_REVIEW |
| `components/gestionale/magazzino/ricambio-info-panel.tsx` | 62 | OptionalTooltip > OptionalTooltip | — | {autonomiaTooltip} | MANUAL_REVIEW |
| `components/gestionale/magazzino/ricambio-label-actions.tsx` | 184 | DisabledElementTooltip > DisabledElementTooltip | — | canRead ? "Etichetta QR" : READONLY_PERMISSION_HINT | MANUAL_REVIEW |
| `components/ordini-fornitori/ordine-fornitore-editor-modal.tsx` | 560 | OptionalTooltip > OptionalTooltip | — | !canWrite ? READONLY_PERMISSION_HINT : undefined | MANUAL_REVIEW |
| `components/ordini-fornitori/ordine-fornitore-editor-modal.tsx` | 570 | OptionalTooltip > OptionalTooltip | — | !canWrite ? READONLY_PERMISSION_HINT : undefined | MANUAL_REVIEW |
| `components/ordini-fornitori/ordine-fornitore-editor-modal.tsx` | 582 | OptionalTooltip > button | — | !canWrite ? READONLY_PERMISSION_HINT : undefined | MANUAL_REVIEW |
| `components/ordini-fornitori/ordine-fornitore-editor-modal.tsx` | 819 | IconActionButton | Elimina riga | Elimina riga | KEEP_ACCESSIBILITY |
| `components/ordini-fornitori/ordine-fornitore-editor-modal.tsx` | 923 | IconActionButton | Elimina spesa | Elimina spesa | KEEP_ACCESSIBILITY |
| `components/ordini-fornitori/ordini-fornitori-view.tsx` | 377 | OptionalTooltip > OptionalTooltip | — | !canWrite ? READONLY_PERMISSION_HINT : undefined | MANUAL_REVIEW |
| `components/ordini-fornitori/ordini-fornitori-view.tsx` | 559 | IconActionButton | Visualizza | Visualizza | KEEP_ACCESSIBILITY |
| `components/ordini-fornitori/ordini-fornitori-view.tsx` | 569 | IconActionButton | Duplica | !canWrite ? READONLY_PERMISSION_HINT : undefined | MANUAL_REVIEW |
| `components/ordini-fornitori/ordini-fornitori-view.tsx` | 580 | IconActionButton | PDF | PDF | KEEP_ACCESSIBILITY |
| `components/ordini-fornitori/ordini-fornitori-view.tsx` | 589 | IconActionButton | Elimina | !canWrite ? READONLY_PERMISSION_HINT : undefined | MANUAL_REVIEW |
| `components/ordini-fornitori/ordini-fornitori-view.tsx` | 601 | OptionalTooltip > button | Annulla | !canWrite ? READONLY_PERMISSION_HINT : undefined | MANUAL_REVIEW |
| `components/ordini-fornitori/ordini-fornitori-view.tsx` | 645 | OptionalTooltip > button | Duplica | !canWrite ? READONLY_PERMISSION_HINT : undefined | MANUAL_REVIEW |
| `components/ordini-fornitori/ordini-fornitori-view.tsx` | 648 | OptionalTooltip > button | Elimina | !canWrite ? READONLY_PERMISSION_HINT : undefined | MANUAL_REVIEW |

### /mezzi

| File | Linea | Elemento | Testo visibile | Tooltip | Verdict |
| ---- | ----- | -------- | -------------- | ------- | ------- |
| `components/gestionale/mezzi/mezzi-hub-detail-modal.tsx` | 249 | Tooltip > button | Modifica | !canEdit
                    ? READONLY_PERMISSION_HINT
                    : mezzo.hubSynthetic
                      ? "Registra il mezzo in anagrafica per abilitare la modifica"
                | MANUAL_REVIEW |
| `components/gestionale/mezzi/mezzi-table.tsx` | 225 | IconActionButton | Info | Info | KEEP_ACCESSIBILITY |
| `components/gestionale/mezzi/mezzi-table.tsx` | 228 | IconActionButton | Documenti | Documenti | KEEP_ACCESSIBILITY |
| `components/gestionale/mezzi/mezzi-table.tsx` | 236 | IconActionButton | Lavorazioni | Lavorazioni | KEEP_ACCESSIBILITY |
| `components/gestionale/mezzi/mezzi-table.tsx` | 244 | IconActionButton | Preventivi | Preventivi | KEEP_ACCESSIBILITY |
| `components/gestionale/mezzi/mezzi-table.tsx` | 458 | Tooltip > Tooltip | — | modificaTooltip ?? undefined | MANUAL_REVIEW |
| `components/gestionale/mezzi/mezzi-tagliandi-matrix-table.tsx` | 149 | <button title> | — | native title | KEEP_INFORMATIONAL |
| `components/gestionale/mezzi/mezzi-view.tsx` | 643 | Tooltip > Tooltip | — | canEditVehicles ? "Registra un nuovo mezzo in anagrafica" : READONLY_PERMISSION_HINT | MANUAL_REVIEW |

### /preventivi

| File | Linea | Elemento | Testo visibile | Tooltip | Verdict |
| ---- | ----- | -------- | -------------- | ------- | ------- |
| `components/preventivi/preventivi-view.tsx` | 245 | IconActionButton | Lavorazione | Lavorazione | KEEP_ACCESSIBILITY |
| `components/preventivi/preventivi-view.tsx` | 254 | IconActionButton | Modifica | !canEditWorkOrders ? "Sola lettura" : undefined | MANUAL_REVIEW |
| `components/preventivi/preventivi-view.tsx` | 264 | IconActionButton | activeDdt ? "Apri DDT" : "Genera DDT" | activeDdt ? "Apri DDT" : "Genera DDT" | MANUAL_REVIEW |
| `components/preventivi/preventivi-view.tsx` | 276 | IconActionButton | PDF | PDF | KEEP_ACCESSIBILITY |
| `components/preventivi/preventivi-view.tsx` | 287 | IconActionButton | Elimina | !canDeleteRecords ? "Sola lettura" : undefined | MANUAL_REVIEW |
| `components/preventivi/preventivi-view.tsx` | 743 | Tooltip > span | — | preventivoTipoDocumentoLabel(p.tipoDocumento) | MANUAL_REVIEW |
| `components/preventivi/preventivi-view.tsx` | 767 | Tooltip > span | — | p.nScuderia \|\| undefined | MANUAL_REVIEW |
| `components/preventivi/preventivi-view.tsx` | 1072 | Tooltip > Tooltip | — | canEditWorkOrders ? "Crea un preventivo senza collegamento a lavorazione" : READONLY_PERMISSION_HINT | MANUAL_REVIEW |
| `components/preventivi/preventivo-lavorazioni-editor-section.tsx` | 199 | IconActionButton | Rimuovi addetto | Rimuovi addetto | KEEP_ACCESSIBILITY |
| `components/preventivi/preventivo-ricambi-editor-section.tsx` | 173 | IconActionButton | Elimina riga | Elimina riga | KEEP_ACCESSIBILITY |

### /report

| File | Linea | Elemento | Testo visibile | Tooltip | Verdict |
| ---- | ----- | -------- | -------------- | ------- | ------- |
| `components/report/design-system/primitives/metric-card/metric-card.tsx` | 50 | Tooltip > span | — | `Fonte: ${REPORT_KPI_TRUST_LABELS[definition.trust]}` | MANUAL_REVIEW |
| `components/report/kpi-performance/kpi-performance-economic.tsx` | 39 | Tooltip > Tooltip | — | r.label | MANUAL_REVIEW |
| `components/report/kpi-performance/kpi-performance-economic.tsx` | 70 | Tooltip > Tooltip | — | r.nome | MANUAL_REVIEW |
| `components/report/layout/report-executive-strip.tsx` | 58 | Tooltip > span | Disp. min | {dispMinTitle} | MANUAL_REVIEW |
| `components/report/layout/report-executive-strip.tsx` | 64 | Tooltip > span | Officina   / | Mezzi con lavorazione aperta | KEEP_INFORMATIONAL |
| `components/report/layout/report-executive-strip.tsx` | 72 | Tooltip > span | Alert | Alert attivi sui dati | KEEP_CONTEXTUAL |
| `components/report/report-controls.tsx` | 180 | Tooltip > Tooltip | — | REPORT_PRESET_LABELS[id] | MANUAL_REVIEW |
| `components/report/report-controls.tsx` | 238 | Tooltip > button | Nessuno | Nessun confronto | KEEP_INFORMATIONAL |
| `components/report/report-controls.tsx` | 244 | Tooltip > Tooltip | — | {fullLabel} | MANUAL_REVIEW |
| `components/report/report-kpi-card.tsx` | 81 | Tooltip > span | — | `Fonte: ${REPORT_KPI_TRUST_LABELS[trust]}` | MANUAL_REVIEW |
| `components/report/report-lavorazioni-section.tsx` | 212 | <th title> | — | native title | KEEP_INFORMATIONAL |
| `components/report/report-lavorazioni-section.tsx` | 231 | Tooltip > Tooltip | — | Variazione percentuale rispetto all'anno precedente | KEEP_INFORMATIONAL |
| `components/report/report-lavorazioni-section.tsx` | 250 | Tooltip > Tooltip | — | `${mk}: ${v}` | MANUAL_REVIEW |
| `components/report/report-lavorazioni-temporal-section.tsx` | 196 | Tooltip > Tooltip | — | `${w.rangeStart} — ${w.rangeEnd}` | MANUAL_REVIEW |
| `components/report/report-lavorazioni-temporal-section.tsx` | 201 | Tooltip > Tooltip | — | m.hasManualOverride ? "Conteggio DB; il totale mese include lo storico manuale" : undefined | MANUAL_REVIEW |
| `components/report/report-magazzino-section.tsx` | 306 | Tooltip > Tooltip | — | r.label | MANUAL_REVIEW |
| `components/report/report-metric-card.tsx` | 40 | Tooltip > span | — | `Fonte: ${REPORT_KPI_TRUST_LABELS[definition.trust]}` | MANUAL_REVIEW |
| `components/report/report-metric-compare-ui.tsx` | 31 | Tooltip > span | — | `${compare.label}: ${compare.value}` | MANUAL_REVIEW |
| `components/report/report-metric-compare-ui.tsx` | 70 | Tooltip > span | — | row.label | MANUAL_REVIEW |
| `components/report/report-ricambi-consumo-section.tsx` | 239 | Tooltip > Tooltip | — | r.marca | MANUAL_REVIEW |
| `components/report/report-ricambi-consumo-section.tsx` | 244 | Tooltip > div | — | r.nome | MANUAL_REVIEW |
| `components/report/report-tops.tsx` | 144 | Tooltip > Tooltip | — | r.marca | MANUAL_REVIEW |
| `components/report/report-tops.tsx` | 251 | Tooltip > span | — | {ident} | MANUAL_REVIEW |
| `components/report/report-tops.tsx` | 256 | Tooltip > span | — | r.cliente | MANUAL_REVIEW |
| `components/report/report-tops.tsx` | 313 | Tooltip > span | — | r.cliente | MANUAL_REVIEW |
| `components/report/report-tops.tsx` | 395 | Tooltip > span | — | r.cliente | MANUAL_REVIEW |

### /shared

| File | Linea | Elemento | Testo visibile | Tooltip | Verdict |
| ---- | ----- | -------- | -------------- | ------- | ------- |
| `components/gestionale/gestionale-log-ui.tsx` | 173 | Tooltip > Tooltip | — | {gestionaleLogDismissTooltip} | MANUAL_REVIEW |
| `components/gestionale/global-input/global-fixed-list-pill.tsx` | 267 | Tooltip > Tooltip | — | {pillTooltip} | MANUAL_REVIEW |
| `components/gestionale/global-input/global-multi-select.tsx` | 117 | TruncatedTextTooltip > TruncatedTextTooltip | — | {chipLabel} | MANUAL_REVIEW |
| `components/gestionale/global-input/global-select.tsx` | 1185 | Tooltip > button | + | addOptionEnabled
                        ? undefined
                        : useSheet && sheetUsesSearch
                          ? "Scrivi nel campo Cerca in alto"
                          :  | MANUAL_REVIEW |
| `components/gestionale/global-input/global-select.tsx` | 1207 | Tooltip > button | + | addOptionEnabled
                    ? undefined
                    : useSheet && sheetUsesSearch
                      ? "Scrivi nel campo Cerca in alto"
                      : "Digita un valor | MANUAL_REVIEW |
| `components/gestionale/media/lavorazione-documents-manager.tsx` | 167 | TruncatedTextTooltip > TruncatedTextTooltip | — | doc.filename | MANUAL_REVIEW |
| `components/gestionale/mobile-nav-open-button.tsx` | 25 | IconActionButton | Apri menu | Apri menu | KEEP_ACCESSIBILITY |
| `components/gestionale/notification-center-bell.tsx` | 107 | Tooltip > Tooltip | — | {statusTooltip} | MANUAL_REVIEW |
| `components/gestionale/operator-global-settings-pilot-badge.tsx` | 12 | Tooltip > span | Modalità pilot attiva | Override pilot: operatori con impostazioni globali (env + flag database) | KEEP_INFORMATIONAL |
| `components/gestionale/page-header-toolbar.tsx` | 42 | OptionalTooltip > OptionalTooltip | — | {tip} | MANUAL_REVIEW |
| `components/gestionale/page-header-toolbar.tsx` | 101 | Tooltip > button | — | {cancelTitle} | MANUAL_REVIEW |
| `components/gestionale/page-header-toolbar.tsx` | 104 | Tooltip > button | Salvataggio… | {saveTitle} | MANUAL_REVIEW |
| `components/gestionale/page-header-toolbar.tsx` | 167 | OptionalTooltip > OptionalTooltip | — | {logTitle} | MANUAL_REVIEW |
| `components/gestionale/page-header-toolbar.tsx` | 197 | OptionalTooltip > OptionalTooltip | — | undoInactive ? "Non disponibile" : undefined | MANUAL_REVIEW |
| `components/gestionale/schede/scheda-ingresso-anagrafica-fields.tsx` | 203 | Tooltip > Tooltip | — | hasSignatureDataUrl(value.richiedenteFirma ?? "") ? "Modifica firma" : "Acquisisci firma" | MANUAL_REVIEW |
| `components/gestionale/settings-color-picker-popover.tsx` | 42 | Tooltip > label | — | Selettore colori di sistema | KEEP_INFORMATIONAL |
| `components/gestionale/sidebar-nav-row.tsx` | 156 | Tooltip > Tooltip | — | {tooltip} | MANUAL_REVIEW |
| `components/gestionale/theme-toggle.tsx` | 106 | OptionalTooltip > OptionalTooltip | — | {tip} | MANUAL_REVIEW |
| `components/gestionale/theme-toggle.tsx` | 135 | OptionalTooltip > OptionalTooltip | — | {tip} | MANUAL_REVIEW |
| `components/gestionale/upload/gestionale-file-input.tsx` | 53 | Tooltip > label | Caricamento…   Caricamento… | {title} | MANUAL_REVIEW |
| `components/gestionale/upload/gestionale-image-upload-button.tsx` | 207 | Tooltip > button | Caricamento…   Caricamento…  Aggiungi foto | {title} | MANUAL_REVIEW |
| `components/legal/pwa-install-footer-button.tsx` | 62 | <button title> | — | native title | KEEP_INFORMATIONAL |
| `components/legal/pwa-install-footer-button.tsx` | 82 | <button title> | — | native title | KEEP_INFORMATIONAL |
| `components/profile/profile-account-section.tsx` | 13 | TruncatedTextTooltip > TruncatedTextTooltip | — | {value} | MANUAL_REVIEW |
| `components/profile/profile-context-section.tsx` | 17 | TruncatedTextTooltip > TruncatedTextTooltip | — | {value} | MANUAL_REVIEW |
| `components/profile/profile-sheet-header.tsx` | 31 | TruncatedTextTooltip > TruncatedTextTooltip | — | {headerName} | MANUAL_REVIEW |
| `components/profile/profile-sheet-header.tsx` | 37 | TruncatedTextTooltip > TruncatedTextTooltip | — | user.email | MANUAL_REVIEW |
| `components/ui/page-action-menu/PageActionMenu.tsx` | 124 | OptionalTooltip > OptionalTooltip | — | {tooltip} | MANUAL_REVIEW |
| `components/ui/page-action-menu/PageActionMenuItem.tsx` | 151 | OptionalTooltip > OptionalTooltip | — | {tooltip} | MANUAL_REVIEW |
