"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FormField, formInputClass, formTextareaClass } from "@/components/design-system/form-field";
import { GestionaleAiActionButton } from "@/components/design-system/gestionale-ai-action-button";
import { GlobalHierarchyMarcaSelect, GlobalHierarchyModelloSelect } from "@/components/gestionale/global-input";
import { GestionaleImageUploadButton } from "@/components/gestionale/upload/gestionale-image-upload-button";
import { confidenceBandLabel } from "@/lib/ai/spare-parts/ranking/score";
import type { SparePartIdentificationResult } from "@/lib/ai/spare-parts/types/schemas";
import { SPARE_PARTS_UPLOAD_LIMITS } from "@/lib/ai/spare-parts/constants";
import { storageUpload, STORAGE_BUCKETS } from "@/src/services/storage.service";

type Stage = { key: string; label: string; status: string; at?: string };

type SearchPollResponse = {
  id: string;
  status: string;
  stages: Stage[];
  result_json: SparePartIdentificationResult | null;
  sources_consulted: SparePartIdentificationResult["sourcesConsulted"];
  error_message?: string;
};

const POLL_INTERVALS_MS = [1000, 2000, 3000, 5000];

type HistoryRow = {
  id: string;
  status: string;
  created_at: string;
  confirmed_at?: string | null;
  rejected_at?: string | null;
  result_json?: SparePartIdentificationResult | null;
};

