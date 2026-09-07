// Minimal SQL migration runner: applies migrations/*.sql in filename order,
// recording applied files in schema_migrations.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../db.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../migrations');

export async function migrate() {
  await db.raw(
    'CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())'
  );
  const applied = new Set(
    (await db('schema_migrations').pluck('filename'))
  );
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    await db.transaction(async (trx) => {
      await trx.raw(sql);
      await trx('schema_migrations').insert({ filename: file });
    });
    console.log(`applied ${file}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });
}
