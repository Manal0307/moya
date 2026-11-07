#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { openStore } from '../server/store.mjs';
import { setAdminAccount } from '../server/admin-http.mjs';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
function secret(prompt) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('An interactive terminal is required. Passwords cannot be supplied through arguments or environment variables.');
  process.stdout.write(prompt);
  return new Promise((resolveSecret, reject) => {
    let value = '';
    const cleanup = () => { process.stdin.off('data', receive); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n'); };
    const receive = chunk => {
      for (const character of chunk.toString()) {
        if (character === '\u0003' || character === '\u0004') { cleanup(); reject(new Error('Cancelled.')); return; }
        if (character === '\r' || character === '\n') { cleanup(); resolveSecret(value); return; }
        if (character === '\u007f' || character === '\b') value = value.slice(0, -1);
        else if (character >= ' ' && value.length < 257) value += character;
      }
    };
    process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.on('data', receive);
  });
}
let store;
try {
  if (process.argv.length > 2) throw new Error('No arguments accepted. Run this command from an interactive terminal.');
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('An interactive terminal is required.');
  const reader = createInterface({ input: process.stdin, output: process.stdout });
  const username = (await reader.question('Owner username [owner]: ')).trim() || 'owner';
  reader.close();
  const password = await secret('Password (14 characters minimum, hidden): ');
  const confirmation = await secret('Confirm password (hidden): ');
  if (password !== confirmation) throw new Error('Passwords do not match.');
  const seed = JSON.parse(await readFile(resolve(root, 'src/app/data/catalog.json'), 'utf8'));
  store = openStore(resolve(process.env.DATA_DIR ?? resolve(root, 'data')), seed);
  await setAdminAccount(store, username, password);
  console.log('Owner account saved. Previous sessions for this account have been revoked.');
} catch (error) {
  console.error(error.status === 400 || /^(Passwords|No arguments|An interactive|Cancelled)/.test(error.message) ? error.message : 'Account update failed. Check local storage configuration and permissions.');
  process.exitCode = 1;
} finally { store?.close(); }
