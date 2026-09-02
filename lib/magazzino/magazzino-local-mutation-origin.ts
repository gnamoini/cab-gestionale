import {
  abortRecentLocalGestionaleMutation,
  markRecentLocalGestionaleMutation,
} from "@/lib/sync/recent-local-mutation";

const MAGAZZINO_LOCAL_MUTATION_TABLES = ["magazzino_ricambi", "movimenti_ricambi"] as const;

/** ponytail: invariante — chiamare prima di qualsiasi API magazzino/movimenti. */
export function registerMagazzinoLocalMutationOrigin(ricambioId: string): void {
  const id = ricambioId.trim();
  if (!id) return;
  markRecentLocalGestionaleMutation([...MAGAZZINO_LOCAL_MUTATION_TABLES], id);
}

export function abortMagazzinoLocalMutationOrigin(ricambioId: string): void {
  const id = ricambioId.trim();
  if (!id) return;
  abortRecentLocalGestionaleMutation([...MAGAZZINO_LOCAL_MUTATION_TABLES], id);
}
