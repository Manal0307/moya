// Test-only local webhook forwarding. Never print CLI output containing secrets.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const envPath = fileURLToPath(new URL('../.env', import.meta.url));
process.loadEnvFile(envPath);
if (!/^sk_test_/.test(process.env.STRIPE_SECRET_KEY ?? '')) {
  throw new Error('Configure a Stripe test key in .env first.');
}
const child = spawn('stripe', ['listen', '--forward-to', 'http://localhost:3001/api/stripe/webhook', '--events', 'checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired,charge.refunded,charge.dispute.created,charge.dispute.closed,refund.created,refund.updated'], {
  env: { ...process.env, STRIPE_API_KEY: process.env.STRIPE_SECRET_KEY, STRIPE_DEVICE_NAME: 'Tokki Pocket local test' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let ready = false;
for (const output of [child.stdout, child.stderr]) {
  let pending = '';
  output.setEncoding('utf8');
  output.on('data', chunk => {
    pending += chunk;
    const lines = pending.split(/[\r\n]/);
    pending = lines.pop();
    for (const line of lines) {
      const signingSecret = line.match(/whsec_[a-zA-Z0-9]+/)?.[0];
      if (signingSecret && !ready) {
        const current = readFileSync(envPath, 'utf8');
        const updated = /^STRIPE_WEBHOOK_SECRET=.*$/m.test(current)
          ? current.replace(/^STRIPE_WEBHOOK_SECRET=.*$/m, `STRIPE_WEBHOOK_SECRET=${signingSecret}`)
          : current + `\nSTRIPE_WEBHOOK_SECRET=${signingSecret}\n`;
        writeFileSync(envPath, updated, { mode: 0o600 });
        chmodSync(envPath, 0o600);
        ready = true;
        console.log('Stripe test webhook connected. Signing secret saved privately in .env. Restart the API to load it.');
      } else if (/\b(401|403)\b|invalid_api_key|authentication_error/i.test(line)) {
        console.error('Stripe rejected access. Check the test key and sandbox permissions.');
      } else {
        const status = line.match(/<--\s+\[(\d{3})\]/)?.[1];
        if (status) console.log(`Webhook local HTTP ${status}`);
      }
    }
  });
}
child.on('error', () => { console.error('Unable to start Stripe CLI.'); process.exitCode = 1; });
child.on('exit', code => { if (!ready) console.error('Webhook connection not established.'); process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
