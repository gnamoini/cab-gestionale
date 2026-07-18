# Tooltip MANUAL_REVIEW — Necessity Scores

> Generato: 2026-07-18 — `npm run audit:tooltip`

## Riepilogo

| Fascia score | Azione | Conteggio |
| ------------ | ------ | --------- |
| 0–24 | **Rimuovere** (ridondante) | 16 |
| 25–49 | Revisione caso per caso | 11 |
| 50–100 | **Mantenere** | 141 |

## Rimuovere (score 0–24)

| Score | File | Linea | Tooltip | Visibile | Rationale |
| ----- | ---- | ----- | ------- | -------- | --------- |
| 8 | `components/dashboard/dashboard-health-score-ring.tsx` | 315 | {targetsActionLabel} | {targetsActionLabel} | duplica label azione health score |
| 12 | `components/dashboard/settings-list-ui.tsx` | 517 | `Conferma modifica ${itemLabel}` | `Conferma modifica ${itemLabel}` | duplica testo visibile o aria-label icona |
| 12 | `components/dashboard/settings-list-ui.tsx` | 525 | `Annulla modifica ${itemLabel}` | `Annulla modifica ${itemLabel}` | duplica testo visibile o aria-label icona |
| 12 | `components/dashboard/settings-list-ui.tsx` | 551 | `Modifica ${itemLabel}` | `Modifica ${itemLabel}` | duplica testo visibile o aria-label icona |
| 12 | `components/design-system/disabled-element-tooltip.tsx` | 25 | {content} | — | prop pass-through su icona — risolto da primitive |
| 12 | `components/design-system/icon-action-button.tsx` | 65 | {content} | — | prop pass-through su icona — risolto da primitive |
| 12 | `components/design-system/icon-action-button.tsx` | 79 | {content} | — | prop pass-through su icona — risolto da primitive |
| 12 | `components/design-system/icon-button.tsx` | 28 | {content} | — | prop pass-through su icona — risolto da primitive |
| 12 | `components/design-system/log-entry.tsx` | 182 | {title} | — | prop pass-through su icona — risolto da primitive |
| 12 | `components/design-system/optional-tooltip.tsx` | 15 | {content} | — | prop pass-through su icona — risolto da primitive |
| 12 | `components/design-system/truncated-text-tooltip.tsx` | 50 | {text} | — | prop pass-through su icona — risolto da primitive |
| 12 | `components/data-import/data-import-wizard-modal.tsx` | 388 | {label} | — | prop pass-through su icona — risolto da primitive |
| 12 | `components/gestionale/lavorazioni/lavorazioni-settings-ui.tsx` | 371 | `Sposta su ${itemLabel}` | `Sposta su ${itemLabel}` | duplica testo visibile o aria-label icona |
| 12 | `components/gestionale/lavorazioni/lavorazioni-settings-ui.tsx` | 379 | `Sposta giù ${itemLabel}` | `Sposta giù ${itemLabel}` | duplica testo visibile o aria-label icona |
| 12 | `components/gestionale/magazzino/magazzino-listino-ai-badge.tsx` | 29 | {label} | — | prop pass-through su icona — risolto da primitive |
| 12 | `components/preventivi/preventivi-view.tsx` | 264 | activeDdt ? "Apri DDT" : "Genera DDT" | activeDdt ? "Apri DDT" : "Genera DDT" | duplica testo visibile o aria-label icona |


## Revisione (score 25–49)

