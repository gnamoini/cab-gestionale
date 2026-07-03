import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const name = process.argv[2];
if (!name) {
  console.error('Usage: node scripts/_mcp-apply-one.mjs <migration_name>');
  process.exit(1);
}

const payloadPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'supabase',
  'migrations',
  `_payload_${name}.json`,
);

if (!fs.existsSync(payloadPath)) {
  console.error('Payload not found:', payloadPath);
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
// Output minimal manifest for agent MCP call
console.log(JSON.stringify({ ok: true, name: payload.name, bytes: payload.query.length }));
