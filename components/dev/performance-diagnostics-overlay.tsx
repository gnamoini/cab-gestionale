"use client";

import { useEffect, useState } from "react";
import {
  dumpRenderAudit,
  getRenderAuditEntries,
  isReactRenderAuditEnabled,
} from "@/lib/observability/react-render-audit";

type FpsSample = { fps: number; at: number };

export function PerformanceDiagnosticsOverlay() {
  const [renders, setRenders] = useState(() => getRenderAuditEntries().slice(0, 8));
  const [fps, setFps] = useState<FpsSample | null>(null);
  const [memoryMb, setMemoryMb] = useState<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (isReactRenderAuditEnabled()) {
        dumpRenderAudit(2);
        setRenders(getRenderAuditEntries().slice(0, 8));
      }
      const perf = performance as Performance & { memory?: { usedJSHeapSize: number } };
      if (perf.memory?.usedJSHeapSize) {
        setMemoryMb(Math.round(perf.memory.usedJSHeapSize / 1024 / 1024));
      }
    }, 2000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      frames += 1;
      if (now - last >= 1000) {
        setFps({ fps: frames, at: Date.now() });
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="pointer-events-none fixed bottom-2 right-2 z-[99999] max-w-xs rounded-md border border-zinc-700 bg-zinc-950/90 p-2 font-mono text-[10px] leading-tight text-zinc-200 shadow-lg"
      aria-hidden
    >
      <div className="mb-1 font-semibold text-amber-400">Perf diagnostics</div>
      <div>FPS: {fps?.fps ?? "—"}</div>
      <div>RAM: {memoryMb != null ? `${memoryMb} MB` : "—"}</div>
      <div className="mt-1 text-zinc-400">Top renders</div>
      <ul className="max-h-24 overflow-hidden">
        {renders.map((e) => (
          <li key={e.componentName}>
            {e.componentName}: {e.renderCount} ({e.lastActualDurationMs}ms)
          </li>
        ))}
      </ul>
    </div>
  );
}
