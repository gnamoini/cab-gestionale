"use client";

import { useMaxMdDown } from "@/lib/ui/use-max-md-down";
import { useEffect, useState } from "react";

type OfficialDocumentViewerProps = {
  streamUrl: string;
  title: string;
};

export function OfficialDocumentViewer({ streamUrl, title }: OfficialDocumentViewerProps) {
  const isMobile = useMaxMdDown();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isMobile) return;
    let revoked: string | null = null;
    setError(null);
    void (async () => {
      try {
        const res = await fetch(streamUrl, { credentials: "same-origin", cache: "no-store" });
        if (!res.ok) {
          setError("Anteprima PDF non disponibile");
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        revoked = url;
        setBlobUrl(url);
      } catch {
        setError("Anteprima PDF non disponibile");
      }
    })();
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [isMobile, streamUrl]);

  if (isMobile) {
    if (error) {
      return <p className="text-sm text-[color:var(--cab-text-muted)]">{error}</p>;
    }
    if (!blobUrl) {
      return <p className="text-sm text-[color:var(--cab-text-muted)]">Caricamento PDF…</p>;
    }
    return (
      <iframe
        title={title}
        src={blobUrl}
        className="h-[min(80vh,900px)] w-full rounded-lg border border-[color:var(--cab-border)] bg-white"
      />
    );
  }

  return (
    <iframe
      title={title}
      src={streamUrl}
      className="h-[min(80vh,900px)] w-full rounded-lg border border-[color:var(--cab-border)] bg-white"
    />
  );
}
