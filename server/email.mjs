const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const money = (cents) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );

// Build a readable durable copy from the terms captured at purchase, not today's terms.
export function renderOrderEmail(order, link, reason = "purchase") {
  const items = JSON.parse(order.items);
  const consent = JSON.parse(order.consent);
  const title =
    reason === "purchase" ? "Your files are ready." : "Your download access.";
  const sections = [
    [
      "Your purchase",
      items.map((p) => `${p.name}: ${money(p.priceCents)}`).join("\n"),
    ],
    ["Total paid", money(order.total)],
    [
      "Personal-use licence",
      items
        .map(
          (p) =>
            `${p.name}: ${p.licenseText || consent.licenseText || p.licenseVersion}`,
        )
        .join("\n"),
    ],
    [
      "Terms accepted at purchase",
      consent.termsText || "See the terms supplied with your order.",
    ],
    [
      "Your agreement",
      [consent.termsConsentText, consent.digitalConsentText]
        .filter(Boolean)
        .join("\n\n"),
    ],
    [
      "Agreement record",
      [
        `Terms version: ${consent.termsVersion || "Not specified"}`,
        consent.at ? `Accepted: ${consent.at}` : "",
        consent.legalStatus ? `Document status: ${consent.legalStatus}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    ],
  ];
  const intro =
    "Digital STL files for you to print. No physical item will be shipped.";
  const help =
    "This private link expires in 24 hours. If it expires, request another link from the order page. Keep it private.";
  const subject =
    reason === "purchase"
      ? "Your Tokki Pocket digital files"
      : "Your Tokki Pocket download access";
  const text = [
    "TOKKI POCKET",
    title,
    intro,
    `Order: ${order.id}`,
    ...sections.slice(0, 2).map(([heading, copy]) => `${heading}\n${copy}`),
    "Open your downloads",
    link,
    help,
    ...sections.slice(2).map(([heading, copy]) => `${heading}\n${copy}`),
  ].join("\n\n");
  const sectionHtml = ([heading, copy]) =>
    `<section style="margin-top:24px"><h2 style="font-size:16px;margin:0 0 8px">${escapeHtml(heading)}</h2><p style="margin:0;line-height:1.6;white-space:pre-line">${escapeHtml(copy)}</p></section>`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#f5f5f2;color:#171717;font-family:Arial,Helvetica,sans-serif"><main style="max-width:600px;margin:0 auto;padding:32px 24px"><p style="font-size:12px;letter-spacing:2px">TOKKI POCKET</p><h1 style="font-size:32px;line-height:1.15">${escapeHtml(title)}</h1><p style="line-height:1.6">${escapeHtml(intro)}</p><p style="font-size:12px;overflow-wrap:anywhere">Order: ${escapeHtml(order.id)}</p>${sections.slice(0, 2).map(sectionHtml).join("")}<p style="margin:32px 0"><a href="${escapeHtml(link)}" style="display:inline-block;background:#171717;color:#fff;padding:16px 24px;text-decoration:none">Open your downloads</a></p><p style="font-size:13px;line-height:1.6">${escapeHtml(help)}</p><hr style="border:0;border-top:1px solid #d4d4ce;margin:32px 0">${sections.slice(2).map(sectionHtml).join("")}</main></body></html>`;
  return { to: order.email, subject, text, html };
}
