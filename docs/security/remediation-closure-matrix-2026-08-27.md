# Remediation Closure Matrix — Full-System Audit 27/08/2026

**Remediation completed:** 2026-08-27  
**Live verification:** baseline export + P0 gate (dual anon/PUBLIC + mutating)

## Scorecard

| Area | Before | After | Evidence |
|------|--------|-------|----------|
| Security | 3 | 7 | Manifest grants SQL, body guards, webhook fail-closed, cliente API deny |
| Authorization | 5 | 7 | Edge staff-api allowlist, RBAC attrezzature guards |
| Data Integrity | 5 | 7 | scarico operation_id, ordine RPC single-writer, import dedup table |
| AI Security / Cost | 3–4 | 6 | pg_cron-only start, lease claim RPC, prompt boundary tests |
| Deployability | 4 | 8 | stop-on-failure apply script, migration gate extended |
| Testing | 6 | 8 | adversarial + live catalog gate + delivery idempotency tests |
| Disaster Recovery | 3 | 5 | `docs/operations/disaster-recovery-runbook.md` |

## Finding closure

| ID | Status | Evidence |
|----|--------|----------|
| SEC-001 | Fixed | `20261226120100`–`20261226120201`, manifest SSOT, live gate |
| SEC-002 | Fixed | `invoice_write_status_axes` → SERVER_ONLY + body guard gap |
| SEC-003 | Fixed | `cab_invoke_*` service_role guards in `20261226120500` |
| SEC-004 | Fixed | attrezzatura RBAC in `20261226121000` |
| SEC-005 | Fixed | webhook 503 if secret missing |
| SEC-006 | Fixed | proxy cliente deny + `staff-api-allowlist.ts` |
| SEC-008 | Partial | storage ACL `20261226120600`; adversarial test static |
| INT-001 | Fixed | `scaricoOperationId` persisted on scheda row |
| INT-002 | Fixed | `ordine_fornitore_transition_status` + trigger |
| INT-003 | Fixed | `import_commit_dedup` + server adapter |
| INT-004 | Fixed | retry copies `rendered_payload` + `delivery_operation_id` |
| INT-005 | Open | receiving→stock engine refactor deferred (no regression break) |
| AI-001 | Fixed | `AI_PROMPT_BOUNDARY_GUARD` regression |
| AI-002 | Partial | evidence pipeline in orchestrator; not full PDF dump removal audit |
| AI-003 | Fixed | lease RPC + removed `waitUntil` on start route |
| OPS-001 | Fixed | migrations `20100`–`21400` + apply script |

## Residual risks

- **INT-005:** `inventory_receiving_apply` still direct path — schedule follow-up.
- **Live gate:** run `ENFORCE_LIVE_P0_GATE=1` after each production migration apply.
- **DR:** restore test on staging pending Supabase plan confirmation.