| Score | File | Linea | Tooltip | Visibile | Rationale |
| ----- | ---- | ----- | ------- | -------- | --------- |
| 45 | `components/workshop-schedule/agenda-gantt-view.tsx` | 65 | row.label | — | euristica su testo parziale |
| 45 | `components/dashboard/security/security-page-matrix-editor.tsx` | 50 | p.label | — | euristica su testo parziale |
| 45 | `components/preventivi/preventivi-view.tsx` | 767 | p.nScuderia \|\| undefined | — | euristica su testo parziale |
| 45 | `components/report/design-system/primitives/metric-card/metric-card.tsx` | 50 | `Fonte: ${REPORT_KPI_TRUST_LABELS[definition.trust]}` | — | euristica su testo parziale |
| 45 | `components/report/kpi-performance/kpi-performance-economic.tsx` | 70 | r.nome | — | euristica su testo parziale |
| 45 | `components/report/report-controls.tsx` | 180 | REPORT_PRESET_LABELS[id] | — | euristica su testo parziale |
| 45 | `components/report/report-kpi-card.tsx` | 81 | `Fonte: ${REPORT_KPI_TRUST_LABELS[trust]}` | — | euristica su testo parziale |
| 45 | `components/report/report-lavorazioni-section.tsx` | 250 | `${mk}: ${v}` | — | euristica su testo parziale |
| 45 | `components/report/report-lavorazioni-temporal-section.tsx` | 196 | `${w.rangeStart} — ${w.rangeEnd}` | — | euristica su testo parziale |
| 45 | `components/report/report-metric-card.tsx` | 40 | `Fonte: ${REPORT_KPI_TRUST_LABELS[definition.trust]}` | — | euristica su testo parziale |
| 45 | `components/report/report-ricambi-consumo-section.tsx` | 244 | r.nome | — | euristica su testo parziale |


## Mantenere (score 50–100)

