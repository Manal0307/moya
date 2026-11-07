import { realpath, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';

const invalid = message => Object.assign(new Error(message), { status: 400 });
const slug = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/;
const statuses = new Set(['draft', 'published', 'archived']);
const textFields = { name: 160, category: 80, description: 1000, details: 10000, image: 2048, fileSize: 80, printTime: 80, licenseVersion: 80, version: 80 };

export async function validateProduct(input, { privateDir, products = [] } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw invalid('Product must be an object.');
  if (typeof input.id !== 'string' || !slug.test(input.id)) throw invalid('Invalid product id.');
  if (!statuses.has(input.status)) throw invalid('Status must be draft, published or archived.');
  if (!Number.isSafeInteger(input.priceCents) || input.priceCents < 50 || input.priceCents > 10000000) throw invalid('priceCents must be an integer from 50 to 10000000.');
  if (input.currency !== 'eur') throw invalid('Only EUR is supported.');
  const product = { id: input.id, status: input.status, priceCents: input.priceCents, currency: 'eur', price: input.priceCents / 100, featured: input.featured === true };
  for (const [field, max] of Object.entries(textFields)) {
    if (input[field] !== undefined && (typeof input[field] !== 'string' || input[field].length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(input[field]))) throw invalid(`Invalid ${field}.`);
    if (input[field] !== undefined) product[field] = input[field].trim();
  }
  if (product.category && !slug.test(product.category)) throw invalid('Category must be a slug.');
  if (product.image && !/^(https:\/\/|\/(?!\/)|[a-zA-Z0-9_-]+$)/.test(product.image)) throw invalid('Image must be an asset name, local absolute URL or HTTPS URL.');
  product.licenseVersion ||= 'personal-v1';
  product.version ||= '1';
  product.type = input.type ?? 'single';
  if (!['single', 'bundle'].includes(product.type)) throw invalid('Type must be single or bundle.');
  if (product.type === 'bundle') {
    if (!Array.isArray(input.bundleItems) || !input.bundleItems.length || input.bundleItems.length > 100 || new Set(input.bundleItems).size !== input.bundleItems.length) throw invalid('Bundle requires unique product ids.');
    product.bundleItems = input.bundleItems;
    for (const id of product.bundleItems) {
      const child = products.find(p => p.id === id);
      if (typeof id !== 'string' || id === product.id || !child || child.type === 'bundle') throw invalid('Bundle members must be existing single products; nested bundles are forbidden.');
      if (product.status === 'published' && child.status !== 'published') throw invalid('Publish all bundle members first.');
    }
  } else {
    product.file = input.file ?? `${product.id}.stl`;
    if (typeof product.file !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,199}$/.test(product.file) || product.file.split('/').some(p => p === '..' || p === '.') || extname(product.file).toLowerCase() !== '.stl') throw invalid('File must be a relative STL path without traversal.');
  }
  if (input.compareAtPriceCents !== undefined) {
    if (!Number.isSafeInteger(input.compareAtPriceCents) || input.compareAtPriceCents <= product.priceCents || input.compareAtPriceCents > 10000000) throw invalid('compareAtPriceCents must exceed the actual price.');
    product.compareAtPriceCents = input.compareAtPriceCents;
  }
  if (product.status === 'published') {
    for (const field of ['name', 'category', 'description', 'details', 'image', 'licenseVersion', 'version']) if (!product[field]) throw invalid(`Published products require ${field}.`);
    const members = product.type === 'bundle' ? product.bundleItems.map(id => products.find(p => p.id === id)) : [product];
    for (const member of members) await verifyPrivateFile(privateDir, member.file ?? `${member.id}.stl`);
  }
  return product;
}

export async function verifyPrivateFile(privateDir, file) {
  if (!privateDir) throw invalid('Configure FILES_DIR before publishing.');
  try {
    const base = await realpath(privateDir);
    const actual = await realpath(resolve(base, file));
    const info = await stat(actual);
    if (!actual.startsWith(base + sep) || !info.isFile() || info.size <= 0) throw new Error();
    return actual;
  } catch { throw invalid('A private STL is missing, empty, outside FILES_DIR or not a regular file.'); }
}

export function createCatalogueAdmin({ store, privateDir }) {
  const list = () => store.db.prepare('SELECT data FROM products ORDER BY id').all().map(row => JSON.parse(row.data));
  return {
    list,
    async put(input) {
      // File checks occur before a synchronous transaction; existing orders use immutable snapshots.
      const product = await validateProduct(input, { privateDir, products: list() });
      store.transaction(() => {
        const currentProducts = list();
        if (product.type === 'bundle') {
          for (const id of product.bundleItems) {
            const child = currentProducts.find(p => p.id === id);
            if (!child || child.type === 'bundle' || (product.status === 'published' && child.status !== 'published')) throw invalid('Bundle members changed; review the bundle before saving.');
          }
        }
        const parent = currentProducts.find(p => p.status === 'published' && p.type === 'bundle' && p.bundleItems?.includes(product.id));
        if (parent && (product.status !== 'published' || product.type !== 'single')) throw invalid(`Archive or update bundle ${parent.id} first.`);
        store.db.prepare('INSERT INTO products(id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(product.id, JSON.stringify(product));
        store.db.prepare('INSERT INTO audit(action,created_at) VALUES (?,?)').run(`catalogue.put:${product.id}:${product.status}`, Date.now());
      });
      return product;
    },
    async setStatus(id, status) {
      const product = list().find(p => p.id === id);
      if (!product) throw invalid('Product not found.');
      return this.put({ ...product, status });
    },
  };
}

// Read-only operational views deliberately omit bearer tokens, checkout URLs and customer PII.
export function createOrderAdmin({ store }) {
  const summary = row => row ? { id: row.id, status: row.status, currency: row.currency, totalCents: row.total, refundedCents: row.refunded, disputed: Boolean(row.disputed), createdAt: row.created_at, paidAt: row.paid_at } : null;
  return {
    listOrders(search = '') {
      if (typeof search !== 'string' || search.length > 100) throw invalid('Search must have at most 100 characters.');
      return store.db.prepare('SELECT * FROM orders WHERE instr(id,?)>0 OR status=? ORDER BY created_at DESC LIMIT 100').all(search, search).map(summary);
    },
    getOrder(id) {
      const row = store.db.prepare('SELECT * FROM orders WHERE id=?').get(id);
      if (!row) throw invalid('Order not found.');
      const items = JSON.parse(row.items).map(item => ({ id: item.id, name: item.name, priceCents: item.priceCents, version: item.version, licenseVersion: item.licenseVersion }));
      return { ...summary(row), items };
    },
    stats() {
      const counts = store.db.prepare('SELECT status,COUNT(*) AS count FROM orders GROUP BY status').all();
      const revenue = store.db.prepare('SELECT COUNT(*) AS count,COALESCE(SUM(total),0) AS grossCents,COALESCE(SUM(refunded),0) AS refundedCents FROM orders WHERE paid_at IS NOT NULL').get();
      return { currency: 'eur', ordersByStatus: counts, paidOrders: revenue.count, grossCents: revenue.grossCents, refundedCents: revenue.refundedCents, netBeforeFeesAndTaxCents: revenue.grossCents - revenue.refundedCents };
    },
  };
}
