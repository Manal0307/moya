#!/usr/bin/env node
// Move the product catalogue between stores (e.g. local -> production).
//
//   export:  node --env-file-if-exists=.env scripts/catalogue-sync.mjs export catalogue.json
//   import:  node scripts/catalogue-sync.mjs import catalogue.json
//
// Import saves every product from the file through the normal admin checks
// (a published product must have its private STL in FILES_DIR), then moves any
// other published product in the store to draft, so the live shop shows
// exactly the exported catalogue. Orders are never touched.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCatalogueAdmin } from '../server/admin.mjs';
import { openStore } from '../server/store.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const [command, file] = process.argv.slice(2);
if (!['export', 'import'].includes(command) || !file) {
  console.log('Usage: catalogue-sync.mjs export|import <catalogue.json>');
  process.exit(1);
}

const seed = JSON.parse(await readFile(resolve(root, 'src/app/data/catalog.json'), 'utf8'));
const store = openStore(resolve(process.env.DATA_DIR ?? resolve(root, 'data')), seed);
const admin = createCatalogueAdmin({
  store,
  privateDir: resolve(process.env.FILES_DIR ?? resolve(root, 'private-files')),
});

try {
  if (command === 'export') {
    const products = admin.list();
    await writeFile(file, JSON.stringify(products, null, 2) + '\n', { mode: 0o600 });
    const published = products.filter((p) => p.status === 'published').map((p) => p.id);
    console.log(`Exported ${products.length} products (published: ${published.join(', ') || 'none'}).`);
  } else {
    const products = JSON.parse(await readFile(file, 'utf8'));
    // Drafts first, so a published bundle never points at a product not yet saved.
    const ordered = [...products].sort((a, b) => (a.status === 'published') - (b.status === 'published'));
    for (const product of ordered) {
      const { price, ...clean } = product;
      const saved = await admin.put(clean);
      console.log(`saved ${saved.id} (${saved.status}, ${saved.priceCents} cents)`);
    }
    const keep = new Set(products.map((p) => p.id));
    for (const product of admin.list()) {
      if (!keep.has(product.id) && product.status === 'published') {
        await admin.setStatus(product.id, 'draft');
        console.log(`moved ${product.id} to draft (not in the catalogue file)`);
      }
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  store.close();
}
