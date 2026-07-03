import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');
const migDir = path.join(root, 'supabase', 'migrations');

const migrations = [
  ['20260902130000_document_capture_core.sql', 'document_capture_core', true],
  ['20260902130100_user_permissions_document_capture.sql', 'user_permissions_document_capture', false],
  ['20260902130200_document_capture_grants_child_rls.sql', 'document_capture_grants_child_rls', false],
  ['20260902130300_profiles_company_id_new_users.sql', 'profiles_company_id_new_users', false],
  ['20260902130400_document_capture_security_hardening.sql', 'document_capture_security_hardening', false],
  ['20260902130500_document_capture_status_transitions.sql', 'document_capture_status_transitions', false],
  ['20260902130600_document_capture_phase2_rpc.sql', 'document_capture_phase2_rpc', false],
  ['20260902130700_scheda_pdf_rls.sql', 'scheda_pdf_rls', false],
  ['20260902130800_document_capture_apply_lock.sql', 'document_capture_apply_lock', false],
  ['20260902130900_document_capture_rate_limit.sql', 'document_capture_rate_limit', false],
  ['20260902131000_scheda_pdf_renderer_hash_fix.sql', 'scheda_pdf_renderer_hash_fix', false],
  ['20260902131100_profiles_company_id_nullable_signup.sql', 'profiles_company_id_nullable_signup', false],
  ['20260902131200_document_capture_rls_events_audit.sql', 'document_capture_rls_events_audit', false],
  ['20260902150000_tkb_description_engine.sql', 'tkb_description_engine', false],
];

for (const [file, name, fixCron] of migrations) {
  let sql = fs.readFileSync(path.join(migDir, file), 'utf8');
  if (fixCron) {
    sql = sql.replace(
      '$$select public.expire_pending_document_captures();$$',
      '$cron$select public.expire_pending_document_captures();$cron$',
    );
  }
  const out = path.join(migDir, `_payload_${name}.json`);
  fs.writeFileSync(out, JSON.stringify({ project_id: 'oxmnuovsgenqkuwfolqh', name, query: sql }));
  console.log(`${name}: ${sql.length} bytes -> ${out}`);
}
