import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migDir = path.join(root, 'supabase', 'migrations');
const payload = JSON.parse(
  fs.readFileSync(path.join(migDir, '_payload_document_capture_core.json'), 'utf8'),
);
const outPath = path.join(migDir, '_mcp_call_document_capture_core.json');
fs.writeFileSync(
  outPath,
  JSON.stringify({
    server: 'plugin-supabase-supabase',
    toolName: 'apply_migration',
    arguments: {
      project_id: 'oxmnuovsgenqkuwfolqh',
      name: payload.name,
      query: payload.query,
    },
  }),
);
console.log(JSON.stringify({ ok: true, bytes: payload.query.length, outPath }));
