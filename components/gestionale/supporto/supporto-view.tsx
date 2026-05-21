"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/gestionale/page-header";
import { ShellCard } from "@/components/gestionale/shell-card";
import { SupportoNoteForm } from "@/components/gestionale/supporto/supporto-note-form";
import { SupportoNoteCard } from "@/components/gestionale/supporto/supporto-note-card";
import {
  SupportoNotesFilter,
  type SupportoNotesFilterKey,
} from "@/components/gestionale/supporto/supporto-notes-filter";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { denyUnless } from "@/lib/auth/guard-action";
import { isSupabasePublicEnvConfigured } from "@/lib/env/supabase-public";
import { useRbac } from "@/src/hooks/use-rbac";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { dsStackPage } from "@/lib/ui/design-system";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { useResponsiveListPageSize } from "@/lib/ui/use-responsive-list-page-size";
import {
  useCreateSupportNoteMutation,
  useDeleteSupportNoteMutation,
  useSetSupportNoteResolvedMutation,
  useUpdateSupportNoteContentMutation,
} from "@/src/hooks/use-support-notes-mutations";
import { useSupportNotesQuery } from "@/src/hooks/use-support-notes-query";

export function SupportoView() {
  const { authorName, user } = useAuth();
  const { push } = useToast();
  const rbac = useRbac();
  const notesQ = useSupportNotesQuery();
  const createM = useCreateSupportNoteMutation();
  const updateM = useUpdateSupportNoteContentMutation();
  const deleteM = useDeleteSupportNoteMutation();
  const resolvedM = useSetSupportNoteResolvedMutation();
  const [filter, setFilter] = useState<SupportoNotesFilterKey>("all");
  const [actionError, setActionError] = useState<string | null>(null);

  const notes = notesQ.data ?? [];
  const loading = notesQ.isLoading;
  const mutating = createM.isPending || updateM.isPending || deleteM.isPending || resolvedM.isPending;
  const canWrite = rbac.canWrite("supporto");
  const supabaseReady = isSupabasePublicEnvConfigured();

  const addNote = useCallback(
    async (body: string) => {
      if (!denyUnless(canWrite, setActionError)) return;
      if (!user?.id) return;
      setActionError(null);
      try {
        await createM.mutateAsync({ content: body, created_by: user.id });
        push("Nota salvata", "success", 3200);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Impossibile salvare la nota.";
        setActionError(msg);
        push(msg, "error", 4200);
      }
    },
    [canWrite, createM, push, user?.id],
  );

  const updateNote = useCallback(
    async (id: string, content: string, expectedUpdatedAt: string) => {
      if (!denyUnless(canWrite, setActionError)) return;
      setActionError(null);
      try {
        await updateM.mutateAsync({ id, content, expectedUpdatedAt });
        push("Nota aggiornata", "success", 3000);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Impossibile aggiornare la nota.";
        setActionError(msg);
        if (!msg.includes("altro utente")) push(msg, "error", 4200);
      }
    },
    [canWrite, push, updateM],
  );

  const deleteNote = useCallback(
    async (id: string) => {
      if (!denyUnless(canWrite, setActionError)) return;
      setActionError(null);
      try {
        await deleteM.mutateAsync(id);
        push("Nota eliminata", "info", 3000);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Impossibile eliminare la nota.";
        setActionError(msg);
        push(msg, "error", 4200);
      }
    },
    [canWrite, deleteM, push],
  );

  const toggleResolved = useCallback(
    async (id: string, resolved: boolean) => {
      if (!denyUnless(canWrite, setActionError)) return;
      setActionError(null);
      try {
        await resolvedM.mutateAsync({ id, resolved });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Impossibile aggiornare lo stato.";
        setActionError(msg);
        push(msg, "error", 4200);
      }
    },
    [canWrite, push, resolvedM],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return notes;
    if (filter === "open") return notes.filter((n) => !n.resolved);
    return notes.filter((n) => n.resolved);
  }, [notes, filter]);

  const listPageSize = useResponsiveListPageSize();
  const notesPagerDeps = useMemo(() => `${filter}|${filtered.length}`, [filter, filtered.length]);
  const {
    page: notesPage,
    setPage: setNotesPage,
    pageCount: notesPageCount,
    sliceItems: sliceNotesPage,
    showPager: showNotesPager,
    label: notesPagerLabel,
    resetPage: resetNotesPage,
  } = useClientPagination(filtered.length, listPageSize);
  useEffect(() => {
    resetNotesPage();
  }, [notesPagerDeps, listPageSize, resetNotesPage]);
  const pagedNotes = useMemo(() => sliceNotesPage(filtered), [filtered, sliceNotesPage]);

  return (
    <>
      <PageHeader title="Supporto" />

      <div className={dsStackPage}>
        {!supabaseReady ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            Database non configurato: le note non possono essere salvate in modo condiviso. Verifica le variabili Supabase
            pubbliche.
          </p>
        ) : null}

        <ShellCard>
          <SupportoNoteForm
            authorName={authorName}
            onAdd={addNote}
            saving={createM.isPending}
            disabled={loading || mutating || !user?.id || !canWrite || !supabaseReady}
          />
        </ShellCard>

        {notesQ.isError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            {notesQ.error.message}
          </p>
        ) : null}
        {actionError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            {actionError}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SupportoNotesFilter value={filter} onChange={setFilter} />
          <p className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
            {filtered.length} {filtered.length === 1 ? "nota" : "note"}
            {mutating && !createM.isPending ? " · sincronizzazione…" : null}
          </p>
        </div>

        <div>
          {loading ? (
            <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              Caricamento note…
            </p>
          ) : filtered.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              {notes.length === 0
                ? "Nessuna nota ancora. Aggiungi la prima nota qui sopra."
                : filter === "open"
                  ? "Nessuna nota aperta con i filtri attuali."
                  : filter === "resolved"
                    ? "Nessuna nota risolta con i filtri attuali."
                    : "Nessuna nota da mostrare."}
            </p>
          ) : (
            <ul className="space-y-3">
              {pagedNotes.map((note) => (
                <SupportoNoteCard
                  key={note.id}
                  note={note}
                  canEdit={canWrite}
                  onUpdate={updateNote}
                  onDelete={deleteNote}
                  onToggleResolved={toggleResolved}
                  disabled={mutating}
                />
              ))}
            </ul>
          )}
          {showNotesPager ? (
            <TablePagination
              page={notesPage}
              pageCount={notesPageCount}
              onPageChange={setNotesPage}
              label={notesPagerLabel}
              className="mt-4 rounded-xl border border-zinc-200/90 bg-zinc-50/50 px-2 dark:border-zinc-800 dark:bg-zinc-900/40"
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
