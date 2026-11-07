import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  readdir,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHmac } from "node:crypto";
import { createApp, validateCart } from "../server/app.mjs";
import { verifyWebhook } from "../server/commerce.mjs";
import { drainOutbox } from "../server/outbox.mjs";
const input = {
  name: "Test User",
  email: "test@example.com",
  items: ["1"],
  consent: true,
  digitalConsent: true,
  requestKey: "a-valid-unique-request-key-1234",
  price: 0.01,
};
const post = (url, data, headers = {}) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(data),
  });
async function fixture(t, { enabled = true, paid = true } = {}) {
  const dir = await mkdtemp(join(tmpdir(), "moya-test-")),
    files = join(dir, "files");
  await mkdir(files);
  for (let i = 1; i <= 8; i++)
    await writeFile(
      join(files, `${i}.stl`),
      "solid test " + i + "\nendsolid test",
    );
  const calls = [];
  let session;
  const payment = {
    id: "pi_test_1",
    livemode: false,
    currency: "eur",
    amount: 299,
    status: "succeeded",
    latest_charge: {
      id: "ch_test_1",
      paid: true,
      amount: 299,
      currency: "eur",
      amount_refunded: 0,
      disputed: false,
    },
  };
  const app = createApp({
    env: {
      STRIPE_SECRET_KEY: "sk_test_fixture",
      STRIPE_WEBHOOK_SECRET: "whsec_fixture",
      COMMERCE_ENABLED: String(enabled),
      APP_ORIGIN: "http://localhost:5173",
      FILES_DIR: files,
    },
    dataDir: dir,
    fetcher: async (url, options) => {
      calls.push({ url, options });
      let data;
      if (options.method === "POST") {
        const params = new URLSearchParams(options.body);
        session = {
          id: "cs_test_valid",
          url: "https://checkout.stripe.com/c/test",
          mode: "payment",
          livemode: false,
          payment_status: paid ? "paid" : "unpaid",
          payment_intent: "pi_test_1",
          amount_total: 299,
          currency: "eur",
          client_reference_id: params.get("client_reference_id"),
          metadata: {
            store: "moya",
            order_id: params.get("metadata[order_id]"),
          },
        };
        data = session;
      } else if (url.includes("/payment_intents/"))
        data = structuredClone(payment);
      else data = structuredClone(session);
      return { ok: true, json: async () => data };
    },
  });
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => app.close(resolve));
    await rm(dir, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${app.address().port}`;
  const checkout = async (data = input) => {
    const response = await post(base + "/api/checkout", data);
    return { response, data: await response.json() };
  };
  const webhook = async (type = "checkout.session.completed", options = {}) => {
    const event = {
      id: options.id ?? "evt_" + type.replaceAll(".", "_"),
      type,
      livemode: false,
      data: { object: options.object ?? structuredClone(session) },
    };
    const raw = JSON.stringify(event),
      stamp = Math.floor(Date.now() / 1000),
      sig = createHmac("sha256", "whsec_fixture")
        .update(stamp + "." + raw)
        .digest("hex");
    return fetch(base + "/api/stripe/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Stripe-Signature": `t=${stamp},v1=${sig}`,
      },
      body: raw,
    });
  };
  return {
    base,
    dir,
    files,
    calls,
    app,
    payment,
    checkout,
    webhook,
    get session() {
      return session;
    },
    get store() {
      return app.commerce.store;
    },
  };
}
const headers = (data) => ({ Authorization: `Bearer ${data.accessToken}` });
async function order(f, data) {
  return fetch(f.base + "/api/orders/" + data.sessionId, {
    headers: headers(data),
  });
}
test("rejects empty, duplicate, unknown, malformed carts", () => {
  for (const ids of [[], ["1", "1"], ["999"], null])
    assert.throws(() => validateCart(ids));
});
test("commerce closed by default and malformed bodies rejected", async (t) => {
  const f = await fixture(t, { enabled: false });
  assert.deepEqual(await (await fetch(f.base + "/api/config")).json(), {
    checkout: false,
  });
  assert.equal((await f.checkout()).response.status, 503);
  for (const value of [null, [], 4])
    assert.equal((await post(f.base + "/api/checkout", value)).status, 400);
  assert.equal(f.calls.length, 0);
});
test("server-priced EUR checkout persisted once and replayed with stable Stripe idempotency", async (t) => {
  const f = await fixture(t),
    a = await f.checkout(),
    b = await f.checkout();
  assert.equal(a.response.status, 200);
  assert.equal(b.data.orderId, a.data.orderId);
  assert.equal(f.calls.length, 1);
  const params = new URLSearchParams(f.calls[0].options.body);
  assert.equal(params.get("line_items[0][price_data][unit_amount]"), "299");
  assert.equal(params.get("line_items[0][quantity]"), "1");
  assert.equal(params.get("line_items[0][price_data][currency]"), "eur");
  assert.equal(params.get("payment_method_types[0]"), "card");
  assert.equal(params.get("payment_method_types[1]"), "bancontact");
  assert.equal(params.get("ui_mode"), null); // Stripe defaults to hosted Checkout.
  assert.equal(params.get("wallet_options[apple_pay][display]"), null);
  assert.equal(params.get("metadata[order_id]"), a.data.orderId);
  assert.match(f.calls[0].options.headers["Idempotency-Key"], /^moya-/);
  assert.equal(
    (await f.checkout({ ...input, email: "another@example.com" })).response
      .status,
    409,
  );
  assert.equal(
    f.store.db.prepare("SELECT COUNT(*) AS n FROM orders").get().n,
    1,
  );
});
test("requires both consents, valid email, same origin and private regular files", async (t) => {
  const f = await fixture(t);
  for (const bad of [
    { email: "bad" },
    { consent: false },
    { digitalConsent: false },
  ])
    assert.equal((await f.checkout({ ...input, ...bad })).response.status, 400);
  assert.equal(
    (
      await post(f.base + "/api/checkout", input, {
        Origin: "https://evil.example",
      })
    ).status,
    403,
  );
  await rm(join(f.files, "1.stl"));
  await mkdir(join(f.files, "1.stl"));
  assert.equal((await f.checkout()).response.status, 503);
  assert.equal(f.calls.length, 0);
});
test("signed webhook pays without browser return, idempotently queues email, and token protects downloads", async (t) => {
  const f = await fixture(t),
    { data } = await f.checkout();
  // Read the database directly: opening the order page would sync from Stripe itself.
  const status = () =>
    f.store.db.prepare("SELECT status FROM orders").get().status;
  assert.equal(status(), "pending");
  assert.equal(
    (await fetch(f.base + "/api/orders/" + data.sessionId)).status,
    403,
  );
  assert.equal(status(), "pending");
  assert.equal((await f.webhook()).status, 200);
  assert.equal((await f.webhook()).status, 200);
  assert.equal(status(), "paid");
  const view = await (await order(f, data)).json();
  assert.equal(view.status, "paid");
  assert.equal(view.items.length, 1);
  assert.equal(
    f.store.db.prepare("SELECT COUNT(*) AS n FROM outbox").get().n,
    1,
  );
  assert.equal(
    f.store.db.prepare("SELECT COUNT(*) AS n FROM events").get().n,
    1,
  );
  const download = await fetch(f.base + view.items[0].download);
  assert.equal(download.status, 200);
  assert.equal(await download.text(), "solid test 1\nendsolid test");
  assert.equal(
    (
      await fetch(
        f.base +
          view.items[0].download.replace(
            /download\/[a-f0-9]+/,
            "download/" + "a".repeat(64),
          ),
      )
    ).status,
    403,
  );
  f.store.db
    .prepare("UPDATE tokens SET expires_at=0 WHERE kind LIKE 'download:%'")
    .run();
  assert.equal((await fetch(f.base + view.items[0].download)).status, 403);
});
test("Apple Pay card wallet metadata uses verified payment delivery and refund revocation", async (t) => {
  const f = await fixture(t);
  f.payment.latest_charge.payment_method_details = {
    type: "card",
    card: { wallet: { type: "apple_pay", apple_pay: {} } },
  };
  const { data } = await f.checkout();
  assert.equal((await f.webhook()).status, 200);
  const view = await (await order(f, data)).json();
  assert.equal(view.status, "paid");
  assert.equal((await fetch(f.base + view.items[0].download)).status, 200);
  f.payment.latest_charge.amount_refunded = 299;
  assert.equal((await f.webhook("charge.refunded", { object: {
    id: "ch_test_1", payment_intent: "pi_test_1",
  } })).status, 200);
  assert.equal((await (await order(f, data)).json()).status, "refunded");
  assert.equal((await fetch(f.base + view.items[0].download)).status, 403);
});
test("purchase snapshot survives catalogue editing and source replacement", async (t) => {
  const f = await fixture(t),
    { data } = await f.checkout();
  await writeFile(join(f.files, "1.stl"), "changed");
  f.store.db.prepare("DELETE FROM products WHERE id='1'").run();
  assert.equal((await f.webhook()).status, 200);
  const view = await (await order(f, data)).json();
  assert.equal(view.items[0].name, "Dreamy Star Charm");
  assert.equal(
    await (await fetch(f.base + view.items[0].download)).text(),
    "solid test 1\nendsolid test",
  );
});
test("unpaid then asynchronous success; expired/failed events cannot regress a paid order", async (t) => {
  const f = await fixture(t, { paid: false }),
    { data } = await f.checkout();
  assert.equal((await f.webhook()).status, 200);
  assert.equal((await (await order(f, data)).json()).status, "pending");
  f.session.payment_status = "paid";
  assert.equal(
    (await f.webhook("checkout.session.async_payment_succeeded")).status,
    200,
  );
  f.session.payment_status = "unpaid";
  assert.equal((await f.webhook("checkout.session.expired")).status, 200);
  assert.equal((await (await order(f, data)).json()).status, "paid");
});
test("signature tampering and old signed timestamps are rejected", async (t) => {
  const f = await fixture(t);
  const raw = Buffer.from('{"id":"evt","type":"x","data":{"object":{}}}');
  const stamp = Math.floor(Date.now() / 1000),
    sig = createHmac("sha256", "secret")
      .update(stamp + ".")
      .update(raw)
      .digest("hex");
  assert.equal(
    verifyWebhook(raw, `t=${stamp},v1=wrong,v1=${sig}`, "secret").id,
    "evt",
  );
  assert.throws(() =>
    verifyWebhook(Buffer.from("{}"), `t=${stamp},v1=${sig}`, "secret"),
  );
  assert.throws(() =>
    verifyWebhook(raw, `t=${stamp - 400},v1=${sig}`, "secret"),
  );
  assert.equal((await post(f.base + "/api/stripe/webhook", {})).status, 400);
});
test("order page settles a paid checkout when the webhook never arrives", async (t) => {
  const f = await fixture(t),
    { data } = await f.checkout();
  const view = await (await order(f, data)).json();
  assert.equal(view.status, "paid");
  assert.equal(view.items[0].name, "Dreamy Star Charm");
  assert.equal(
    await (await fetch(f.base + view.items[0].download)).text(),
    "solid test 1\nendsolid test",
  );
  assert.equal(
    f.store.db.prepare("SELECT COUNT(*) AS n FROM outbox").get().n,
    1,
  );
  // A later webhook for the same payment changes nothing and queues no second email.
  assert.equal((await f.webhook()).status, 200);
  assert.equal(
    f.store.db.prepare("SELECT COUNT(*) AS n FROM outbox").get().n,
    1,
  );
});
test("order page leaves an unpaid checkout pending", async (t) => {
  const f = await fixture(t, { paid: false }),
    { data } = await f.checkout();
  assert.equal((await (await order(f, data)).json()).status, "pending");
});
test("payment mismatch never grants files or commits webhook receipt", async (t) => {
  const f = await fixture(t),
    { data } = await f.checkout();
  assert.equal(
    (
      await f.webhook("checkout.session.completed", {
        object: { ...f.session, amount_total: 1 },
      })
    ).status,
    409,
  );
  // Stripe itself reports a mismatching charge, so the order page cannot settle it either.
  f.payment.amount = 1;
  assert.equal((await (await order(f, data)).json()).status, "pending");
  assert.equal(
    f.store.db.prepare("SELECT COUNT(*) AS n FROM events").get().n,
    0,
  );
  assert.equal((await f.webhook()).status, 409);
  assert.equal(
    f.store.db.prepare("SELECT COUNT(*) AS n FROM outbox").get().n,
    0,
  );
});
test("refund revokes downloads but keeps authenticated refund status visible", async (t) => {
  const f = await fixture(t),
    { data } = await f.checkout();
  assert.equal((await f.webhook()).status, 200);
  const view = await (await order(f, data)).json();
  f.payment.latest_charge.amount_refunded = 299;
  assert.equal(
    (
      await f.webhook("charge.refunded", {
        object: { payment_intent: "pi_test_1" },
      })
    ).status,
    200,
  );
  const refundedView = await order(f, data);
  assert.equal(refundedView.status, 200);
  const refunded = await refundedView.json();
  assert.equal(refunded.status, "refunded");
  assert.deepEqual(refunded.items, []);
  assert.equal(
    (await fetch(f.base + "/api/orders/" + data.sessionId)).status,
    403,
  );
  assert.equal((await fetch(f.base + view.items[0].download)).status, 403);
  assert.equal(
    (await f.webhook("checkout.session.completed", { id: "evt_late_paid" }))
      .status,
    200,
  );
  assert.equal(
    f.store.db.prepare("SELECT status FROM orders WHERE id=?").get(data.orderId)
      .status,
    "refunded",
  );
  assert.equal(
    f.store.db.prepare("SELECT status FROM outbox").get().status,
    "cancelled",
  );
});
test("partial refunds and disputes conservatively revoke downloads", async (t) => {
  const f = await fixture(t),
    { data } = await f.checkout();
  await f.webhook();
  f.payment.latest_charge.amount_refunded = 100;
  await f.webhook("charge.refunded", {
    object: { payment_intent: "pi_test_1" },
  });
  assert.equal(
    f.store.db.prepare("SELECT status FROM orders").get().status,
    "partially_refunded",
  );
  f.payment.latest_charge.disputed = true;
  await f.webhook("charge.dispute.created", {
    object: { payment_intent: "pi_test_1" },
  });
  assert.equal(
    f.store.db.prepare("SELECT status FROM orders").get().status,
    "disputed",
  );
});
test("recovery does not enumerate email and outbox stays pending without explicit provider configuration", async (t) => {
  const f = await fixture(t),
    { data } = await f.checkout();
  await f.webhook();
  const a = await post(f.base + "/api/recover", { email: input.email }),
    b = await post(f.base + "/api/recover", { email: "unknown@example.com" });
  assert.equal(a.status, 202);
  assert.deepEqual(await a.json(), await b.json());
  assert.equal(
    f.store.db.prepare("SELECT COUNT(*) AS n FROM outbox").get().n,
    2,
  );
  assert.deepEqual(await drainOutbox({ store: f.store, env: {} }), {
    enabled: false,
    sent: 0,
    failed: 0,
  });
  let calls = 0;
  const env = {
    EMAIL_SEND_ENABLED: "true",
    RESEND_API_KEY: "test",
    EMAIL_FROM: "test@example.com",
  };
  const result = await drainOutbox({
    store: f.store,
    env,
    fetcher: async (_url, options) => {
      calls++;
      const mail = JSON.parse(options.body);
      const access = mail.text.match(/access=([A-Za-z0-9_-]{43})/)?.[1];
      assert.ok(access);
      assert.ok(mail.html.includes("access=" + access));
      assert.ok(mail.subject.includes("Tokki Pocket"));
      return { ok: false, status: 503 };
    },
  });
  assert.equal(result.failed, 2);
  assert.equal(calls, 2);
  assert.equal(
    f.store.db
      .prepare("SELECT COUNT(*) AS n FROM outbox WHERE status='sent'")
      .get().n,
    0,
  );
  f.store.db.prepare("UPDATE outbox SET next_at=0").run();
  assert.equal(
    (
      await drainOutbox({
        store: f.store,
        env,
        fetcher: async () => ({
          ok: true,
          json: async () => ({ id: "email_test" }),
        }),
      })
    ).sent,
    2,
  );
});
test("reconciliation recovers missed session webhook", async (t) => {
  const f = await fixture(t),
    { data } = await f.checkout();
  assert.deepEqual(await f.app.commerce.reconcile(), { checked: 1 });
  assert.equal((await (await order(f, data)).json()).status, "paid");
});
test("direct cancellation preserves selected product and contacts persist without claiming email delivery", async (t) => {
  const f = await fixture(t);
  await f.checkout({ ...input, direct: true });
  assert.equal(
    new URLSearchParams(f.calls[0].options.body).get("cancel_url"),
    "http://localhost:5173/checkout?cancelled=1&buy=1",
  );
  const result = await post(f.base + "/api/contact", {
    name: "Camille",
    email: "camille@example.com",
    subject: "Custom",
    message: "A custom five centimetre keychain.",
    website: "",
  });
  assert.equal(result.status, 201);
  const response = await result.json(),
    entries = await readdir(join(f.dir, "inquiries"));
  assert.equal(
    JSON.parse(await readFile(join(f.dir, "inquiries", entries[0]), "utf8"))
      .reference,
    response.reference,
  );
});

test("public catalogue hides storage paths, bundle membership and private metadata", async (t) => {
  const f = await fixture(t),
    p = JSON.parse(
      f.store.db.prepare("SELECT data FROM products WHERE id='1'").get().data,
    );
  p.file = "private-secret/model.stl";
  p.bundleItems = ["2"];
  p.licenseText = "private";
  f.store.db
    .prepare("UPDATE products SET data=? WHERE id='1'")
    .run(JSON.stringify(p));
  const response = await (await fetch(f.base + "/api/catalog")).json(),
    product = response.products.find((p) => p.id === "1");
  assert.equal(product.price, 2.99);
  for (const key of [
    "file",
    "files",
    "fileKey",
    "bundleItems",
    "licenseText",
    "status",
  ])
    assert.equal(product[key], undefined);
  assert.equal(JSON.stringify(response).includes("private-secret"), false);
});
test("consistent database backup restores order snapshots and access rights", async (t) => {
  const { openStore } = await import("../server/store.mjs");
  const f = await fixture(t),
    { data } = await f.checkout();
  await f.webhook();
  const path = join(f.dir, "snapshot.sqlite");
  f.store.db.prepare("VACUUM INTO ?").run(path);
  const restoredDir = join(f.dir, "restore");
  await mkdir(restoredDir);
  const { copyFile } = await import("node:fs/promises");
  await copyFile(path, join(restoredDir, "commerce.sqlite"));
  const restored = openStore(restoredDir);
  try {
    assert.equal(
      restored.db.prepare("PRAGMA integrity_check").get().integrity_check,
      "ok",
    );
    assert.equal(
      restored.db
        .prepare("SELECT status FROM orders WHERE id=?")
        .get(data.orderId).status,
      "paid",
    );
    assert.equal(
      restored.db.prepare("SELECT COUNT(*) AS n FROM tokens").get().n,
      f.store.db.prepare("SELECT COUNT(*) AS n FROM tokens").get().n,
    );
    assert.equal(
      restored.db
        .prepare("SELECT items FROM orders WHERE id=?")
        .get(data.orderId).items,
      f.store.db
        .prepare("SELECT items FROM orders WHERE id=?")
        .get(data.orderId).items,
    );
  } finally {
    restored.close();
  }
});
test("full pack snapshots every member and delivers all files", async (t) => {
  const f = await fixture(t);
  const p = JSON.parse(
    f.store.db.prepare("SELECT data FROM products WHERE id='1'").get().data,
  );
  p.type = "bundle";
  p.bundleItems = ["1", "2"];
  p.id = "pack";
  f.store.db
    .prepare("INSERT INTO products VALUES(?,?)")
    .run("pack", JSON.stringify(p));
  const { data } = await f.checkout({ ...input, items: ["pack"] });
  assert.equal((await f.webhook()).status, 200);
  const view = await (await order(f, data)).json();
  assert.equal(view.items.length, 2);
  const content = await Promise.all(
    view.items.map(async (item) =>
      (await fetch(f.base + item.download)).text(),
    ),
  );
  assert.equal(
    content.some((x) => x.includes("test 1")),
    true,
  );
  assert.equal(
    content.some((x) => x.includes("test 2")),
    true,
  );
});

test("refund arriving before completed retries then blocks delivery on fresh charge state", async (t) => {
  const f = await fixture(t),
    { data } = await f.checkout();
  f.payment.latest_charge.amount_refunded = 299;
  assert.equal(
    (
      await f.webhook("charge.refunded", {
        object: { payment_intent: "pi_test_1" },
      })
    ).status,
    409,
  );
  assert.equal((await f.webhook()).status, 200);
  assert.equal(
    (
      await f.webhook("charge.refunded", {
        object: { payment_intent: "pi_test_1" },
      })
    ).status,
    200,
  );
  assert.equal(
    f.store.db.prepare("SELECT status FROM orders WHERE id=?").get(data.orderId)
      .status,
    "refunded",
  );
  assert.equal(
    f.store.db.prepare("SELECT COUNT(*) AS n FROM outbox").get().n,
    0,
  );
  const viewAfterRefund = await (await order(f, data)).json();
  assert.equal(viewAfterRefund.status, "refunded");
  assert.deepEqual(viewAfterRefund.items, []);
});

test("a missing unrelated prototype does not disable an available product", async (t) => {
  const f = await fixture(t);
  await rm(join(f.files, "2.stl"));
  assert.deepEqual(await (await fetch(f.base + "/api/config")).json(), {
    checkout: true,
  });
  assert.equal((await f.checkout()).response.status, 200);
  assert.equal(
    (
      await f.checkout({
        ...input,
        items: ["2"],
        requestKey: "missing-prototype-request-12345",
      })
    ).response.status,
    503,
  );
});

test("declined and abandoned checkouts never unlock files or enqueue delivery", async (t) => {
  for (const event of [
    "checkout.session.async_payment_failed",
    "checkout.session.expired",
  ]) {
    const f = await fixture(t, { paid: false });
    const { data } = await f.checkout();
    assert.equal((await f.webhook(event)).status, 200);
    const view = await (await order(f, data)).json();
    assert.equal(view.status, event.endsWith("expired") ? "expired" : "failed");
    assert.deepEqual(view.items, []);
    assert.equal(
      f.store.db.prepare("SELECT COUNT(*) AS n FROM outbox").get().n,
      0,
    );
    assert.equal(
      f.store.db
        .prepare("SELECT COUNT(*) AS n FROM tokens WHERE kind LIKE 'download%'")
        .get().n,
      0,
    );
  }
});

test("live mode needs a live key and refuses test-mode events", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "moya-live-"));
  // Checkout only opens when at least one published product has its file.
  await writeFile(join(dir, "1.stl"), "solid live\nendsolid live");
  const start = async (env) => {
    const app = createApp({
      env: {
        STRIPE_WEBHOOK_SECRET: "whsec_live_fixture",
        COMMERCE_ENABLED: "true",
        APP_ORIGIN: "https://tokkipocket.com",
        FILES_DIR: dir,
        ...env,
      },
      dataDir: dir,
      fetcher: async () => {
        throw new Error("Stripe must not be called");
      },
    });
    await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
    t.after(() => new Promise((resolve) => app.close(resolve)));
    return `http://127.0.0.1:${app.address().port}`;
  };
  t.after(() => rm(dir, { recursive: true, force: true }));

  // A test key cannot open checkout once the store is switched to live.
  const mixed = await start({ STRIPE_MODE: "live", STRIPE_SECRET_KEY: "sk_test_fixture" });
  assert.deepEqual(await (await fetch(mixed + "/api/config")).json(), { checkout: false });

  // With a live key, a correctly signed test-mode event is still refused.
  const live = await start({ STRIPE_MODE: "live", STRIPE_SECRET_KEY: "sk_live_fixture" });
  assert.deepEqual(await (await fetch(live + "/api/config")).json(), { checkout: true });
  const raw = JSON.stringify({
    id: "evt_test_in_live",
    type: "checkout.session.completed",
    livemode: false,
    data: { object: {} },
  });
  const stamp = Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", "whsec_live_fixture").update(stamp + "." + raw).digest("hex");
  const response = await fetch(live + "/api/stripe/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Stripe-Signature": `t=${stamp},v1=${sig}` },
    body: raw,
  });
  assert.equal(response.status, 400);
});

test("rate limit counts each visitor behind a trusted proxy", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "moya-proxy-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const app = createApp({ env: { TRUST_PROXY: "true", FILES_DIR: dir }, dataDir: dir });
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => app.close(resolve)));
  const base = `http://127.0.0.1:${app.address().port}`;
  const hit = (ip) =>
    fetch(base + "/api/catalog", { headers: { "X-Forwarded-For": `203.0.113.9, ${ip}` } });
  for (let i = 0; i < 120; i++) assert.equal((await hit("198.51.100.1")).status, 200);
  assert.equal((await hit("198.51.100.1")).status, 429); // same visitor is limited
  assert.equal((await hit("198.51.100.2")).status, 200); // another visitor is not
});
