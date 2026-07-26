import { OfficialDocumentViewer } from "@/components/documenti/official-document-viewer";
import { ShellCard } from "@/components/gestionale/shell-card";
import { layoutPageRoot } from "@/lib/ui/responsive-layout-core";

export function OfficialDocumentPreviewShell({
  title,
  subtitle,
  streamUrl,
}: {
  title: string;
  subtitle?: string;
  streamUrl: string;
}) {
  return (
    <div className={layoutPageRoot}>
      <ShellCard>
        <header className="mb-4 space-y-1">
          <h1 className="text-lg font-semibold text-[color:var(--cab-text)]">{title}</h1>
          {subtitle ? <p className="text-sm text-[color:var(--cab-text-muted)]">{subtitle}</p> : null}
        </header>
        <OfficialDocumentViewer streamUrl={streamUrl} title={title} />
      </ShellCard>
    </div>
  );
}
