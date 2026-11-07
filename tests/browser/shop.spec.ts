import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const catalogue = JSON.parse(
  readFileSync(
    new URL("../../src/app/data/catalog.json", import.meta.url),
    "utf8",
  ),
);
// Keep browser scenarios independent of the user's real local test catalogue/settings.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/catalog", (route) =>
    route.fulfill({ json: { products: catalogue } }),
  );
  await page.route("**/api/config", (route) =>
    route.fulfill({ json: { checkout: false } }),
  );
});
// Explore is paused, so scenarios fill the cart from product pages.
async function addToCart(page: Page, id: string) {
  await page.goto(`/product/${id}`);
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Added to cart", exact: true }),
  ).toBeDisabled();
}
test("cart persistence, undo and unavailable checkout", async ({ page }) => {
  await addToCart(page, "1");
  await page.goto("/cart");
  await expect(page.locator(".cart-row")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".cart-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.locator(".cart-row")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".cart-row")).toHaveCount(1);
  await page.getByRole("link", { name: "Checkout" }).click();
  await expect(
    page.getByText("Purchases are temporarily unavailable.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Continue to payment/ }),
  ).toBeDisabled();
  await page.goto("/checkout?cancelled=1");
  await expect(
    page.getByText("Payment was interrupted.", { exact: false }),
  ).toBeVisible();
  await page.goto("/cart");
  await expect(page.locator(".cart-row")).toHaveCount(1);
});
test("handles corrupted storage and unknown products", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("moya-cart", "{broken"));
  await page.goto("/cart");
  await expect(
    page.getByRole("heading", {
      name: "Your cart is a blank canvas.",
    }),
  ).toBeVisible();
  await page.goto("/product/unknown");
  await expect(page.getByText("Error 404")).toBeVisible();
});
test("mobile navigation and all pages fit the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page
    .locator("#mobile-nav")
    .getByRole("link", { name: "Contact" })
    .click();
  await expect(page.locator("#mobile-nav")).toHaveCount(0);
  for (const path of [
    "/",
    "/product/1",
    "/cart",
    "/about",
    "/faq",
    "/custom",
    "/terms",
    "/missing",
  ]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/");
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
});
test("desktop presentation and images", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  // This fixture has no charm renders, so the home accordion is empty here;
  // portal.spec.ts covers the accordion with the five charms.
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  const broken: string[] = [];
  for (const product of catalogue) {
    await page.goto(`/product/${product.id}`);
    await page.waitForTimeout(300);
    broken.push(
      ...(await page
        .locator("main img")
        .evaluateAll((images: HTMLImageElement[]) =>
          images
            .filter((i) => i.complete && !i.naturalWidth)
            .map((i) => i.src),
        )),
    );
  }
  expect(broken).toEqual([]);
});
test("verified purchase removes only purchased products and exposes downloads", async ({
  page,
}) => {
  await addToCart(page, "1");
  await addToCart(page, "2");
  await page.route("**/api/orders/cs_test_browser", (route) =>
    route.fulfill({
      json: {
        status: "paid",
        id: "cs_test_browser",
        total: 2.99,
        currency: "eur",
        items: [
          {
            id: "1",
            name: "Dreamy Star Charm",
            download: "/api/download/1?session_id=cs_test_browser",
          },
        ],
      },
    }),
  );
  await page.goto("/checkout?session_id=cs_test_browser");
  await expect(
    page.getByRole("heading", { name: "Make it yours." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Dreamy Star Charm" }),
  ).toHaveAttribute("href", "/api/download/1?session_id=cs_test_browser");
  await page.goto("/cart");
  await expect(page.locator(".cart-row")).toHaveCount(1);
  await expect(page.locator(".cart-row")).toContainText("Pearl Cloud Keychain");
});
test("contact surfaces server errors and only confirms an accepted request", async ({
  page,
}) => {
  await page.goto("/custom");
  await page.getByLabel("Your name", { exact: true }).fill("Camille");
  await page
    .getByLabel("Your email", { exact: true })
    .fill("camille@example.com");
  await page
    .getByLabel("Your message", { exact: true })
    .fill("Un modèle de porte-clés de cinq centimètres.");
  await page.route("**/api/contact", (route) =>
    route.fulfill({ status: 503, json: { error: "Réessayez plus tard." } }),
  );
  await page.getByRole("button", { name: "Send enquiry" }).click();
  await expect(page.getByRole("alert")).toHaveText("Réessayez plus tard.");
  await page.route("**/api/contact", (route) =>
    route.fulfill({ status: 201, json: { reference: "MOYA-TEST" } }),
  );
  await page.getByRole("button", { name: "Send enquiry" }).click();
  await expect(
    page.getByRole("heading", { name: "Your enquiry has been saved." }),
  ).toBeVisible();
});

test("filtered shop links keep their filter", async ({ page }) => {
  await page.goto("/shop?category=keychain");
  await expect(page).toHaveURL(/\/shop\?category=keychain$/);
  await expect(page.getByRole("heading", { name: /The collection/ })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Contact" })
    .click();
  await expect(page).toHaveURL(/\/contact$/);
});

test("buy now submits only the chosen model and preserves the existing cart", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await addToCart(page, "2");
  await page.goto("/product/1");
  await expect(page).toHaveTitle(/Dreamy Star Charm/);
  await page.screenshot({
    path: "test-results/product-mobile.png",
    fullPage: true,
  });
  await page.route("**/api/config", (route) =>
    route.fulfill({ json: { checkout: true } }),
  );
  await page.getByRole("link", { name: /Buy now/ }).click();
  await expect(page).toHaveURL(/buy=1/);
  await expect(page.locator(".mini-product")).toHaveCount(1);
  await expect(page.locator(".mini-product")).toContainText(
    "Dreamy Star Charm",
  );
  await page.getByLabel("Full name", { exact: true }).fill("Test Buyer");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("buyer@example.com");
  for (const checkbox of await page.getByRole("checkbox").all())
    await checkbox.check();
  let submitted: { items: string[]; direct: boolean } | undefined;
  await page.route("**/api/checkout", (route) => {
    submitted = route.request().postDataJSON();
    return route.fulfill({
      status: 503,
      json: { error: "Test payment unavailable" },
    });
  });
  await page.getByRole("button", { name: /Continue to payment/ }).click();
  await expect(page.getByRole("alert")).toHaveText("Test payment unavailable");
  expect(submitted?.items).toEqual(["1"]);
  expect(submitted?.direct).toBe(true);
  await page.reload();
  await expect(page.locator(".mini-product")).toContainText(
    "Dreamy Star Charm",
  );
  await page.goto("/cart");
  await expect(page.locator(".cart-row")).toHaveCount(1);
  await expect(page.locator(".cart-row")).toContainText("Pearl Cloud Keychain");
  await page.goto("/checkout?buy=unknown");
  await expect(
    page.getByRole("heading", { name: "Model not found." }),
  ).toBeVisible();
});

test("pending payment refreshes automatically then stops after confirmation", async ({
  page,
}) => {
  let checks = 0;
  await page.route("**/api/orders/cs_test_delayed", (route) => {
    checks++;
    return route.fulfill({
      json:
        checks < 2
          ? { id: "cs_test_delayed", status: "pending", items: [] }
          : {
              id: "cs_test_delayed",
              status: "paid",
              total: 4.9,
              currency: "eur",
              items: [
                {
                  id: "1",
                  name: "Dreamy Star Charm",
                  download: "/api/download/test",
                },
              ],
            },
    });
  });
  await page.clock.install();
  await page.goto("/checkout?session_id=cs_test_delayed");
  await expect(
    page.getByRole("heading", { name: "Payment pending" }),
  ).toBeVisible();
  await page.clock.fastForward(2600);
  await expect(
    page.getByRole("heading", { name: "Make it yours." }),
  ).toBeVisible();
  expect(checks).toBe(2);
  await page.clock.fastForward(60000);
  expect(checks).toBe(2);
});

test("refunded order explains revoked downloads without offering recovery", async ({
  page,
}) => {
  await page.route("**/api/orders/cs_test_refunded", (route) =>
    route.fulfill({
      json: {
        id: "cs_test_refunded",
        status: "refunded",
        total: 4.9,
        currency: "eur",
        items: [],
      },
    }),
  );
  await page.goto("/checkout?session_id=cs_test_refunded");
  await expect(
    page.getByRole("heading", { name: "Payment refunded" }),
  ).toBeVisible();
  await expect(
    page.getByText("Downloads are no longer available.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Recover download access" }),
  ).toHaveCount(0);
  await expect(page.locator(".download-list a")).toHaveCount(0);
});

test("failed and expired checkouts keep cart and show terminal states", async ({
  page,
}) => {
  await addToCart(page, "1");
  for (const [status, title] of [
    ["failed", "Payment unsuccessful"],
    ["expired", "Checkout expired"],
  ]) {
    await page.route(`**/api/orders/cs_test_${status}`, (route) =>
      route.fulfill({ json: { id: `cs_test_${status}`, status, items: [] } }),
    );
    await page.goto(`/checkout?session_id=cs_test_${status}`);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.locator(".download-list a")).toHaveCount(0);
  }
  await page.goto("/cart");
  await expect(page.locator(".cart-row")).toHaveCount(1);
});
