import { renderOrderEmail } from "./email.mjs";
import { readFileSync } from "node:fs";
const terms = JSON.parse(
  readFileSync(
    new URL("../src/app/data/commerce-terms.json", import.meta.url),
    "utf8",
  ),
);
import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { mkdir, realpath, stat, copyFile, chmod } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { resolve, sep } from "node:path";
const error = (status, message) =>
  Object.assign(new Error(message), { status });
const digest = (value) => createHash("sha256").update(value).digest("hex");
const now = () => Date.now();
const secret = () => randomBytes(32).toString("base64url");
const validEmail = (x) =>
  typeof x === "string" && x.length <= 254 && /^\S+@\S+\.\S+$/.test(x);
const ORDER_TTL = 24 * 60 * 60 * 1000;
export function verifyWebhook(
  raw,
  signature,
  signingSecret,
  timestamp = now(),
) {
  if (!signingSecret || typeof signature !== "string")
    throw error(400, "Invalid webhook signature.");
  const entries = signature.split(",").map((s) => s.split("="));
  const t = entries.find(([k]) => k === "t")?.[1];
  if (!/^\d+$/.test(t ?? "") || Math.abs(timestamp / 1000 - Number(t)) > 300)
    throw error(400, "Invalid webhook timestamp.");
  const expected = createHmac("sha256", signingSecret)
    .update(t + ".")
    .update(raw)
    .digest();
  if (
    !entries.some(
      ([k, v]) =>
        k === "v1" &&
        /^[a-f0-9]{64}$/i.test(v ?? "") &&
        timingSafeEqual(expected, Buffer.from(v, "hex")),
    )
  )
    throw error(400, "Invalid webhook signature.");
  try {
    const event = JSON.parse(raw.toString());
    if (
      !event ||
      typeof event.id !== "string" ||
      typeof event.type !== "string" ||
      !event.data?.object
    )
      throw Error();
    return event;
  } catch {
    throw error(400, "Invalid webhook event.");
  }
}
export function createCommerce({
  store,
  env,
  fetcher,
  dataDir,
  catalog,
  json,
  body,
}) {
  const { db, transaction } = store;
  const origin = env.APP_ORIGIN ?? "http://localhost:5173";
  const privateDir = resolve(env.FILES_DIR ?? "private-files");
  const versionsDir = resolve(dataDir, "versions");
  // Test mode unless STRIPE_MODE=live is set explicitly. The key, Checkout
  // session ids and every Stripe object/event must all match that one mode:
  // a test key can never confirm live payments and vice versa.
  const live = env.STRIPE_MODE === "live";
  const keyPattern = live ? /^sk_live_/ : /^sk_test_/;
  const sessionPattern = live ? /^cs_live_\w+$/ : /^cs_test_\w+$/;
  const configured =
    env.COMMERCE_ENABLED === "true" &&
    keyPattern.test(env.STRIPE_SECRET_KEY ?? "") &&
    !!env.STRIPE_WEBHOOK_SECRET;
  const allProducts = () =>
    db
      .prepare("SELECT data FROM products")
      .all()
      .map((p) => JSON.parse(p.data));
  const orderById = (id) =>
    db.prepare("SELECT * FROM orders WHERE id=?").get(id);
  const orderBySession = (id) =>
    db.prepare("SELECT * FROM orders WHERE session_id=?").get(id);
  async function stripe(path, params, key) {
    if (!keyPattern.test(env.STRIPE_SECRET_KEY ?? ""))
      throw error(503, "Stripe configuration is missing.");
    const response = await fetcher("https://api.stripe.com/v1/" + path, {
      method: params ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Stripe-Version": "2024-06-20",
        ...(params
          ? { "Content-Type": "application/x-www-form-urlencoded" }
          : {}),
        ...(key ? { "Idempotency-Key": key } : {}),
      },
      ...(params ? { body: params.toString() } : {}),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok)
      throw error(
        502,
        "The payment provider is unavailable. Please try again later.",
      );
    return response.json();
  }
  async function sourceFile(id) {
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id))
      throw error(400, "Invalid file reference.");
    try {
      const base = await realpath(privateDir),
        product = allProducts().find((p) => p.id === id),
        key = product?.file ?? id + ".stl",
        path = await realpath(resolve(base, key)),
        info = await stat(path);
      if (!path.startsWith(base + sep) || !info.isFile() || info.size === 0)
        throw Error();
      return path;
    } catch {
      throw error(503, "A purchased file is currently unavailable.");
    }
  }
  async function snapshotFile(id) {
    const path = await sourceFile(id);
    const hash = createHash("sha256");
    let bytes = 0;
    for await (const chunk of createReadStream(path)) {
      hash.update(chunk);
      bytes += chunk.length;
    }
    const sha256 = hash.digest("hex");
    await mkdir(versionsDir, { recursive: true, mode: 0o700 });
    // Exclusive content-addressed destination; old purchases never follow mutable source filenames.
    const fileKey = sha256 + ".stl",
      target = resolve(versionsDir, fileKey);
    try {
      await copyFile(path, target, 1);
      await chmod(target, 0o600);
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
    }
    const actual = createHash("sha256");
    for await (const chunk of createReadStream(target)) actual.update(chunk);
    if (actual.digest("hex") !== sha256)
      throw error(503, "File changed during checkout. Please try again.");
    return { id, fileKey, sha256, bytes };
  }
  function selection(ids) {
    if (
      !Array.isArray(ids) ||
      !ids.length ||
      ids.length > 50 ||
      new Set(ids).size !== ids.length
    )
      throw error(400, "Your cart is invalid.");
    const available = allProducts();
    return ids.map((id) => {
      const p = available.find((p) => p.id === id && p.status === "published");
      if (
        !p ||
        p.currency !== "eur" ||
        !Number.isSafeInteger(p.priceCents) ||
        p.priceCents <= 0
      )
        throw error(400, "A model is unavailable.");
      return p;
    });
  }
  function token(orderId, kind = "order", ttl = ORDER_TTL) {
    const value = secret();
    db.prepare("INSERT INTO tokens VALUES(?,?,?,?)").run(
      digest(value),
      orderId,
      now() + ttl,
      kind,
    );
    return value;
  }
  function authorize(order, value, kind = "order") {
    if (!order || typeof value !== "string" || !/^[\w-]{43}$/.test(value))
      throw error(403, "A valid download access link is required.");
    const access = db
      .prepare(
        "SELECT * FROM tokens WHERE hash=? AND order_id=? AND kind=? AND expires_at>?",
      )
      .get(digest(value), order.id, kind, now());
    if (!access)
      throw error(
        403,
        "This access link is unavailable. It may have expired or been revoked. Contact the studio if you need help.",
      );
    return order;
  }
  function enqueue(order, reason, key) {
    const access = token(order.id);
    const link = `${origin}/checkout?order=${order.id}&access=${access}`;
    const payload = renderOrderEmail(order, link, reason);
    db.prepare(
      "INSERT OR IGNORE INTO outbox(id,order_id,payload,next_at) VALUES(?,?,?,?)",
    ).run(key, order.id, JSON.stringify(payload), now());
  }
  function applySession(session, eventType) {
    const id = session.metadata?.order_id;
    const order = id ? orderById(id) : null;
    if (!order || session.metadata?.store !== "moya")
      throw error(409, "Order reconciliation failed.");
    if (
      session.livemode !== live ||
      session.mode !== "payment" ||
      session.currency !== order.currency ||
      session.amount_total !== order.total ||
      session.client_reference_id !== order.id ||
      (order.session_id && session.id !== order.session_id)
    )
      throw error(409, "Payment does not match the saved order.");
    if (typeof session.id !== "string" || !sessionPattern.test(session.id))
      throw error(409, "Invalid test session.");
    const pi =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;
    db.prepare(
      "UPDATE orders SET session_id=COALESCE(session_id,?),payment_intent=COALESCE(payment_intent,?),updated_at=? WHERE id=?",
    ).run(session.id, pi ?? null, now(), order.id);
    // Re-read the PaymentIntent on every paid observation. This prevents missed/out-of-order refunds from granting access.
    return { order, pi };
  }
  async function sessionState(session, eventType) {
    const matched = applySession(session, eventType);
    let charge;
    if (session.payment_status === "paid") {
      if (!matched.pi) throw error(409, "Payment intent is missing.");
      const payment = await stripe(
        `payment_intents/${encodeURIComponent(matched.pi)}?expand[]=latest_charge`,
      );
      if (
        payment.livemode !== live ||
        payment.currency !== matched.order.currency ||
        payment.amount !== matched.order.total ||
        payment.status !== "succeeded"
      )
        throw error(409, "Payment reconciliation failed.");
      charge = payment.latest_charge;
      if (
        !charge ||
        typeof charge !== "object" ||
        charge.paid !== true ||
        charge.amount !== matched.order.total ||
        charge.currency !== matched.order.currency
      )
        throw error(409, "Payment charge is missing.");
    }
    return { session, charge, eventType, orderId: matched.order.id };
  }
  function commitState({ session, charge, eventType, orderId }) {
    const order = orderById(orderId);
    if (charge) {
      const refund = Math.max(order.refunded, charge.amount_refunded ?? 0),
        disputed = order.disputed || charge.disputed === true;
      if (refund > 0 || disputed) {
        db.prepare(
          "UPDATE orders SET paid_at=COALESCE(paid_at,?) WHERE id=?",
        ).run(now(), order.id);
        revoke(order.id, refund, disputed);
      } else if (
        !["refunded", "partially_refunded", "disputed"].includes(order.status)
      ) {
        db.prepare(
          "UPDATE orders SET status='paid',paid_at=COALESCE(paid_at,?),updated_at=? WHERE id=?",
        ).run(now(), now(), order.id);
        if (!order.paid_at)
          enqueue(orderById(order.id), "purchase", `purchase-${order.id}`);
      }
    } else if (
      order.status === "pending" &&
      [
        "checkout.session.expired",
        "checkout.session.async_payment_failed",
      ].includes(eventType)
    ) {
      db.prepare("UPDATE orders SET status=?,updated_at=? WHERE id=?").run(
        eventType.endsWith("expired") ? "expired" : "failed",
        now(),
        order.id,
      );
    }
  }
  // Same verification as the webhook and reconcile paths, throttled per order.
  const lastSync = new Map();
  async function syncPending(order) {
    const at = Date.now();
    if (at - (lastSync.get(order.id) ?? 0) < 2000) return;
    if (lastSync.size > 1000) lastSync.clear();
    lastSync.set(order.id, at);
    try {
      const session = await stripe(
        "checkout/sessions/" + encodeURIComponent(order.session_id),
      );
      const state = await sessionState(session, "order.viewed");
      transaction(() => commitState(state));
    } catch {
      // Stay pending: the webhook, the next check or reconcile will settle it.
    }
  }
  function revoke(id, amount, disputed) {
    const order = orderById(id),
      refunded = Math.max(order.refunded, amount ?? 0);
    const status = disputed
      ? "disputed"
      : refunded >= order.total
        ? "refunded"
        : "partially_refunded";
    db.prepare(
      "UPDATE orders SET status=?,refunded=?,disputed=?,updated_at=? WHERE id=?",
    ).run(status, refunded, disputed ? 1 : order.disputed, now(), id);
    db.prepare(
      "UPDATE outbox SET status='cancelled' WHERE order_id=? AND status!='sent'",
    ).run(id);
    // Keep unexpired order tokens for authenticated status viewing only.
    // File downloads independently require status=paid and their own token.
    db.prepare("DELETE FROM tokens WHERE order_id=? AND kind!='order'").run(id);
  }
  async function webhook(req, res) {
    const raw = await body(req, true),
      event = verifyWebhook(
        raw,
        req.headers["stripe-signature"],
        env.STRIPE_WEBHOOK_SECRET,
      );
    if (event.livemode !== live)
      throw error(400, "This event does not match the store's Stripe mode.");
    if (db.prepare("SELECT 1 FROM events WHERE id=?").get(event.id))
      return json(res, 200, { received: true });
    const object = event.data.object;
    let update;
    if (
      [
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
        "checkout.session.async_payment_failed",
        "checkout.session.expired",
      ].includes(event.type)
    )
      update = await sessionState(object, event.type);
    else if (
      [
        "charge.refunded",
        "charge.dispute.created",
        "charge.dispute.closed",
        "refund.updated",
        "refund.created",
      ].includes(event.type)
    ) {
      const pi =
        typeof object.payment_intent === "string"
          ? object.payment_intent
          : object.payment_intent?.id;
      const order = pi
        ? db.prepare("SELECT * FROM orders WHERE payment_intent=?").get(pi)
        : null;
      // An earlier refund can arrive before the session event: retry until the session is recorded.
      if (!order)
        throw error(
          409,
          "Payment has not yet been reconciled. Retry this event.",
        );
      const payment = await stripe(
        `payment_intents/${encodeURIComponent(pi)}?expand[]=latest_charge`,
      );
      const charge = payment.latest_charge;
      if (
        payment.livemode !== live ||
        payment.amount !== order.total ||
        payment.currency !== order.currency ||
        typeof charge !== "object"
      )
        throw error(409, "Refund reconciliation failed.");
      update = {
        refundOrder: order.id,
        refund: charge.amount_refunded ?? 0,
        disputed:
          charge.disputed === true || event.type.startsWith("charge.dispute."),
      };
    }
    transaction(() => {
      if (db.prepare("SELECT 1 FROM events WHERE id=?").get(event.id)) return;
      if (update?.refundOrder) {
        if (update.refund > 0 || update.disputed)
          revoke(update.refundOrder, update.refund, update.disputed);
      } else if (update) commitState(update);
      db.prepare("INSERT INTO events VALUES(?,?,?)").run(
        event.id,
        event.type,
        now(),
      );
    });
    return json(res, 200, { received: true });
  }
  async function checkout(req, res) {
    const input = await body(req);
    if (
      !validEmail(input.email) ||
      typeof input.name !== "string" ||
      !input.name.trim() ||
      input.name.length > 120 ||
      input.consent !== true ||
      input.digitalConsent !== true
    )
      throw error(
        400,
        "Check your details and accept the terms and immediate digital delivery.",
      );
    if (
      typeof input.requestKey !== "string" ||
      !/^[\w-]{20,80}$/.test(input.requestKey)
    )
      throw error(400, "Please reload the checkout page.");
    if (!configured)
      throw error(
        503,
        "Purchases are temporarily unavailable. Your cart is preserved.",
      );
    const products = selection(input.items);
    const fingerprint = digest(
      JSON.stringify({
        items: input.items,
        email: input.email.trim().toLowerCase(),
        name: input.name.trim(),
        direct: input.direct === true,
      }),
    );
    let order = db
      .prepare("SELECT * FROM orders WHERE request_key=?")
      .get(input.requestKey);
    if (order && order.fingerprint !== fingerprint)
      throw error(
        409,
        "This checkout attempt has changed. Reload before trying again.",
      );
    if (!order) {
      const items = [];
      for (const p of products) {
        const members = p.type === "bundle" ? (p.bundleItems ?? []) : [p.id];
        if (
          !Array.isArray(members) ||
          !members.length ||
          members.length > 50 ||
          members.some(
            (id) =>
              !allProducts().some(
                (item) => item.id === id && item.type !== "bundle",
              ),
          )
        )
          throw error(400, "Invalid pack contents.");
        const files = [];
        for (const id of new Set(members)) files.push(await snapshotFile(id));
        items.push({
          id: p.id,
          name: p.name,
          priceCents: p.priceCents,
          licenseVersion: p.licenseVersion ?? "personal-v1",
          licenseText: terms.license,
          version: p.version ?? "1",
          files,
        });
      }
      const total = items.reduce((sum, p) => sum + p.priceCents, 0);
      if (!Number.isSafeInteger(total) || total > 99999999)
        throw error(400, "Invalid order total.");
      transaction(() => {
        const existing = db
          .prepare("SELECT * FROM orders WHERE request_key=?")
          .get(input.requestKey);
        if (existing) {
          if (existing.fingerprint !== fingerprint)
            throw error(409, "Checkout attempt conflict.");
          order = existing;
          return;
        }
        const id = randomUUID(),
          stamp = now();
        db.prepare(
          "INSERT INTO orders(id,request_key,fingerprint,email,name,currency,total,items,consent,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        ).run(
          id,
          input.requestKey,
          fingerprint,
          input.email.trim().toLowerCase(),
          input.name.trim(),
          "eur",
          total,
          JSON.stringify(items),
          JSON.stringify({
            termsVersion: terms.version,
            language: terms.language,
            termsText: terms.sections
              .map((s) => s.title + "\n" + s.text)
              .join("\n\n"),
            termsConsentText: terms.termsConsent,
            digitalConsentText: terms.digitalConsent,
            licenseText: terms.license,
            legalStatus: terms.status,
            accepted: true,
            immediateDelivery: true,
            withdrawalAcknowledged: true,
            at: new Date(stamp).toISOString(),
          }),
          stamp,
          stamp,
        );
        order = orderById(id);
      });
    }
    if (order.status !== "pending")
      throw error(409, "This order is already closed.");
    if (now() - order.created_at > 23 * 60 * 60 * 1000)
      throw error(
        409,
        "This checkout attempt has expired. Reload to start another order.",
      );
    if (!order.session_id) {
      const params = new URLSearchParams({
        mode: "payment",
        customer_email: order.email,
        success_url: `${origin}/checkout?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout?cancelled=1${input.direct === true && products.length === 1 ? "&buy=" + encodeURIComponent(products[0].id) : ""}`,
        locale: "en",
        client_reference_id: order.id,
        // Hosted Checkout presents eligible card wallets (including Apple Pay).
        // Apple Pay is not a separate payment_method_types value.
        "payment_method_types[0]": "card",
        "payment_method_types[1]": "bancontact",
        "metadata[store]": "moya",
        "metadata[order_id]": order.id,
      });
      JSON.parse(order.items).forEach((p, i) => {
        params.set(`line_items[${i}][price_data][currency]`, "eur");
        params.set(
          `line_items[${i}][price_data][unit_amount]`,
          String(p.priceCents),
        );
        params.set(
          `line_items[${i}][price_data][product_data][name]`,
          p.name + " (STL)",
        );
        params.set(`line_items[${i}][quantity]`, "1");
      });
      const session = await stripe(
        "checkout/sessions",
        params,
        "moya-" + order.id,
      );
      const link = new URL(session.url);
      if (
        !sessionPattern.test(session.id ?? "") ||
        session.livemode !== live ||
        link.protocol !== "https:" ||
        link.hostname !== "checkout.stripe.com"
      )
        throw error(502, "Invalid test payment session.");
      db.prepare(
        "UPDATE orders SET session_id=?,checkout_url=?,updated_at=? WHERE id=?",
      ).run(session.id, session.url, now(), order.id);
      order = orderById(order.id);
    }
    const access = transaction(() => token(order.id));
    return json(res, 200, {
      url: order.checkout_url,
      sessionId: order.session_id,
      orderId: order.id,
      accessToken: access,
    });
  }
  function orderView(order) {
    const items = JSON.parse(order.items);
    return {
      id: order.id,
      status: order.status,
      total: order.total / 100,
      currency: order.currency,
      items:
        order.status === "paid"
          ? items.flatMap((p) =>
              p.files.map((f) => {
                const value = token(
                  order.id,
                  `download:${f.sha256}`,
                  5 * 60 * 1000,
                );
                return {
                  id: p.id,
                  name: p.name,
                  download: `/api/download/${f.sha256}?token=${value}&order=${order.id}`,
                };
              }),
            )
          : [],
    };
  }
  async function handle(req, res, path, url) {
    if (path === "/api/stripe/webhook" && req.method === "POST") {
      await webhook(req, res);
      return true;
    }
    if (path === "/api/config" && req.method === "GET") {
      let ready = false;
      if (configured) {
        for (const p of allProducts().filter(
          (p) => p.status === "published" && p.type !== "bundle",
        )) {
          try {
            await sourceFile(p.id);
            ready = true;
            break;
          } catch {
            // Each selected file is checked again at checkout. A missing
            // unrelated prototype must not disable an available product.
          }
        }
      }
      json(res, 200, { checkout: ready });
      return true;
    }
    if (path === "/api/catalog" && req.method === "GET") {
      json(res, 200, {
        products: allProducts()
          .filter((p) => p.status === "published")
          .map((p) =>
            Object.fromEntries(
              [
                "id",
                "name",
                "category",
                "description",
                "details",
                "image",
                "fileSize",
                "printTime",
                "featured",
                "type",
                "version",
                "licenseVersion",
                "compareAtPriceCents",
              ]
                .filter((k) => p[k] !== undefined)
                .map((k) => [k, p[k]])
                .concat([["price", p.priceCents / 100]]),
            ),
          ),
      });
      return true;
    }
    if (path === "/api/checkout" && req.method === "POST") {
      await checkout(req, res);
      return true;
    }
    if (path.startsWith("/api/orders/") && req.method === "GET") {
      const reference = decodeURIComponent(path.slice(12));
      if (!(sessionPattern.test(reference) || /^[a-f0-9-]{36}$/.test(reference)))
        throw error(400, "Invalid order reference.");
      let order = orderBySession(reference) ?? orderById(reference);
      authorize(order, req.headers.authorization?.replace(/^Bearer /, ""));
      // GET never creates an order or derives purchases from the live catalogue. A pending order is
      // re-read from Stripe, so a buyer who paid sees it even when the webhook is late or missing.
      if (order.status === "pending" && order.session_id) {
        await syncPending(order);
        order = orderById(order.id);
      }
      json(
        res,
        200,
        transaction(() => orderView(order)),
      );
      return true;
    }
    if (path.startsWith("/api/download/") && req.method === "GET") {
      const order = authorize(
        orderById(url.searchParams.get("order")),
        url.searchParams.get("token"),
        `download:${path.slice(14)}`,
      );
      if (order.status !== "paid")
        throw error(403, "This download requires an active paid order.");
      const hash = path.slice(14),
        files = JSON.parse(order.items).flatMap((p) => p.files),
        asset = files.find((f) => f.sha256 === hash);
      if (!asset || !/^[a-f0-9]{64}$/.test(hash))
        throw error(403, "This file is not part of your order.");
      const base = await realpath(versionsDir),
        file = await realpath(resolve(base, asset.fileKey));
      if (
        !file.startsWith(base + sep) ||
        (await stat(file)).size !== asset.bytes
      )
        throw error(404, "The purchased file is unavailable. Contact support.");
      res.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="tokki-pocket-${asset.id}.stl"`,
        "Cache-Control": "private, no-store",
      });
      const stream = createReadStream(file);
      stream.on("error", () => res.destroy());
      stream.pipe(res);
      return true;
    }
    if (path === "/api/recover" && req.method === "POST") {
      const input = await body(req);
      if (!validEmail(input.email))
        throw error(400, "Enter a valid email address.");
      transaction(() => {
        for (const order of db
          .prepare(
            "SELECT * FROM orders WHERE email=? AND status='paid' ORDER BY created_at DESC LIMIT 20",
          )
          .all(input.email.trim().toLowerCase())) {
          const recent = db
            .prepare(
              "SELECT 1 FROM outbox WHERE order_id=? AND next_at>? AND id LIKE 'recovery-%'",
            )
            .get(order.id, now() - 15 * 60 * 1000);
          if (!recent)
            enqueue(
              order,
              "recovery",
              `recovery-${order.id}-${Math.floor(now() / (15 * 60 * 1000))}`,
            );
        }
      });
      json(res, 202, {
        message:
          "If an eligible purchase exists, download access will be sent to that email address.",
      });
      return true;
    }
    return false;
  }
  return {
    handle,
    store,
    stripe,
    async reconcile(limit = 50) {
      const pending = db
        .prepare(
          "SELECT * FROM orders WHERE session_id IS NOT NULL AND status IN ('pending','paid') ORDER BY updated_at LIMIT ?",
        )
        .all(limit);
      let completed = 0;
      for (const order of pending) {
        const session = await stripe(
          "checkout/sessions/" + encodeURIComponent(order.session_id),
        );
        const state = await sessionState(session, "reconcile");
        transaction(() => commitState(state));
        completed++;
      }
      return { checked: completed };
    },
  };
}
