# Document Capture Apply v1 — Deploy migrations

Apply in order on **staging**, then **production**:

```bash
# Local verify
supabase db push

# Or remote (linked project)
supabase migration up
```

## Required migrations (apply v1)

| Migration | Content |
|-----------|---------|
| `20260917130000_document_capture_apply_jobs_links.sql` | `document_capture_apply_jobs`, `document_capture_links`, RLS |
| `20260917140000_document_capture_duplicate_override_event.sql` | `duplicate_override` event type |
| `20260917150000_document_capture_links_unique.sql` | Unique index for idempotent links |

## Post-deploy smoke

```bash
npm run build
npx tsx lib/document-capture/validation/validate-capture-for-apply.test.ts
npx tsx lib/document-capture/capture-ricambi-persist-er.test.ts
npx playwright test e2e/document-capture/
```

## Rollback UI only (no schema rollback)

```env
DOCUMENT_CAPTURE_LAUNCHER_APPLY_V1=0
NEXT_PUBLIC_DOCUMENT_CAPTURE_LAUNCHER_APPLY_V1=0
```
