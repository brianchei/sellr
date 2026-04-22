/**
 * Creates apps/web/.env.local from apps/web/.env.example if missing.
 * Run from repo root: pnpm env:web
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'apps/web/.env.example');
const dest = path.join(root, 'apps/web/.env.local');

if (!fs.existsSync(src)) {
  console.error('Missing apps/web/.env.example');
  process.exit(1);
}
if (fs.existsSync(dest)) {
  console.log('apps/web/.env.local already exists — skipped');
  process.exit(0);
}
fs.copyFileSync(src, dest);
console.log('Created apps/web/.env.local (copy apps/web/.env.example)');
