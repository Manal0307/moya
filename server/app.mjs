import { createServer } from "node:http";
import { readFile, mkdir, writeFile, stat } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { randomUUID } from "node:crypto";
import { openStore } from "./store.mjs";
import { createCommerce } from "./commerce.mjs";
import { createAdminHttp } from "./admin-http.mjs";
import { fileURLToPath } from "node:url";
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const catalog = JSON.parse(
  await readFile(resolve(root, "src/app/data/catalog.json"), "utf8"),
);
const fail = (status, message) => Object.assign(new Error(message), { status });
export function validateCart(ids) {
  if (
    !Array.isArray(ids) ||
    !ids.length ||
    ids.length > catalog.length ||
    new Set(ids).size !== ids.length
  )
    throw fail(400, "Your cart is invalid. Please return to the catalogue.");
  return ids.map((id) => {
    const product = catalog.find((p) => p.id === id);
    if (!product) throw fail(400, "A model could not be found.");
    return product;
  });
}
export function createApp({
  env = process.env,
  fetcher = fetch,
  dataDir = resolve(root, "data"),
} = {}) {
  const origin = env.APP_ORIGIN ?? "http://localhost:5173";
  const store = openStore(dataDir, catalog);
  const limits = new Map();
  const json = (res, status, data) => {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(data));
  };
  async function body(req, raw = false) {
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > (raw ? 1048576 : 16384))
        throw fail(413, "Your message is too large.");
      chunks.push(chunk);
    }
    if (raw) return Buffer.concat(chunks);
    try {
      const value = JSON.parse(Buffer.concat(chunks).toString());
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error();
      return value;
    } catch {
      throw fail(400, "Invalid request data.");
    }
  }
  const commerce = createCommerce({
    store,
    env,
    fetcher,
    dataDir,
    catalog,
    json,
    body,
  });
  const admin = createAdminHttp({
    store,
    env,
    body,
    json,
    privateDir: resolve(env.FILES_DIR ?? "private-files"),
  });
  const server = createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    try {
      const url = new URL(req.url, "http://localhost");
      const path = url.pathname;
      if (path.startsWith("/api/")) {
        if (path !== "/api/stripe/webhook") {
          if (req.headers.origin && req.headers.origin !== origin)
            throw fail(403, "Request origin is not allowed.");
          if (
            req.method === "POST" &&
            !/^\/api\/admin\/files\/[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(path) &&
            !req.headers["content-type"]?.startsWith("application/json")
          )
            throw fail(415, "Invalid request format.");
          const now = Date.now();
          for (const [key, val] of limits)
            if (val.until < now) limits.delete(key);
          // Behind a hosting proxy (TRUST_PROXY=true, e.g. Render) every request
          // arrives from the proxy, so the limit must use the client address the
          // proxy appends last to X-Forwarded-For. Without the flag the header
          // is ignored, since anyone could forge it.
          const forwarded =
            env.TRUST_PROXY === "true"
              ? String(req.headers["x-forwarded-for"] ?? "")
                  .split(",")
                  .map((part) => part.trim())
                  .filter(Boolean)
                  .pop()
              : undefined;
          const key = forwarded || req.socket.remoteAddress;
          const entry = limits.get(key) ?? { count: 0, until: now + 60000 };
          entry.count++;
          limits.set(key, entry);
          if (entry.count > 120)
            throw fail(429, "Too many requests. Please try again in a minute.");
        }
        if (await admin.handle(req, res, path, url)) return;
        if (await commerce.handle(req, res, path, url)) return;
        if (path === "/api/contact" && req.method === "POST") {
          const input = await body(req);
          if (input.website) throw fail(400, "Unable to submit this message.");
          if (
            typeof input.name !== "string" ||
            !input.name.trim() ||
            input.name.length > 120 ||
            typeof input.email !== "string" ||
            input.email.length > 254 ||
            !/^\S+@\S+\.\S+$/.test(input.email) ||
            typeof input.message !== "string" ||
            input.message.trim().length < 15 ||
            input.message.length > 5000 ||
            typeof input.subject !== "string" ||
            input.subject.length > 100
          )
            throw fail(
              400,
              "Check your details and describe your enquiry in at least 15 characters.",
            );
          const reference = `STL-${randomUUID()}`;
          await mkdir(resolve(dataDir, "inquiries"), {
            recursive: true,
            mode: 0o700,
          });
          await writeFile(
            resolve(dataDir, "inquiries", `${reference}.json`),
            JSON.stringify(
              {
                reference,
                createdAt: new Date().toISOString(),
                name: input.name.trim(),
                email: input.email.trim(),
                subject: input.subject,
                message: input.message.trim(),
              },
              null,
              2,
            ),
            { flag: "wx", mode: 0o600 },
          );
          return json(res, 201, { reference });
        }
        throw fail(404, "Service not found.");
      }
      if (["/checkout", "/cart", "/admin"].includes(path))
        res.setHeader("X-Robots-Tag", "noindex, nofollow");
      if (!["GET", "HEAD"].includes(req.method))
        throw fail(405, "Method not allowed.");
      const dist = resolve(root, "dist");
      const requested = resolve(dist, "." + decodeURIComponent(path));
      if (requested !== dist && !requested.startsWith(dist + sep))
        throw fail(403, "Access denied.");
      let file = requested;
      try {
        if (!(await stat(file)).isFile()) file = resolve(dist, "index.html");
      } catch {
        if (extname(path)) throw fail(404, "File not found.");
        file = resolve(dist, "index.html");
      }
      const content = await readFile(file);
      const types = {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript",
        ".css": "text/css",
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".woff2": "font/woff2",
      };
      res.writeHead(200, {
        "Content-Type": types[extname(file)] ?? "application/octet-stream",
        "Cache-Control": file.includes("/assets/")
          ? "public, max-age=31536000, immutable"
          : "no-cache",
      });
      res.end(req.method === "HEAD" ? undefined : content);
    } catch (error) {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      if (!error.status)
        console.error("Server request failed:", error.code ?? error.name);
      json(res, error.status ?? 500, {
        error: error.status
          ? error.message
          : "The service is temporarily unavailable. Please try again later.",
      });
    }
  });
  server.on("close", () => store.close());
  server.commerce = commerce;
  return server;
}
