import { spawn } from "node:child_process";
try {
  process.loadEnvFile(".env");
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const args = process.argv.slice(2);
const value = (key, fallback) => {
  const i = args.indexOf(key);
  return i >= 0 ? args[i + 1] : fallback;
};
const port = value("--port", "5173");
const host = value("--host", "localhost");
const children = [
  spawn(process.execPath, ["server/index.mjs"], {
    stdio: "inherit",
    env: {
      ...process.env,
      APP_ORIGIN: process.env.APP_ORIGIN ?? `http://${host}:${port}`,
    },
  }),
  spawn(
    process.execPath,
    ["node_modules/vite/bin/vite.js", "--strictPort", ...args],
    { stdio: "inherit" },
  ),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach((child) => child.kill("SIGTERM"));
  process.exitCode = code;
}
children.forEach((child) => {
  child.on("error", () => stop(1));
  child.on("exit", (code) => stop(code ?? 0));
});
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