export function IdentificaRicambioView() {
  const searchParams = useSearchParams();
  const [marca, setMarca] = useState(searchParams.get("marca") ?? "");
  const [modello, setModello] = useState(searchParams.get("modello") ?? "");
  const [anno, setAnno] = useState(searchParams.get("anno") ?? "");
  const [descrizione, setDescrizione] = useState("");
  const [extra, setExtra] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [searchId, setSearchId] = useState<string | null>(null);
  const [pollData, setPollData] = useState<SearchPollResponse | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const pollGen = useRef(0);

  useEffect(() => {
    void fetch("/api/identifica-ricambio/searches")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { searches?: HistoryRow[] } | null) => {
        if (data?.searches) setHistory(data.searches);
      })
      .catch(() => undefined);
  }, [pollData?.status]);

  const onPhotoPick = useCallback((file: File) => {
    setPhotos((prev) => {
      if (prev.length >= SPARE_PARTS_UPLOAD_LIMITS.maxPhotos) return prev;
      if (file.size > SPARE_PARTS_UPLOAD_LIMITS.maxPhotoBytes) return prev;
      return [...prev, file];
    });
  }, []);

  const pollSearch = useCallback(async (id: string, gen: number) => {
    let attempt = 0;
    while (gen === pollGen.current) {
      const res = await fetch(`/api/identifica-ricambio/searches/${id}`);
      if (!res.ok) break;
      const data = (await res.json()) as SearchPollResponse;
      setPollData(data);
      if (data.status === "completed" || data.status === "failed" || data.status === "cancelled") {
        setSubmitting(false);
        return;
      }
      const delay = POLL_INTERVALS_MS[Math.min(attempt, POLL_INTERVALS_MS.length - 1)];
      attempt += 1;
      await new Promise((r) => setTimeout(r, delay));
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submitting || photos.length === 0 || !descrizione.trim()) return;
    setSubmitting(true);
    setPollData(null);
    pollGen.current += 1;
    const gen = pollGen.current;

    try {
      const createRes = await fetch("/api/identifica-ricambio/searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: descrizione.trim(),
          additionalInfo: extra.trim() || undefined,
          vehicleBrand: marca.trim() || undefined,
          vehicleModel: modello.trim() || undefined,
          vehicleYear: anno.trim() || undefined,
          assetStoragePaths: [],
        }),
      });
      if (!createRes.ok) throw new Error("Avvio ricerca fallito");
      const { searchId: id } = (await createRes.json()) as { searchId: string };
      setSearchId(id);

      const assetPaths: string[] = [];
      for (const file of photos) {
        const policyRes = await fetch("/api/identifica-ricambio/uploads/policy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            searchId: id,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || "image/jpeg",
          }),
        });
        if (!policyRes.ok) throw new Error("Upload policy negata");
        const policy = (await policyRes.json()) as { path: string; bucket: string };
        await storageUpload(policy.bucket as typeof STORAGE_BUCKETS.images, policy.path, file, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });
        assetPaths.push(policy.path);
      }

      await fetch(`/api/identifica-ricambio/searches/${id}/start`, { method: "POST" });
      void pollSearch(id, gen);
    } catch {
      setSubmitting(false);
    }
  }, [anno, descrizione, extra, marca, modello, photos, pollSearch, submitting]);

  const result = pollData?.result_json ?? null;
  const stages = useMemo(() => (Array.isArray(pollData?.stages) ? pollData!.stages : []), [pollData]);

  const confirmCode = useCallback(async () => {
    if (!searchId) return;
    await fetch(`/api/identifica-ricambio/searches/${searchId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  }, [searchId]);

  const rejectCode = useCallback(async () => {
    if (!searchId) return;
    await fetch(`/api/identifica-ricambio/searches/${searchId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  }, [searchId]);

  return (
    <div className="grid min-h-0 gap-6">
      <details
        className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
        open={historyOpen}
        onToggle={(e) => setHistoryOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer text-sm font-semibold text-zinc-200">Storico ricerche</summary>
        <ul className="mt-3 space-y-2 text-sm text-zinc-400">
          {history.length === 0 ? <li>Nessuna ricerca precedente.</li> : null}
          {history.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center gap-2">
              <span>{new Date(h.created_at).toLocaleString("it-IT")}</span>
              <span>— {h.status}</span>
              {h.confirmed_at ? <span className="text-emerald-400">confermata</span> : null}
              {h.rejected_at ? <span className="text-amber-400">rifiutata</span> : null}
              {h.result_json?.bestMatch?.verifiedPartNumber ? (
                <span className="text-zinc-200">{h.result_json.bestMatch.verifiedPartNumber}</span>
              ) : h.result_json?.bestMatch?.candidatePartNumber ? (
                <span className="text-amber-300">{h.result_json.bestMatch.candidatePartNumber}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </details>

      <div className="grid min-h-0 gap-6 lg:grid-cols-2">
      <section className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">Dati ricerca</h2>
        <div className="flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <div key={`${p.name}-${i}`} className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-300">
              {p.name}
            </div>
          ))}
          <GestionaleImageUploadButton onImagePicked={onPhotoPick} buttonLabel="Aggiungi foto" />
        </div>
        <FormField label="Marca">
          <GlobalHierarchyMarcaSelect tree="attrezzature" value={marca} onChange={setMarca} className={formInputClass} />
        </FormField>
        <FormField label="Modello">
          <GlobalHierarchyModelloSelect
            tree="attrezzature"
            marcaNome={marca}
            value={modello}
            onChange={setModello}
            inputClassName={formInputClass}
          />
        </FormField>
        <FormField label="Anno">
          <input className={formInputClass} value={anno} onChange={(e) => setAnno(e.target.value)} />
        </FormField>
        <FormField label="Descrivi il ricambio">
          <textarea className={formTextareaClass} rows={4} value={descrizione} onChange={(e) => setDescrizione(e.target.value)} />
        </FormField>
        <FormField label="Informazioni aggiuntive">
          <textarea className={formTextareaClass} rows={3} value={extra} onChange={(e) => setExtra(e.target.value)} />
        </FormField>
        <GestionaleAiActionButton
          type="button"
          disabled={submitting || photos.length === 0 || !descrizione.trim()}
          onClick={() => void handleSubmit()}
        >
          {submitting ? "Identificazione in corso…" : "Identifica ricambio"}
        </GestionaleAiActionButton>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">Risultato</h2>
        {stages.length > 0 ? (
          <ul className="space-y-1 text-sm text-zinc-400">
            {stages.map((s) => (
              <li key={s.key} className={s.status === "completed" ? "text-emerald-400" : undefined}>
                {s.label} — {s.status}
              </li>
            ))}
          </ul>
        ) : null}

        {!result && !submitting ? (
          <p className="text-sm text-zinc-500">Compila il form e avvia l&apos;identificazione.</p>
        ) : null}

        {result ? (
          <div className="space-y-4 text-sm">
            {result.bestMatch ? (
              <div className="space-y-2 rounded-lg border border-zinc-700 p-3">
                <p className="font-medium text-zinc-100">{result.bestMatch.description}</p>
                <p>
                  {result.bestMatch.verifiedPartNumber ? (
                    <>
                      <span className="text-emerald-400">Codice verificato: </span>
                      {result.bestMatch.verifiedPartNumber}
                    </>
                  ) : result.bestMatch.candidatePartNumber ? (
                    <>
                      <span className="text-amber-400">Codice candidato: </span>
                      {result.bestMatch.candidatePartNumber}
                    </>
                  ) : (
                    <span className="text-zinc-500">Codice non verificato</span>
                  )}
                </p>
                <p className="text-zinc-400">
                  {confidenceBandLabel(result.bestMatch.confidenceBand)}
                </p>
              </div>
            ) : (
              <p className="text-zinc-400">Ricambio non identificato con sufficiente affidabilità.</p>
            )}

            {result.warnings.length > 0 ? (
              <ul className="list-disc pl-5 text-amber-300/90">
                {result.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}

            <div>
              <h3 className="mb-2 font-medium text-zinc-200">Fonti consultate</h3>
              <ul className="space-y-1 text-zinc-400">
                {(result.sourcesConsulted ?? []).map((s) => (
                  <li key={`${s.documentId ?? s.title}`}>
                    {s.status === "ready" ? "✓" : "○"} {s.title}
                    {s.indexQuality ? ` (${s.indexQuality})` : ""}
                  </li>
                ))}
              </ul>
            </div>

            {result.bestMatch ? (
              <div className="flex gap-2">
                <button type="button" className="rounded-md bg-emerald-700 px-3 py-2 text-white" onClick={() => void confirmCode()}>
                  Conferma codice
                </button>
                <button type="button" className="rounded-md border border-zinc-600 px-3 py-2" onClick={() => void rejectCode()}>
                  Codice errato
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
      </div>
    </div>
  );
}
