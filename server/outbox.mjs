import { randomBytes, createHash } from "node:crypto";
// Explicitly disabled by default. Never reports a delivered email without provider acceptance.
export async function drainOutbox({
  store,
  env = process.env,
  fetcher = fetch,
  limit = 20,
}) {
  if (
    env.EMAIL_SEND_ENABLED !== "true" ||
    !env.RESEND_API_KEY ||
    !env.EMAIL_FROM
  )
    return { enabled: false, sent: 0, failed: 0 };
  const { db, transaction } = store;
  let sent = 0,
    failed = 0;
  for (let i = 0; i < Math.min(limit, 100); i++) {
    const row = transaction(() => {
      const job = db
        .prepare(
          "SELECT o.* FROM outbox o JOIN orders r ON r.id=o.order_id WHERE r.status='paid' AND ((o.status='pending' AND o.next_at<=?) OR (o.status='sending' AND o.lease_until<?)) ORDER BY o.next_at LIMIT 1",
        )
        .get(Date.now(), Date.now());
      if (!job) return;
      db.prepare(
        "UPDATE outbox SET status='sending',attempts=attempts+1,lease_until=? WHERE id=?",
      ).run(Date.now() + 60000, job.id);
      return job;
    });
    if (!row) break;
    try {
      const payload = JSON.parse(row.payload);
      if (row.attempts === 0) {
        // Start the 24-hour email access lifetime when the worker first dispatches, even after a configuration delay.
        const access = randomBytes(32).toString("base64url");
        transaction(() => {
          db.prepare("INSERT INTO tokens VALUES(?,?,?,?)").run(
            createHash("sha256").update(access).digest("hex"),
            row.order_id,
            Date.now() + 86400000,
            "order",
          );
          payload.text = payload.text.replace(
            /access=[A-Za-z0-9_-]{43}/,
            "access=" + access,
          );
          if (payload.html)
            payload.html = payload.html.replace(
              /access=[A-Za-z0-9_-]{43}/g,
              "access=" + access,
            );
          db.prepare("UPDATE outbox SET payload=? WHERE id=?").run(
            JSON.stringify(payload),
            row.id,
          );
        });
      }
      const response = await fetcher("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": row.id,
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: [payload.to],
          subject: payload.subject,
          text: payload.text,
          ...(payload.html ? { html: payload.html } : {}),
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw Error("provider_rejected_" + response.status);
      const result = await response.json();
      if (typeof result.id !== "string")
        throw Error("provider_missing_receipt");
      db.prepare(
        "UPDATE outbox SET status='sent',sent_at=?,lease_until=NULL,last_error=NULL,payload='{}' WHERE id=? AND status='sending'",
      ).run(Date.now(), row.id);
      sent++;
    } catch (e) {
      const attempts = row.attempts + 1;
      db.prepare(
        "UPDATE outbox SET status=?,next_at=?,lease_until=NULL,last_error=? WHERE id=? AND status='sending'",
      ).run(
        attempts >= 8 ? "failed" : "pending",
        Date.now() + Math.min(3600000, 30000 * 2 ** attempts),
        /^provider_/.test(e.message) ? e.message : "transport_error",
        row.id,
      );
      failed++;
    }
  }
  return { enabled: true, sent, failed };
}
