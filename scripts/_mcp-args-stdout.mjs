import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const name = process.argv[2] || 'document_capture_core';
const migDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations');
const payloadPath = path.join(migDir, `_payload_${name}.json`);
const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));

// stdout: JSON args for apply_migration MCP tool
process.stdout.write(
  JSON.stringify({
    project_id: payload.project_id,
    name: payload.name,
    query: payload.query,
  }),
);
