import type { ImportEntity } from "@/lib/data-import/core/types";

export type ImportExportEvent =
  | { type: "ImportStarted"; batchId: string; entity: ImportEntity; rowCount: number }
  | { type: "RowsValidated"; batchId: string; valid: number; errors: number; warnings: number }
  | { type: "RowsCommitted"; batchId: string; created: number; updated: number; skipped: number }
  | { type: "ExportStarted"; jobId: string; entity: ImportEntity }
  | { type: "ExportProgress"; jobId: string; percent: number }
  | { type: "Completed"; id: string; stats: Record<string, unknown> }
  | { type: "Failed"; id: string; error: string; correlationId?: string };

type Listener = (event: ImportExportEvent) => void;

class ImportExportEventBusImpl {
  private listeners = new Set<Listener>();
  private scoped = new Map<string, Set<Listener>>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeScoped(scopeId: string, listener: Listener): () => void {
    let set = this.scoped.get(scopeId);
    if (!set) {
      set = new Set();
      this.scoped.set(scopeId, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
      if (set!.size === 0) this.scoped.delete(scopeId);
    };
  }

  emit(event: ImportExportEvent): void {
    for (const l of this.listeners) l(event);
    const scopeId =
      "batchId" in event ? event.batchId : "jobId" in event ? event.jobId : "id" in event ? event.id : null;
    if (scopeId) {
      const set = this.scoped.get(scopeId);
      if (set) for (const l of set) l(event);
    }
  }
}

export const importExportEventBus = new ImportExportEventBusImpl();
