import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, writeFile, rm, symlink, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCatalogueAdmin, validateProduct } from '../server/admin.mjs';
const draft = { id: 'model', name: 'Model', status: 'draft', priceCents: 299, currency: 'eur', category: 'charm', description: 'A model', details: 'Digital file', image: 'charmBunny' };
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'moya-admin-'));
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE products(id TEXT PRIMARY KEY,data TEXT NOT NULL); CREATE TABLE audit(id INTEGER PRIMARY KEY,action TEXT NOT NULL,order_id TEXT,created_at INTEGER NOT NULL)');
  const store = { db, transaction(fn) { db.exec('BEGIN'); try { const result = fn(); db.exec('COMMIT'); return result; } catch (error) { db.exec('ROLLBACK'); throw error; } } };
  t.after(async () => { db.close(); await rm(dir, { recursive: true, force: true }); });
  return { dir, admin: createCatalogueAdmin({ store, privateDir: dir }) };
}
test('catalogue persists integer EUR price and archives without deletion', async t => {
  const { admin } = await fixture(t);
  await admin.put(draft);
  assert.equal(admin.list()[0].price, 2.99);
  await admin.setStatus('model', 'archived');
  assert.equal(admin.list()[0].status, 'archived');
});
test('publication checks files; editing products preserves immutability boundary', async t => {
  const { dir, admin } = await fixture(t);
  await assert.rejects(admin.put({ ...draft, status: 'published' }), /private STL/);
  await writeFile(join(dir, 'model.stl'), 'solid test\nendsolid test\n');
  await admin.put({ ...draft, status: 'published' });
  assert.equal(admin.list()[0].status, 'published');
  await assert.rejects(admin.put({ ...draft, priceCents: 2.99 }), /integer/);
  await assert.rejects(admin.put({ ...draft, currency: 'usd' }), /EUR/);
});
test('publication rejects symlinks outside private storage and directories', async t => {
  const { dir, admin } = await fixture(t);
  await symlink(import.meta.filename, join(dir, 'model.stl'));
  await assert.rejects(admin.put({ ...draft, status: 'published' }), /private STL/);
  await mkdir(join(dir, 'folder.stl'));
  await assert.rejects(admin.put({ ...draft, file: 'folder.stl', status: 'published' }), /private STL/);
  await assert.rejects(admin.put({ ...draft, file: '../outside.stl' }), /relative STL/);
});
test('bundles require published existing members; active bundles prevent member archival', async t => {
  const { dir, admin } = await fixture(t);
  await writeFile(join(dir, 'model.stl'), 'solid model\nendsolid model');
  await admin.put(draft);
  const bundle = { ...draft, id: 'pack', type: 'bundle', bundleItems: ['model'], status: 'published' };
  await assert.rejects(admin.put(bundle), /Publish all/);
  await admin.setStatus('model', 'published');
  await admin.put(bundle);
  await assert.rejects(admin.setStatus('model', 'archived'), /bundle pack/);
  await admin.put({ ...draft, id: 'other', status: 'draft' });
  await writeFile(join(dir, 'other.stl'), 'solid other\nendsolid other');
  await admin.setStatus('other', 'published');
  await assert.rejects(admin.put({ ...draft, status: 'published', type: 'bundle', bundleItems: ['other'] }), /bundle pack/);
  assert.equal(admin.list().find(p => p.id === 'model').type, 'single');
  await admin.put({ ...draft, status: 'published', priceCents: 399 });
  assert.equal(admin.list().find(p => p.id === 'model').priceCents, 399);
  await admin.setStatus('pack', 'archived');
  await admin.setStatus('model', 'archived');
  await assert.rejects(admin.put({ ...bundle, id: 'nested', bundleItems: ['pack'] }), /single products/);
});
test('malformed fields and unknown properties cannot enter catalogue', async () => {
  await assert.rejects(validateProduct(null), /object/);
  await assert.rejects(validateProduct({ ...draft, category: '../x' }), /slug/);
  await assert.rejects(validateProduct({ ...draft, image: 'javascript:alert(1)' }), /Image/);
  const result = await validateProduct({ ...draft, compareAtPriceCents: 499, arbitrary: 'ignored' });
  assert.equal(result.compareAtPriceCents, 499);
  assert.equal(result.arbitrary, undefined);
});
test('order views use persistent commerce schema and omit private customer data and links', async t => {
  const { openStore } = await import('../server/store.mjs');
  const { createOrderAdmin } = await import('../server/admin.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'moya-admin-orders-'));
  const store = openStore(dir, []);
  t.after(async () => { store.close(); await rm(dir, { recursive: true, force: true }); });
  store.db.prepare(`INSERT INTO orders(id,request_key,fingerprint,email,name,status,currency,total,items,consent,created_at,paid_at,updated_at,refunded,checkout_url) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run('order-a', 'key-a', 'fingerprint', 'private@example.test', 'Private name', 'partially_refunded', 'eur', 1000, JSON.stringify([{id:'one', name:'One', files:[{secret:'hidden'}]}]), '{}', 1, 2, 3, 200, 'https://secret.test');
  const orders = createOrderAdmin({ store });
  assert.equal(orders.listOrders('partially_refunded').length, 1);
  assert.equal(orders.listOrders("' OR 1=1 --").length, 0);
  assert.equal(orders.getOrder('order-a').items[0].id, 'one');
  assert.equal(orders.stats().netBeforeFeesAndTaxCents, 800);
  const output = JSON.stringify([orders.listOrders(), orders.getOrder('order-a'), orders.stats()]);
  assert.ok(!output.includes('private@example') && !output.includes('secret') && !output.includes('Private name'));
  await assert.rejects(async () => orders.getOrder('missing'), /not found/);
});
