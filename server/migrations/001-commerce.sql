CREATE TABLE products(id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE orders(
 id TEXT PRIMARY KEY, request_key TEXT NOT NULL UNIQUE, fingerprint TEXT NOT NULL,
 email TEXT NOT NULL, name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
 currency TEXT NOT NULL CHECK(currency='eur'), total INTEGER NOT NULL CHECK(total>0),
 items TEXT NOT NULL, consent TEXT NOT NULL, created_at INTEGER NOT NULL,
 session_id TEXT UNIQUE, checkout_url TEXT, payment_intent TEXT UNIQUE,
 refunded INTEGER NOT NULL DEFAULT 0, disputed INTEGER NOT NULL DEFAULT 0,
 paid_at INTEGER, updated_at INTEGER NOT NULL
);
CREATE TABLE events(id TEXT PRIMARY KEY, type TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE tokens(hash TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), expires_at INTEGER NOT NULL, kind TEXT NOT NULL);
CREATE TABLE outbox(id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), payload TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, next_at INTEGER NOT NULL,
 lease_until INTEGER, last_error TEXT, sent_at INTEGER);
CREATE INDEX orders_email ON orders(email);
CREATE INDEX outbox_due ON outbox(status,next_at);
CREATE TABLE audit(id INTEGER PRIMARY KEY, action TEXT NOT NULL, order_id TEXT, created_at INTEGER NOT NULL);
