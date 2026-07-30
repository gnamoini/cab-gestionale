# Document Capture Benchmark Report

Generated: 2026-07-30T01:29:07.039Z

## Summary

- Trace events: 1
- Analyze runs: 1
- Time to review ready (last END_OK elapsed): n/a ms
- Time to first progress: n/a ms
- Time to first data (PARSE_OK): n/a ms

## Bottlenecks (% of END_OK mean)

| Phase | Mean ms | P95 ms | Share |
|-------|---------|--------|-------|
| HYBRID_OK | 8000 | 8000 | 0% |

## All phases

| Phase | Count | Mean ms | P95 ms | P99 ms |
|-------|-------|---------|--------|--------|
| HYBRID_OK | 1 | 8000 | 8000 | 8000 |

## Tokens (Gemini responses)

No token samples in trace.

## Collection

- Production/staging: grep `DOCUMENT_CAPTURE_ANALYZE_TRACE` from runtime logs
- Local hybrid: `DOCUMENT_CAPTURE_ANALYZE_TRACE=1 npx tsx scripts/bench/document-capture-analyze-runner.ts <file>`
- Aggregate: `npm run bench:document-capture -- analyze.log`

## Optimizations implemented (2026-07-30)

| Intervention | Expected impact | Measurement |
|--------------|-----------------|---------------|
| Page raster cache (1× sharp render per page) | OCR crop phase −50–80% on scan ingresso | `PDF_RENDER_OK`, `OCR_CROP_OK` |
| Preload cataloghi + ER context during hybrid/Gemini | Post-AI ER near-zero wait | `PRELOAD_OK`, `ENTITY_RESOLUTION_OK` |
| Hybrid pdfjs ∥ template title OCR | Tier-0 + detect overlap | `PDFJS_TEXT_OK` elapsed vs HYBRID_OK |
| Gemini Buffer view (no ArrayBuffer copy) | Lower alloc / GC | `GEMINI_PAYLOAD_OK` |
| Prompt condensation | Fewer input tokens | `inputTokens` on `GEMINI_RESPONSE` |
| Apply magazzino dedup + parallel mezzi fetch | Apply path faster | apply telemetry |
| Compile sheet memoize (no double build) | Faster compile open | client compile step |
| Trace gated in production | Lower log overhead | `DOCUMENT_CAPTURE_ANALYZE_TRACE=1` for bench |

**Parity:** OCR DPI 200, preprocess height 48, temperature 0.2 unchanged. Prompt parity test: `scheda-officina-extraction-prompt.test.ts`.

**Before/after:** Re-run this report on the same production log corpus after deploy; compare `END_OK` elapsed P95/P99 and bottleneck share table.
