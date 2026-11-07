import { scrypt, randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { mkdir, realpath, open, readFile, stat } from "node:fs/promises";
import { resolve, sep, dirname } from "node:path";
import { constants } from "node:fs";
import { createCatalogueAdmin, createOrderAdmin } from "./admin.mjs";
import { createInquiries } from "./inquiries.mjs";
const derive = promisify(scrypt);
const error = (status, message) =>
  Object.assign(new Error(message), { status });
const digest = (value) => createHash("sha256").update(value).digest("hex");
const same = (a, b) =>
  typeof a === "string" &&
  typeof b === "string" &&
  Buffer.byteLength(a) === Buffer.byteLength(b) &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));
export async function hashPassword(password) {
  if (
    typeof password !== "string" ||
    password.length < 14 ||
    password.length > 256
  )
    throw error(400, "Use a password containing 14 to 256 characters.");
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${(await derive(password, salt, 64)).toString("hex")}`;
}
async function verifyPassword(password, encoded) {
  const [, salt, hash] = (encoded ?? "").split(":");
  const candidate = await derive(
    password,
    /^[a-f0-9]{32}$/.test(salt ?? "")
      ? salt
      : "00000000000000000000000000000000",
    64,
  );
  return (
    /^[a-f0-9]{128}$/.test(hash ?? "") && same(candidate.toString("hex"), hash)
  );
}
export async function setAdminAccount(store, username, password) {
  if (
    typeof username !== "string" ||
    !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{2,63}$/.test(username)
  )
    throw error(
      400,
      "Username must contain 3 to 64 letters, digits, dots, underscores or hyphens.",
    );
  const hash = await hashPassword(password);
  store.transaction(() => {
    store.db
      .prepare(
        "INSERT INTO admin_accounts VALUES(?,?,?) ON CONFLICT(username) DO UPDATE SET password_hash=excluded.password_hash",
      )
      .run(username, hash, Date.now());
    store.db
      .prepare("DELETE FROM admin_sessions WHERE username=?")
      .run(username);
    store.db
      .prepare("INSERT INTO audit(action,created_at) VALUES(?,?)")
      .run("admin.account.updated", Date.now());
  });
}
export function validateStl(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0)
    throw error(400, "Empty STL file.");
  // Binary STL: 80-byte header, triangle count and exactly 50 bytes per triangle.
  if (buffer.length >= 84) {
    const count = buffer.readUInt32LE(80);
    if (count > 0 && 84 + count * 50 === buffer.length) {
      for (let offset = 84; offset < buffer.length; offset += 50)
        for (let value = 0; value < 12; value++)
          if (!Number.isFinite(buffer.readFloatLE(offset + value * 4)))
            throw error(400, "Invalid STL coordinates.");
      return;
    }
  }
  // ASCII syntax only; this does not certify printable geometry or ownership.
  const text = buffer.toString("utf8");
  if (
    !/^[\x09\x0a\x0d\x20-\x7e]+$/.test(text) ||
    !/^\s*solid(?:\s|$)/i.test(text) ||
    !/endsolid[^\r\n]*\s*$/i.test(text)
  )
    throw error(400, "Invalid STL format.");
  const number = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?";
  const vector = `${number}\\s+${number}\\s+${number}`;
  const facet = new RegExp(
    `facet\\s+normal\\s+${vector}\\s+outer\\s+loop\\s+(?:vertex\\s+${vector}\\s+){3}endloop\\s+endfacet`,
    "gi",
  );
  const core = text
    .replace(/^\s*solid[^\r\n]*(?:\r?\n)/i, "")
    .replace(/endsolid[^\r\n]*\s*$/i, "");
  const matches = core.match(facet);
  if (
    !matches?.length ||
    core.replace(facet, "").trim() ||
    (text.match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/g) ?? []).some(
      (v) => !Number.isFinite(Number(v)),
    )
  )
    throw error(400, "Invalid ASCII STL structure.");
}
async function saveUpload(req, privateDir) {
  if (!req.headers["content-type"]?.startsWith("application/octet-stream"))
    throw error(415, "Send an STL as application/octet-stream.");
  const max = 50 * 1024 * 1024;
  if (Number(req.headers["content-length"]) > max)
    throw error(413, "STL exceeds 50 MB.");
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) throw error(413, "STL exceeds 50 MB.");
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  validateStl(buffer);
  await mkdir(privateDir, { recursive: true, mode: 0o700 });
  const base = await realpath(privateDir);
  const directory = resolve(base, "uploads");
  await mkdir(directory, { mode: 0o700 }).catch((e) => {
    if (e.code !== "EEXIST") throw e;
  });
  const actualDirectory = await realpath(directory);
  if (actualDirectory !== directory || !actualDirectory.startsWith(base + sep))
    throw error(400, "Unsafe upload directory.");
  const name = `${digest(buffer)}.stl`;
  const target = resolve(directory, name);
  let handle;
  try {
    handle = await open(
      target,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW,
      0o600,
    );
    await handle.writeFile(buffer);
    await handle.sync();
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
    const actual = await realpath(target);
    if (
      actual !== target ||
      !(await stat(actual)).isFile() ||
      digest(await readFile(actual)) !== digest(buffer)
    )
      throw error(400, "Unsafe existing file.");
  } finally {
    await handle?.close();
  }
  return { file: `uploads/${name}`, fileSize: `${size} bytes` };
}
export function createAdminHttp({ store, env, body, json, privateDir }) {
  const inquiries = createInquiries(dirname(store.path));
  const catalogue = createCatalogueAdmin({ store, privateDir });
  const orders = createOrderAdmin({ store });
  const origin = env.APP_ORIGIN ?? "http://localhost:5173";
  const secure = new URL(origin).protocol === "https:";
  const attempts = new Map();
  const cookie = (token, clear = false) =>
    `small_things_lab_admin=${token}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : 28800}${secure ? "; Secure" : ""}`;
  function current(req) {
    const token = (req.headers.cookie ?? "")
      .split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith("small_things_lab_admin="))
      ?.slice("small_things_lab_admin=".length);
    if (!/^[a-f0-9]{64}$/.test(token ?? "")) return null;
    return (
      store.db
        .prepare(
          "SELECT hash,username,csrf,expires_at FROM admin_sessions WHERE hash=? AND expires_at>?",
        )
        .get(digest(token), Date.now()) ?? null
    );
  }
  return {
    async handle(req, res, path, url) {
      if (path !== "/api/admin" && !path.startsWith("/api/admin/"))
        return false;
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      const mutation = !["GET", "HEAD"].includes(req.method);
      if (mutation && req.headers.origin !== origin)
        throw error(403, "Request origin is not allowed.");
      if (path === "/api/admin/login" && req.method === "POST") {
        const now = Date.now();
        for (const [key, value] of attempts)
          if (value.until <= now) attempts.delete(key);
        const address = req.socket.remoteAddress;
        const bucket = attempts.get(address) ?? {
          count: 0,
          until: now + 15 * 60 * 1000,
        };
        attempts.set(address, bucket);
        if (++bucket.count > 10)
          throw error(429, "Too many login attempts. Try again later.");
        if (!req.headers["content-type"]?.startsWith("application/json"))
          throw error(415, "Expected JSON.");
        const input = await body(req);
        const username =
          typeof input?.username === "string" && input.username.length <= 64
            ? input.username
            : "";
        const password =
          typeof input?.password === "string" && input.password.length <= 256
            ? input.password
            : "";
        const account = store.db
          .prepare("SELECT password_hash FROM admin_accounts WHERE username=?")
          .get(username);
        const verified = await verifyPassword(password, account?.password_hash);
        if (!account || !verified) throw error(401, "Invalid credentials.");
        const token = randomBytes(32).toString("hex"),
          csrf = randomBytes(32).toString("hex");
        store.transaction(() => {
          if (
            store.db
              .prepare(
                "SELECT password_hash FROM admin_accounts WHERE username=?",
              )
              .get(username)?.password_hash !== account.password_hash
          )
            throw error(401, "Invalid credentials.");
          store.db
            .prepare("DELETE FROM admin_sessions WHERE expires_at<=? OR hash=?")
            .run(now, current(req)?.hash ?? "");
          store.db
            .prepare("INSERT INTO admin_sessions VALUES(?,?,?,?)")
            .run(digest(token), username, csrf, now + 8 * 60 * 60 * 1000);
        });
        res.setHeader("Set-Cookie", cookie(token));
        json(res, 200, { username, csrf });
        return true;
      }
      const session = current(req);
      if (!session) throw error(401, "Administrator login required.");
      if (mutation && !same(req.headers["x-csrf-token"], session.csrf))
        throw error(403, "Invalid CSRF token.");
      if (path === "/api/admin/session" && req.method === "GET") {
        json(res, 200, { username: session.username, csrf: session.csrf });
        return true;
      }
      if (path === "/api/admin/logout" && req.method === "POST") {
        store.db
          .prepare("DELETE FROM admin_sessions WHERE hash=?")
          .run(session.hash);
        res.setHeader("Set-Cookie", cookie("", true));
        json(res, 200, { ok: true });
        return true;
      }
      if (path === "/api/admin/products" && req.method === "GET") {
        json(res, 200, { products: catalogue.list() });
        return true;
      }
      if (path === "/api/admin/products" && req.method === "POST") {
        if (!req.headers["content-type"]?.startsWith("application/json"))
          throw error(415, "Expected JSON.");
        json(res, 200, { product: await catalogue.put(await body(req)) });
        return true;
      }
      if (
        /^\/api\/admin\/files\/[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(path) &&
        req.method === "POST"
      ) {
        const result = await saveUpload(req, privateDir);
        store.db
          .prepare("INSERT INTO audit(action,created_at) VALUES(?,?)")
          .run("admin.file.uploaded", Date.now());
        json(res, 201, result);
        return true;
      }
      if (path === "/api/admin/orders" && req.method === "GET") {
        json(res, 200, {
          orders: orders.listOrders(url.searchParams.get("q") ?? ""),
        });
        return true;
      }
      if (path.startsWith("/api/admin/orders/") && req.method === "GET") {
        json(res, 200, {
          order: orders.getOrder(path.slice("/api/admin/orders/".length)),
        });
        return true;
      }
      if (path === "/api/admin/messages" && req.method === "GET") {
        json(
          res,
          200,
          await inquiries.list(url.searchParams.get("page") ?? "1"),
        );
        return true;
      }
      if (path.startsWith("/api/admin/messages/") && req.method === "GET") {
        json(res, 200, {
          message: await inquiries.get(
            path.slice("/api/admin/messages/".length),
          ),
        });
        return true;
      }
      if (path === "/api/admin/stats" && req.method === "GET") {
        json(res, 200, orders.stats());
        return true;
      }
      throw error(404, "Admin route not found.");
    },
  };
}