| Score | File | Linea | Tooltip | Visibile | Rationale |
| ----- | ---- | ----- | ------- | -------- | --------- |
| 50 | `components/workshop-schedule/agenda-heatmap-grid.tsx` | 56 | {tip} | — | dinamico — revisione manuale consigliata |
| 50 | `components/dashboard/security/page-access-level-cell.tsx` | 43 | {tooltip} | — | dinamico — revisione manuale consigliata |
| 50 | `components/dashboard/security/security-users-table.tsx` | 160 | {title} | @ | dinamico — revisione manuale consigliata |
| 50 | `components/dashboard/settings-dipendenti-assenze-section.tsx` | 44 | {ASSENZA_ALTRO_MOTIVO_TOOLTIP} | — | dinamico — revisione manuale consigliata |
| 50 | `components/design-system/close-button.tsx` | 35 | {tip} | — | dinamico — revisione manuale consigliata |
| 50 | `components/design-system/shell-nav-icon-button.tsx` | 25 | {tip} | — | dinamico — revisione manuale consigliata |
| 50 | `components/design-system/shell-nav-icon-button.tsx` | 47 | {tip} | — | dinamico — revisione manuale consigliata |
| 50 | `components/gestionale/dipendenti/dipendenti-timesheet-compact-cell.tsx` | 54 | {tooltipLabel} | — | dinamico — revisione manuale consigliata |
| 50 | `components/gestionale/lavorazioni/lavorazioni-inline-select.tsx` | 307 | {tooltip} | — | dinamico — revisione manuale consigliata |
| 50 | `components/gestionale/lavorazioni/lavorazioni-settings-ui.tsx` | 305 | {tip} | — | dinamico — revisione manuale consigliata |
| 50 | `components/gestionale/magazzino/magazzino-giacenza-bell.tsx` | 88 | {alertLabel} | — | dinamico — revisione manuale consigliata |
| 50 | `components/gestionale/magazzino/magazzino-scorta-adjust-actions.tsx` | 51 | {readonlyTip} | Diminuisci | dinamico — revisione manuale consigliata |
| 50 | `components/gestionale/magazzino/magazzino-scorta-adjust-actions.tsx` | 60 | {readonlyTip} | Aumenta | dinamico — revisione manuale consigliata |
| 50 | `components/gestionale/magazzino/ricambio-info-panel.tsx` | 62 | {autonomiaTooltip} | — | dinamico — revisione manuale consigliata |
| 50 | `components/report/layout/report-executive-strip.tsx` | 58 | {dispMinTitle} | Disp. min | dinamico — revisione manuale consigliata |
| 50 | `components/report/report-controls.tsx` | 244 | {fullLabel} | — | dinamico — revisione manuale consigliata |
| 50 | `components/report/report-tops.tsx` | 251 | {ident} | — | dinamico — revisione manuale consigliata |
| 50 | `components/gestionale/gestionale-log-ui.tsx` | 173 | {gestionaleLogDismissTooltip} | — | dinamico — revisione manuale consigliata |
| 50 | `components/gestionale/global-input/global-fixed-list-pill.tsx` | 267 | {pillTooltip} | — | dinamico — revisione manuale consigliata |
| 50 | `components/gestionale/notification-center-bell.tsx` | 107 | {statusTooltip} | — | dinamico — revisione manuale consigliata |
| 50 | `components/gestionale/page-header-toolbar.tsx` | 42 | {tip} | — | dinamico — revisione manuale consigliata |
| 50 | `components/gestionale/page-header-toolbar.tsx` | 101 | {cancelTitle} | — | dinamico — revisione manuale consigliata |
| 50 | `components/gestionale/page-header-toolbar.tsx` | 104 | {saveTitle} | Salvataggio… | dinamico — revisione manuale consigliata |
| 50 | `components/gestionale/page-header-toolbar.tsx` | 167 | {logTitle} | — | dinamico — revisione manuale consigliata |
| 50 | `components/gestionale/sidebar-nav-row.tsx` | 156 | {tooltip} | — | dinamico — revisione manuale consigliata |
| 50 | `components/gestionale/theme-toggle.tsx` | 106 | {tip} | — | dinamico — revisione manuale consigliata |
| 50 | `components/gestionale/theme-toggle.tsx` | 135 | {tip} | — | dinamico — revisione manuale consigliata |
| 50 | `components/gestionale/upload/gestionale-file-input.tsx` | 53 | {title} | Caricamento…   Caricamento… | dinamico — revisione manuale consigliata |
| 50 | `components/gestionale/upload/gestionale-image-upload-button.tsx` | 207 | {title} | Caricamento…   Caricamento…  Aggiungi foto | dinamico — revisione manuale consigliata |
| 50 | `components/ui/page-action-menu/PageActionMenu.tsx` | 124 | {tooltip} | — | dinamico — revisione manuale consigliata |
| 50 | `components/ui/page-action-menu/PageActionMenuItem.tsx` | 151 | {tooltip} | — | dinamico — revisione manuale consigliata |
| 63 | `components/report/report-metric-compare-ui.tsx` | 31 | `${compare.label}: ${compare.value}` | — | euristica su testo parziale |
| 65 | `components/dashboard/settings-list-ui.tsx` | 534 | {removeTooltipContent} | `Elimina ${itemLabel}` | motivo blocco eliminazione (se diverso da label) |
| 65 | `components/dashboard/settings-list-ui.tsx` | 559 | {removeTooltipContent} | `Elimina ${itemLabel}` | motivo blocco eliminazione (se diverso da label) |
| 66 | `components/report/report-metric-compare-ui.tsx` | 70 | row.label | — | euristica su testo parziale |
| 70 | `components/gestionale/documenti/documenti-view.tsx` | 233 | `${labelCategoria(doc.categoria)} · ${labelTipoFile(doc.tipoFile)}` | — | categoria/tipo su icona senza testo |
| 72 | `components/workshop-schedule/agenda-filters-bar.tsx` | 62 | {hint} | — | hint contestuale dinamico |
| 72 | `components/workshop-schedule/agenda-intelligence-sidebar.tsx` | 89 | p.hint | — | hint contestuale dinamico |
| 72 | `components/workshop-schedule/agenda-view-tabs.tsx` | 55 | {hint} | — | hint contestuale dinamico |
| 72 | `components/lavorazioni-clienti/client-portal-stato-progress.tsx` | 120 | {tooltipContent} | — | hint contestuale dinamico |
| 74 | `components/dashboard/security/page-access-level-cell.tsx` | 55 | `${pageAccessLabel(effectiveLevel)} — clic per cambiare` | — | istruzione interazione matrice permessi |
| 75 | `components/workshop-schedule/agenda-session-block.tsx` | 48 | PLANNING_STATUS_LABELS[session.planningStatus] | — | stato pianificazione su blocco compatto |
| 76 | `components/gestionale/lavorazioni/copia-ultima-scheda-ingresso-banner.tsx` | 90 | disabled
              ? disabledTitle
              : mezzoInAnagraficaOnly
                ? "Nessuna scheda ingresso precedente da copiare"
                : "Copia campi dall’ultima scheda ing | — | contesto aggiuntivo oltre etichetta breve |
