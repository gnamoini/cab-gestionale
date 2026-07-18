"use client";

type ReceivingDocumentPreviewProps = {
  url: string | null;
  loading?: boolean;
};

export function ReceivingDocumentPreview({ url, loading }: ReceivingDocumentPreviewProps) {
  if (loading) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-card)] text-sm text-[color:var(--cab-text-muted)]">
        Caricamento anteprima…
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-lg border border-dashed border-[color:var(--cab-border)] bg-[var(--cab-card)] text-sm text-[color:var(--cab-text-muted)]">
        Anteprima documento non disponibile
      </div>
    );
  }

  return (
    <iframe
      title="Anteprima DDT"
      src={url}
      className="h-full min-h-[320px] w-full rounded-lg border border-[color:var(--cab-border)] bg-white"
    />
  );
}
