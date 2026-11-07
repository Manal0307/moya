#!/usr/bin/env node
// Local operations only: never import this entrypoint into the HTTP application.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCatalogueAdmin, createOrderAdmin } from './admin.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const [command, argument] = process.argv.slice(2);
const help = `Local administration (requires operating-system access to private storage):
  node --env-file-if-exists=.env server/admin-cli.mjs products
  node --env-file-if-exists=.env server/admin-cli.mjs put /private/path/product.json
  node --env-file-if-exists=.env server/admin-cli.mjs publish PRODUCT_ID
  node --env-file-if-exists=.env server/admin-cli.mjs archive PRODUCT_ID
  node --env-file-if-exists=.env server/admin-cli.mjs draft PRODUCT_ID
  node --env-file-if-exists=.env server/admin-cli.mjs orders [ID_OR_STATUS]
  node --env-file-if-exists=.env server/admin-cli.mjs order ORDER_ID
  node --env-file-if-exists=.env server/admin-cli.mjs stats
Commands never enable payments or deploy the application.`;
if (!command || command === 'help' || command === '--help') {
  console.log(help);
} else {
  let store;
  try {
    if (!['products', 'put', 'publish', 'archive', 'draft', 'orders', 'order', 'stats'].includes(command)) throw new Error('Unknown command. Use --help.');
    if (!['products', 'orders', 'stats'].includes(command) && !argument) throw new Error('A product id or JSON file is required.');
    const { openStore } = await import('./store.mjs');
    const seed = JSON.parse(await readFile(resolve(root, 'src/app/data/catalog.json'), 'utf8'));
    store = await openStore(resolve(process.env.DATA_DIR ?? resolve(root, 'data')), seed);
    const admin = createCatalogueAdmin({ store, privateDir: resolve(process.env.FILES_DIR ?? resolve(root, 'private-files')) });
    if (['orders', 'order', 'stats'].includes(command)) {
      const orders = createOrderAdmin({ store });
      console.log(JSON.stringify(command === 'orders' ? orders.listOrders(argument ?? '') : command === 'order' ? orders.getOrder(argument) : orders.stats(), null, 2));
    } else if (command === 'products') {
      // No customer information, local filesystem paths or credentials in routine output.
      console.log(JSON.stringify(admin.list(), null, 2));
    } else {
      let result;
      if (command === 'put') {
        const contents = await readFile(resolve(argument), 'utf8');
        if (Buffer.byteLength(contents) > 65536) throw new Error('Product JSON is too large.');
        result = await admin.put(JSON.parse(contents));
      } else result = await admin.setStatus(argument, { publish: 'published', archive: 'archived', draft: 'draft' }[command]);
      console.log(JSON.stringify({ id: result.id, status: result.status, priceCents: result.priceCents, currency: result.currency }));
    }
  } catch (error) {
    // Do not print stack traces, database contents or environment variables.
    console.error(error.status === 400 || /^(Unknown command|A product id|Product JSON)/.test(error.message) ? error.message : 'Administration failed. Check product JSON, configuration and private storage permissions.');
    process.exitCode = 1;
  } finally { store?.close(); }
}