| 78 | `components/dashboard/promemoria/dashboard-promemoria-day-panel.tsx` | 41 | seriesSummary ?? "Serie ricorrente" | ↻ | dettaglio serie ricorrente oltre simbolo ↻ |
| 78 | `components/dashboard/widgets/dashboard-operational-kpi-header-widget.tsx` | 145 | `Variazione rispetto al ${periodLabel} (${prevLabel})` | — | dettaglio KPI periodo precedente |
| 78 | `components/gestionale/dipendenti/timesheet-header.tsx` | 249 | fillToday8hDisabled && fillToday8hDisabledReason
                              ? fillToday8hDisabledReason
                              : "Imposta 8 ore ordinarie per oggi su tutte le celle vuote d | — | euristica su testo parziale |
| 78 | `components/gestionale/lavorazioni/scheda-ingresso-form-modal.tsx` | 188 | hasFirma ? "Modifica firma" : "Acquisisci firma" | — | euristica su testo parziale |
| 78 | `components/gestionale/magazzino/magazzino-view.tsx` | 1458 | stale
                  ? `${formatTimestampHover(p.dataUltimaModifica)} · ${MAGAZZINO_STALE_MODIFICA_HINT}`
                  : formatTimestampHover(p.dataUltimaModifica) | — | euristica su testo parziale |
| 78 | `components/gestionale/magazzino/magazzino-view.tsx` | 1484 | magazzinoConsumoMedioTooltip(consumoRow, avgM) | — | euristica su testo parziale |
| 78 | `components/gestionale/magazzino/magazzino-view.tsx` | 1878 | low ? "Sotto scorta minima" : "Giacenza" | — | euristica su testo parziale |
| 78 | `components/gestionale/magazzino/magazzino-view.tsx` | 1903 | magazzinoConsumoMedioTooltip(consumoRow, avgM) | — | euristica su testo parziale |
| 78 | `components/gestionale/magazzino/magazzino-view.tsx` | 1912 | staleModifica
                        ? `${formatTimestampHover(p.dataUltimaModifica)} · ${MAGAZZINO_STALE_MODIFICA_HINT}`
                        : formatTimestampHover(p.dataUltimaModifica) | — | euristica su testo parziale |
