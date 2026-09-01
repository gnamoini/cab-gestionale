"use client";

function toneGlowFilter(color: string, strength = 0.55): string {
  return `drop-shadow(0 0 4px color-mix(in srgb, ${color} ${Math.round(strength * 100)}%, transparent))`;
}

const PROBE_CELL =
  "flex min-h-[7rem] flex-col gap-2 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:var(--cab-card)] p-3";

function ProbeLabel({ id, title }: { id: string; title: string }) {
  return (
    <div className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--cab-text-muted)]">
      <span className="font-mono">{id}</span> — {title}
    </div>
  );
}

/** Griglia caselle minime — una tecnica compositor per cella (audit PWA Windows). */
export function PwaRenderProbePanel() {
  const gradientId = "pwa-probe-bar-gradient";

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div className={PROBE_CELL} data-probe-id="toolbar-blur">
        <ProbeLabel id="toolbar-blur" title="backdrop-filter + color-mix (toolbar-like)" />
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-md border border-[color:var(--cab-border)]">
          <div
            className="absolute inset-0"
            style={{
              background: "color-mix(in srgb, var(--cab-surface-2) 94%, var(--cab-bg-app))",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          />
          <div className="relative z-[1] p-2 text-xs text-[color:var(--cab-text)]">Toolbar glass</div>
        </div>
      </div>

      <div className={PROBE_CELL} data-probe-id="toast-glass">
        <ProbeLabel id="toast-glass" title="toast glass (backdrop-blur-md)" />
        <div className="flex min-w-0 flex-1 items-center rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-card)_76%,transparent)] py-2 pl-3 pr-2 shadow-sm ring-1 ring-[color:color-mix(in_srgb,var(--cab-border)_55%,transparent)] backdrop-blur-md">
          <span className="text-xs text-[color:var(--cab-text)]">Toast item</span>
        </div>
      </div>

      <div className={PROBE_CELL} data-probe-id="modal-blur">
        <ProbeLabel id="modal-blur" title="modal overlay blur" />
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-md">
          <div className="absolute inset-0 bg-[color:var(--cab-primary)] opacity-30" />
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
          <div className="relative z-[1] m-2 rounded-md border border-[color:var(--cab-border)] bg-[color:var(--cab-card)] p-2 text-xs">
            Panel
          </div>
        </div>
      </div>

      <div className={PROBE_CELL} data-probe-id="svg-bar-gradient">
        <ProbeLabel id="svg-bar-gradient" title="SVG bar + linearGradient" />
        <svg viewBox="0 0 120 60" className="h-full min-w-0 w-full flex-1" aria-hidden>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--cab-primary)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="var(--cab-primary)" stopOpacity="0.08" />
            </linearGradient>
          </defs>
          <rect x="8" y="20" width="20" height="32" fill={`url(#${gradientId})`} rx="2" />
          <rect x="36" y="12" width="20" height="40" fill={`url(#${gradientId})`} rx="2" />
          <rect x="64" y="28" width="20" height="24" fill={`url(#${gradientId})`} rx="2" />
        </svg>
      </div>

      <div className={PROBE_CELL} data-probe-id="svg-line-glow">
        <ProbeLabel id="svg-line-glow" title="SVG line + drop-shadow(color-mix)" />
        <svg viewBox="0 0 120 60" className="h-full min-w-0 w-full flex-1" aria-hidden>
          <polyline
            fill="none"
            stroke="var(--cab-primary)"
            strokeWidth="2.5"
            points="8,45 32,28 56,34 80,14 104,22"
            style={{ filter: toneGlowFilter("var(--cab-primary)") }}
          />
          <circle
            cx="80"
            cy="14"
            r="4"
            fill="var(--cab-primary)"
            style={{ filter: toneGlowFilter("var(--cab-primary)") }}
          />
        </svg>
      </div>

      <div className={PROBE_CELL} data-probe-id="opacity-transform">
        <ProbeLabel id="opacity-transform" title="opacity + transform" />
        <div className="flex min-w-0 flex-1 items-center justify-center">
          <div
            className="h-12 w-24 rounded-md bg-[color:var(--cab-primary)]"
            style={{ opacity: 0.72, transform: "translateY(-4px) scale(0.96)" }}
          />
        </div>
      </div>

      <div className={PROBE_CELL} data-probe-id="clip-opacity">
        <ProbeLabel id="clip-opacity" title="clip-path + opacity" />
        <div
          className="flex min-w-0 flex-1 items-center rounded-md bg-[color:var(--cab-surface-muted)] px-2 text-sm text-[color:var(--cab-text)]"
          style={{ opacity: 0.85, clipPath: "inset(0 18% 0 0 round 4px)" }}
        >
          Sidebar label clip
        </div>
      </div>

      <div className={PROBE_CELL} data-probe-id="mask-gradient">
        <ProbeLabel id="mask-gradient" title="mask-image gradient" />
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-full bg-[color:var(--cab-border)]">
          <div
            className="absolute inset-y-0 left-0 w-3/4 rounded-full bg-[color:var(--cab-primary)]"
            style={{
              WebkitMaskImage: "linear-gradient(90deg, #000 0%, #000 90%, transparent 100%)",
              maskImage: "linear-gradient(90deg, #000 0%, #000 90%, transparent 100%)",
            }}
          />
        </div>
      </div>

      <div className={PROBE_CELL} data-probe-id="radial-gradient">
        <ProbeLabel id="radial-gradient" title="radial-gradient background" />
        <div
          className="flex min-w-0 flex-1 items-center justify-center rounded-md"
          style={{
            background:
              "radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--cab-primary) 22%, transparent), transparent 55%), var(--cab-surface-2)",
          }}
        >
          <span className="text-xs text-[color:var(--cab-text-muted)]">Glow card</span>
        </div>
      </div>

      <div className={PROBE_CELL} data-probe-id="pulse-skeleton">
        <ProbeLabel id="pulse-skeleton" title="animate-pulse skeleton" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="h-3 w-2/3 animate-pulse rounded bg-[color:var(--cab-surface-muted)]" />
          <div className="h-10 min-w-0 flex-1 animate-pulse rounded-lg bg-[color:var(--cab-surface-muted)]" />
        </div>
      </div>

      <div className={PROBE_CELL} data-probe-id="svg-plain">
        <ProbeLabel id="svg-plain" title="plain SVG rects (control)" />
        <svg viewBox="0 0 120 60" className="h-full min-w-0 w-full flex-1" aria-hidden>
          <rect x="10" y="15" width="28" height="35" fill="var(--cab-primary)" rx="2" />
          <rect x="46" y="22" width="28" height="28" fill="var(--cab-warning)" rx="2" />
          <rect x="82" y="10" width="28" height="40" fill="var(--cab-success)" rx="2" />
        </svg>
      </div>

      <div className={PROBE_CELL} data-probe-id="html-solid">
        <ProbeLabel id="html-solid" title="HTML solid control" />
        <div className="flex min-w-0 flex-1 items-stretch gap-2">
          <div className="min-w-0 flex-1 rounded-md bg-[color:var(--cab-primary)]" />
          <div className="min-w-0 flex-1 rounded-md bg-[color:var(--cab-surface-muted)]" />
        </div>
      </div>
    </div>
  );
}
