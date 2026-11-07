import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
export function openStore(dataDir, seedCatalog = []) {
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const path = resolve(dataDir, "commerce.sqlite");
  const db = new DatabaseSync(path);
  chmodSync(path, 0o600);
  db.exec(
    "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
  );
  const transaction = (fn) => {
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      db.exec("COMMIT");
      return result;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  };
  db.exec(
    "CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)",
  );
  if (!db.prepare("SELECT 1 FROM migrations WHERE version=1").get())
    transaction(() => {
      db.exec(
        readFileSync(
          new URL("./migrations/001-commerce.sql", import.meta.url),
          "utf8",
        ),
      );
      db.prepare("INSERT INTO migrations VALUES(1,?)").run(Date.now());
      for (const p of seedCatalog)
        db.prepare("INSERT INTO products VALUES(?,?)").run(
          p.id,
          JSON.stringify({
            ...p,
            status: "published",
            priceCents: Math.round(p.price * 100),
            currency: "eur",
            licenseVersion: "personal-v1",
          }),
        );
    });
  if (!db.prepare("SELECT 1 FROM migrations WHERE version=2").get())
    transaction(() => {
      db.exec(
        readFileSync(
          new URL("./migrations/002-admin.sql", import.meta.url),
          "utf8",
        ),
      );
      db.prepare("INSERT INTO migrations VALUES(2,?)").run(Date.now());
    });
  return { db, path, transaction, close: () => db.close() };
}
