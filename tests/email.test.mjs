import { test } from "node:test";
import assert from "node:assert/strict";
import { renderOrderEmail } from "../server/email.mjs";

test("email is branded and readable in HTML and plain text with purchase-time terms", () => {
  const order = {
    id: "test-order",
    email: "buyer@example.com",
    total: 490,
    items: JSON.stringify([
      {
        name: "<script>Cat & Star</script>",
        priceCents: 490,
        licenseText: "Personal use only.",
      },
    ]),
    consent: JSON.stringify({
      termsVersion: "draft-v1",
      termsText: "Saved terms\nSecond paragraph.",
      termsConsentText: "I accept.",
      digitalConsentText: "Deliver immediately.",
      licenseText: "Personal use only.",
      at: "2026-10-23T10:00:00Z",
    }),
  };
  const mail = renderOrderEmail(
    order,
    "http://localhost:5174/checkout?order=test&access=abc",
  );
  assert.equal(mail.subject, "Your Tokki Pocket digital files");
  assert.ok(mail.text.includes("Saved terms\nSecond paragraph."));
  assert.ok(mail.text.includes("€4.90"));
  assert.ok(!mail.text.includes('"termsVersion"'));
  assert.ok(!mail.text.includes("Moya"));
  assert.ok(mail.html.includes("&lt;script&gt;Cat &amp; Star&lt;/script&gt;"));
  assert.ok(!mail.html.includes("<script>"));
  assert.ok(mail.html.includes("order=test&amp;access=abc"));
  assert.ok(mail.html.includes("Open your downloads"));
  assert.ok(
    renderOrderEmail(
      order,
      "http://localhost:5174",
      "recovery",
    ).subject.includes("download access"),
  );
});