| 78 | `components/gestionale/mezzi/mezzi-table.tsx` | 458 | modificaTooltip ?? undefined | — | euristica su testo parziale |
| 78 | `components/preventivi/preventivi-view.tsx` | 743 | preventivoTipoDocumentoLabel(p.tipoDocumento) | — | euristica su testo parziale |
| 78 | `components/report/report-lavorazioni-temporal-section.tsx` | 201 | m.hasManualOverride ? "Conteggio DB; il totale mese include lo storico manuale" : undefined | — | euristica su testo parziale |
| 78 | `components/gestionale/schede/scheda-ingresso-anagrafica-fields.tsx` | 203 | hasSignatureDataUrl(value.richiedenteFirma ?? "") ? "Modifica firma" : "Acquisisci firma" | — | euristica su testo parziale |
| 79 | `components/lavorazioni/schede/lavorazione-preventivi-hub-list.tsx` | 93 | disabled ? disabledTitle : undefined | Crea preventivo | euristica su testo parziale |
| 80 | `components/gestionale/documenti/documenti-view.tsx` | 280 | canOpen ? "Apri" : unavailableHint | canOpen ? "Apri" : unavailableHint | spiegazione badge stato documento |
| 80 | `components/gestionale/documenti/documenti-view.tsx` | 351 | {unavailableHint} | File non collegato | spiegazione badge stato documento |
| 80 | `components/gestionale/lavorazioni/lavorazione-mobile-cards.tsx` | 221 | {concludiTooltip} | Concludi | spiega azione icona non ovvio |
| 80 | `components/gestionale/lavorazioni/lavorazione-table-row.tsx` | 249 | row.stato === "completata" ? undefined : "Imposta come completata per archiviarla" | Concludi | spiega azione icona non ovvio |
| 82 | `components/dashboard/promemoria/dashboard-promemoria-day-panel.tsx` | 57 | `Modifica ${row.title}` | `Modifica ${row.title}` | probabile testo troncato (expr dinamica) |
| 82 | `components/dashboard/promemoria/dashboard-promemoria-day-panel.tsx` | 64 | `Elimina ${row.title}` | `Elimina ${row.title}` | probabile testo troncato (expr dinamica) |
| 82 | `components/dashboard/security/security-users-permissions-panel.tsx` | 368 | hasClienteAssociationViolations ? "Correggi le associazioni cliente prima di salvare." : undefined | — | probabile testo troncato (expr dinamica) |
| 82 | `components/gestionale/dipendenti/dipendenti-pdf-toolbar.tsx` | 48 | needsAddetto ? "Seleziona un addetto nei filtri per esportare il PDF dipendente" : undefined | — | spiega perché export è disabilitato |
| 82 | `components/data-import/data-import-export-toolbar.tsx` | 198 | item.title !== item.label ? item.title : undefined | — | probabile testo troncato (expr dinamica) |
| 82 | `components/data-import/data-import-export-toolbar.tsx` | 308 | item.title !== item.label ? item.title : undefined | — | probabile testo troncato (expr dinamica) |
| 82 | `components/lavorazioni-clienti/client-lavorazione-documents.tsx` | 27 | doc.filename | — | probabile testo troncato (expr dinamica) |
| 82 | `components/report/kpi-performance/kpi-performance-economic.tsx` | 39 | r.label | — | probabile testo troncato (expr dinamica) |
| 82 | `components/report/report-magazzino-section.tsx` | 306 | r.label | — | probabile testo troncato (expr dinamica) |
| 82 | `components/report/report-ricambi-consumo-section.tsx` | 239 | r.marca | — | probabile testo troncato (expr dinamica) |
| 82 | `components/report/report-tops.tsx` | 144 | r.marca | — | probabile testo troncato (expr dinamica) |
| 82 | `components/report/report-tops.tsx` | 256 | r.cliente | — | probabile testo troncato (expr dinamica) |
| 82 | `components/report/report-tops.tsx` | 313 | r.cliente | — | probabile testo troncato (expr dinamica) |
| 82 | `components/report/report-tops.tsx` | 395 | r.cliente | — | probabile testo troncato (expr dinamica) |
| 84 | `components/workshop-schedule/agenda-day-timeline.tsx` | 87 | `Crea sessione alle ${label}` | — | dettaglio temporale / sessione agenda |
| 84 | `components/workshop-schedule/agenda-gantt-view.tsx` | 73 | `${bar.title} · ${localTimeLabel(bar.startAt)}–${localTimeLabel(bar.endAt)}` | — | dettaglio temporale / sessione agenda |
| 85 | `components/gestionale/dipendenti/timesheet-cell-editor-popover.tsx` | 138 | !validation.ok ? validation.errors[0] : undefined | Copia per tutti | errore validazione su azione disabilitata |
| 85 | `components/gestionale/dipendenti/timesheet-cell-editor-popover.tsx` | 146 | !validation.ok ? validation.errors[0] : undefined | — | errore validazione su azione disabilitata |
| 86 | `components/dashboard/security/security-monitoring-section.tsx` | 89 | r.user_agent ?? "" | — | testo troncato in tabella sicurezza |
| 86 | `components/dashboard/security/security-monitoring-section.tsx` | 291 | row.detail | — | testo troncato in tabella sicurezza |
| 86 | `components/dashboard/security/security-users-table.tsx` | 244 | row.clienteRef ?? undefined | — | testo troncato in tabella sicurezza |
| 88 | `components/workshop-schedule/agenda-officina-view.tsx` | 387 | `Score ${slot.slotScore}% · ${localTimeLabel(slot.startAt)}–${localTimeLabel(slot.endAt)}` | — | dettaglio heatmap / carico agenda |
| 88 | `components/workshop-schedule/agenda-session-block.tsx` | 55 | session.title | — | testo troncato — mostra contenuto completo |
| 88 | `components/workshop-schedule/agenda-session-block.tsx` | 77 | {subtitle} | — | testo troncato — mostra contenuto completo |
| 88 | `components/workshop-schedule/agenda-weekly-load-widget.tsx` | 26 | `${d.date}: carico ${d.loadPct}%` | — | dettaglio heatmap / carico agenda |
| 88 | `components/dashboard/dashboard-tasks-panel.tsx` | 121 | task.text | — | testo troncato — mostra contenuto completo |
| 88 | `components/dashboard/settings/settings-overview-section.tsx` | 42 | item.label | — | testo troncato — mostra contenuto completo |
| 88 | `components/gestionale/documenti/documenti-view.tsx` | 348 | doc.nome | — | testo troncato — mostra contenuto completo |
| 88 | `components/gestionale/lavorazioni/lavorazioni-table-shared.tsx` | 250 | {cliente} | — | testo troncato — mostra contenuto completo |
| 88 | `components/gestionale/lavorazioni/lavorazioni-table-shared.tsx` | 255 | utilizzatore.trim() | — | testo troncato — mostra contenuto completo |
| 88 | `components/gestionale/lavorazioni/lavorazioni-table-shared.tsx` | 297 | {t} | — | testo troncato — mostra contenuto completo |
| 88 | `components/gestionale/lavorazioni/lavorazioni-table-shared.tsx` | 326 | {text} | — | testo troncato — mostra contenuto completo |
| 88 | `components/gestionale/global-input/global-multi-select.tsx` | 117 | {chipLabel} | — | testo troncato — mostra contenuto completo |
| 88 | `components/gestionale/global-input/global-select.tsx` | 1185 | addOptionEnabled
                        ? undefined
                        : useSheet && sheetUsesSearch
                          ? "Scrivi nel campo Cerca in alto"
                          :  | + | euristica su testo parziale |
