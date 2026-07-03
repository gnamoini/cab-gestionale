import { createTkbSeedDraft } from "../../tkb-seed";
import { precedenceForSource } from "../../merge/source-precedence";
import type { TkbDraftBundle, TkbSourceFragment } from "../../types";

export function draftToFragments(draft: TkbDraftBundle): TkbSourceFragment[] {
  const base = { sourceId: "seed", precedence: precedenceForSource("seed"), provenance: { origin: "seed" } };
  const out: TkbSourceFragment[] = [];
  for (const c of draft.categorie) {
    out.push({ ...base, entityKind: "categoria", entityKey: c.slug, payload: c });
  }
  for (const c of draft.componenti) {
    out.push({ ...base, entityKind: "componente", entityKey: c.slug, payload: c });
  }
  for (const s of draft.sintomi) {
    out.push({ ...base, entityKind: "sintomo", entityKey: s.slug, payload: s });
  }
  for (const p of draft.procedure) {
    out.push({ ...base, entityKind: "procedure", entityKey: p.slug, payload: p });
  }
  for (const i of draft.interventi) {
    out.push({ ...base, entityKind: "intervento", entityKey: i.slug, payload: i });
  }
  for (const m of draft.ricambiMap) {
    out.push({ ...base, entityKind: "ricambioMap", entityKey: m.id, payload: m });
  }
  return out;
}

import type { TkbSourceAdapter } from "../adapter-registry";
import { registerTkbAdapter } from "../adapter-registry";

/** Seed solo se nessun dato strutturato — applicato nel builder dopo collect altri adapter. */
export const seedAdapter: TkbSourceAdapter = {
  id: "seed",
  tier: 4,
  supportsIncremental: false,
  async collect(_ctx) {
    return draftToFragments(createTkbSeedDraft());
  },
};

registerTkbAdapter(seedAdapter);
