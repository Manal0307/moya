import { readFile, mkdir, chmod } from "node:fs/promises";
import { resolve } from "node:path";
import { openStore } from "../server/store.mjs";
import { createApp } from "../server/app.mjs";
import { drainOutbox } from "../server/outbox.mjs";
try {
  process.loadEnvFile(".env");
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const dataDir = resolve(process.env.DATA_DIR ?? "data");
const [command, target] = process.argv.slice(2);
if (command === "reconcile") {
  const app = createApp({ dataDir });
  try {
    console.log(JSON.stringify(await app.commerce.reconcile()));
  } finally {
    app.commerce.store.close();
  }
} else {
  const seed = JSON.parse(
    await readFile(
      new URL("../src/app/data/catalog.json", import.meta.url),
      "utf8",
    ),
  );
  const store = openStore(dataDir, seed);
  try {
    if (command === "emails")
      console.log(JSON.stringify(await drainOutbox({ store })));
    else if (command === "backup") {
      if (!target)
        throw Error(
          "Usage: node scripts/commerce.mjs backup /private/path/new-file.sqlite",
        );
      const path = resolve(target);
      await mkdir(resolve(path, ".."), { recursive: true, mode: 0o700 });
      // VACUUM INTO creates a consistent snapshot including committed WAL transactions; target must not exist.
      store.db.prepare("VACUUM INTO ?").run(path);
      await chmod(path, 0o600);
      console.log(
        "Database snapshot created. Copy data/versions and private-files separately.",
      );
    } else if (command === "check")
      console.log(
        JSON.stringify({
          integrity: store.db.prepare("PRAGMA integrity_check").all(),
          foreignKeys: store.db.prepare("PRAGMA foreign_key_check").all(),
          outbox: store.db
            .prepare(
              "SELECT status,COUNT(*) AS count FROM outbox GROUP BY status",
            )
            .all(),
        }),
      );
    else
      throw Error(
        "Usage: node scripts/commerce.mjs reconcile|emails|backup <new-path>|check",
      );
  } finally {
    store.close();
  }
}
