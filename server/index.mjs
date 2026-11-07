import { createApp } from "./app.mjs";
try {
  process.loadEnvFile(".env");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const port = Number(process.env.PORT ?? 3001);
const app = createApp({ dataDir: process.env.DATA_DIR });
const { drainOutbox } = await import("./outbox.mjs");
let sending = false;
const worker = setInterval(async () => {
  if (sending || process.env.EMAIL_SEND_ENABLED !== "true") return;
  sending = true;
  try {
    await drainOutbox({ store: app.commerce.store });
  } catch {
    console.error("Email worker failed; queued messages remain retryable.");
  } finally {
    sending = false;
  }
}, 30000);
worker.unref();
app.on("close", () => clearInterval(worker));
app.listen(port, process.env.HOST ?? "127.0.0.1", () =>
  console.log(`Tokki Pocket server: http://localhost:${port}`),
);