| 88 | `components/gestionale/global-input/global-select.tsx` | 1207 | addOptionEnabled
                    ? undefined
                    : useSheet && sheetUsesSearch
                      ? "Scrivi nel campo Cerca in alto"
                      : "Digita un valor | + | euristica su testo parziale |
| 88 | `components/gestionale/media/lavorazione-documents-manager.tsx` | 167 | doc.filename | — | testo troncato — mostra contenuto completo |
| 88 | `components/profile/profile-account-section.tsx` | 13 | {value} | — | testo troncato — mostra contenuto completo |
| 88 | `components/profile/profile-context-section.tsx` | 17 | {value} | — | testo troncato — mostra contenuto completo |
| 88 | `components/profile/profile-sheet-header.tsx` | 31 | {headerName} | — | testo troncato — mostra contenuto completo |
| 88 | `components/profile/profile-sheet-header.tsx` | 37 | user.email | — | testo troncato — mostra contenuto completo |
| 90 | `components/gestionale/dipendenti/dipendenti-storico-section.tsx` | 93 | `${m.monthLabel}: ${m.totaleLavorato} h` | — | dettaglio timesheet non visibile nella cella |
| 90 | `components/gestionale/dipendenti/dipendenti-timesheet-grid.tsx` | 532 | formatTimesheetDayColumnTooltip(d, monthKey) | — | dettaglio timesheet non visibile nella cella |
| 90 | `components/gestionale/dipendenti/dipendenti-timesheet-grid.tsx` | 587 | buildTimesheetEmployeeNameTooltip(emp.display_name, {
                           | — | dettaglio timesheet non visibile nella cella |
| 90 | `components/gestionale/dipendenti/dipendenti-timesheet-grid.tsx` | 650 | `${emp.display_name} · Totale presenze mese: ${totals.totaleLavorato > 0 ? `${totals.totaleLavorato}h` : "—"}` | — | dettaglio timesheet non visibile nella cella |
| 90 | `components/gestionale/dipendenti/dipendenti-timesheet-grid.tsx` | 697 | `${emp.display_name} · Totale assenze mese: ${totals.oreAssenza > 0 ? `${totals.oreAssenza}h` : "—"}` | — | dettaglio timesheet non visibile nella cella |
| 90 | `components/gestionale/dipendenti/dipendenti-timesheet-grid.tsx` | 737 | formatTimesheetFooterDayTooltip(
                        d,
                     | — | dettaglio timesheet non visibile nella cella |
| 90 | `components/gestionale/dipendenti/dipendenti-timesheet-grid.tsx` | 758 | formatTimesheetFooterMonthTooltip(monthKey, "work", globalTotals.totaleLavorato) | — | dettaglio timesheet non visibile nella cella |
| 90 | `components/gestionale/dipendenti/dipendenti-timesheet-grid.tsx` | 788 | formatTimesheetFooterDayTooltip(
                        d,
                     | — | dettaglio timesheet non visibile nella cella |
| 90 | `components/gestionale/dipendenti/dipendenti-timesheet-grid.tsx` | 809 | formatTimesheetFooterMonthTooltip(monthKey, "absence", globalTotals.oreAssenza) | — | dettaglio timesheet non visibile nella cella |
| 92 | `components/gestionale/documenti/documenti-modals.tsx` | 541 | !canDelete ? "Sola lettura" : undefined | — | hint su controllo disabilitato / sola lettura |
| 92 | `components/gestionale/documenti/documenti-modals.tsx` | 546 | !canEdit ? "Sola lettura" : undefined | — | hint su controllo disabilitato / sola lettura |
| 92 | `components/gestionale/documenti/documenti-view.tsx` | 912 | !canUploadDocuments ? READONLY_PERMISSION_HINT : undefined | — | hint su controllo disabilitato / sola lettura |
| 92 | `components/gestionale/lavorazioni/lavorazione-mobile-cards.tsx` | 346 | canEditWorkOrders ? undefined : "Sola lettura" | Ripristina | hint su controllo disabilitato / sola lettura |
| 92 | `components/gestionale/lavorazioni/lavorazione-table-row.tsx` | 394 | canEditWorkOrders ? undefined : "Sola lettura" | Ripristina | hint su controllo disabilitato / sola lettura |
| 92 | `components/gestionale/lavorazioni/lavorazioni-page-toolbar.tsx` | 268 | !canEditWorkOrders
                    ? READONLY_PERMISSION_HINT
                    : !createdBy
                      ? "Accedi per creare una lavorazione."
                      : undefined | — | hint su controllo disabilitato / sola lettura |
| 92 | `components/lavorazioni/schede/schede-lavorazione-modal.tsx` | 1367 | !canEditWorkOrders ? READONLY_PERMISSION_HINT : undefined | — | hint su controllo disabilitato / sola lettura |
| 92 | `components/lavorazioni/schede/schede-lavorazione-modal.tsx` | 1410 | !preventiviPerm.canWrite
                        ? "Non hai permesso di creare preventivi"
                        : !canEditWorkOrders
                          ? READONLY_PERMISSION_HINT
            | Crea | hint su controllo disabilitato / sola lettura |
| 92 | `components/lavorazioni/schede/schede-lavorazione-modal.tsx` | 1714 | !canEdit ? READONLY_PERMISSION_HINT : undefined | — | hint su controllo disabilitato / sola lettura |
| 92 | `components/lavorazioni/schede/schede-lavorazione-modal.tsx` | 1723 | !canEdit ? READONLY_PERMISSION_HINT : undefined | — | hint su controllo disabilitato / sola lettura |
| 92 | `components/lavorazioni/schede/schede-lavorazione-modal.tsx` | 1738 | !canEdit ? READONLY_PERMISSION_HINT : undefined | — | hint su controllo disabilitato / sola lettura |
| 92 | `components/gestionale/magazzino/magazzino-import-entry.tsx` | 62 | inactive ? "Sola lettura" : "Importa" | — | hint su controllo disabilitato / sola lettura |
| 92 | `components/gestionale/magazzino/magazzino-modals.tsx` | 87 | magCanCreateRicambio ? "Modifica" : READONLY_PERMISSION_HINT | — | hint su controllo disabilitato / sola lettura |
| 92 | `components/gestionale/magazzino/magazzino-view.tsx` | 1600 | magCanCreateRicambio ? "Aggiungi un ricambio" : "Sola lettura" | — | hint su controllo disabilitato / sola lettura |
| 92 | `components/gestionale/magazzino/ricambio-edit-modal.tsx` | 233 | magCanDeleteRicambio ? "Elimina ricambio" : READONLY_PERMISSION_HINT | — | hint su controllo disabilitato / sola lettura |
| 92 | `components/gestionale/magazzino/ricambio-label-actions.tsx` | 184 | canRead ? "Etichetta QR" : READONLY_PERMISSION_HINT | — | hint su controllo disabilitato / sola lettura |
| 92 | `components/ordini-fornitori/ordine-fornitore-editor-modal.tsx` | 560 | !canWrite ? READONLY_PERMISSION_HINT : undefined | — | hint su controllo disabilitato / sola lettura |
| 92 | `components/ordini-fornitori/ordine-fornitore-editor-modal.tsx` | 570 | !canWrite ? READONLY_PERMISSION_HINT : undefined | — | hint su controllo disabilitato / sola lettura |
| 92 | `components/ordini-fornitori/ordine-fornitore-editor-modal.tsx` | 582 | !canWrite ? READONLY_PERMISSION_HINT : undefined | — | hint su controllo disabilitato / sola lettura |
| 92 | `components/ordini-fornitori/ordini-fornitori-view.tsx` | 377 | !canWrite ? READONLY_PERMISSION_HINT : undefined | — | hint su controllo disabilitato / sola lettura |
| 92 | `components/ordini-fornitori/ordini-fornitori-view.tsx` | 569 | !canWrite ? READONLY_PERMISSION_HINT : undefined | Duplica | hint su controllo disabilitato / sola lettura |
| 92 | `components/ordini-fornitori/ordini-fornitori-view.tsx` | 589 | !canWrite ? READONLY_PERMISSION_HINT : undefined | Elimina | hint su controllo disabilitato / sola lettura |
| 92 | `components/ordini-fornitori/ordini-fornitori-view.tsx` | 601 | !canWrite ? READONLY_PERMISSION_HINT : undefined | Annulla | hint su controllo disabilitato / sola lettura |
| 92 | `components/ordini-fornitori/ordini-fornitori-view.tsx` | 645 | !canWrite ? READONLY_PERMISSION_HINT : undefined | Duplica | hint su controllo disabilitato / sola lettura |
| 92 | `components/ordini-fornitori/ordini-fornitori-view.tsx` | 648 | !canWrite ? READONLY_PERMISSION_HINT : undefined | Elimina | hint su controllo disabilitato / sola lettura |
| 92 | `components/gestionale/mezzi/mezzi-hub-detail-modal.tsx` | 249 | !canEdit
                    ? READONLY_PERMISSION_HINT
                    : mezzo.hubSynthetic
                      ? "Registra il mezzo in anagrafica per abilitare la modifica"
                | Modifica | hint su controllo disabilitato / sola lettura |
| 92 | `components/gestionale/mezzi/mezzi-view.tsx` | 643 | canEditVehicles ? "Registra un nuovo mezzo in anagrafica" : READONLY_PERMISSION_HINT | — | hint su controllo disabilitato / sola lettura |
| 92 | `components/preventivi/preventivi-view.tsx` | 254 | !canEditWorkOrders ? "Sola lettura" : undefined | Modifica | hint su controllo disabilitato / sola lettura |
| 92 | `components/preventivi/preventivi-view.tsx` | 287 | !canDeleteRecords ? "Sola lettura" : undefined | Elimina | hint su controllo disabilitato / sola lettura |
| 92 | `components/preventivi/preventivi-view.tsx` | 1072 | canEditWorkOrders ? "Crea un preventivo senza collegamento a lavorazione" : READONLY_PERMISSION_HINT | — | hint su controllo disabilitato / sola lettura |
| 92 | `components/gestionale/page-header-toolbar.tsx` | 197 | undoInactive ? "Non disponibile" : undefined | — | hint su controllo disabilitato / sola lettura |
