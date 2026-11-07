import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router";
import { LockKeyhole, Download, CheckCircle2 } from "lucide-react";
import { useCart } from "../context/CartContext";
import { money, products, stlImage } from "../data/products";
import terms from "../data/commerce-terms.json";
import { Arrow } from "../components/Arrow";
type Order = {
  status: string;
  id: string;
  items: { id: string; name: string; download: string }[];
  total: number;
  currency?: string;
};
function savedAccess(reference: string | null) {
  try {
    return reference ? sessionStorage.getItem(`moya-order-${reference}`) : null;
  } catch {
    return null;
  }
}
export function Checkout() {
  const { items: cartItems, removePurchased } = useCart();
  const [params] = useSearchParams();
  const session = params.get("session_id");
  const orderReference = session ?? params.get("order");
  const accessToken = params.get("access") ?? savedAccess(orderReference);
  useEffect(() => {
    const value = params.get("access"),
      id = params.get("order");
    if (value && id) {
      try {
        sessionStorage.setItem(`moya-order-${id}`, value);
      } catch {
        return;
      } // Keep the private access URL usable if tab storage is blocked.
      const clean = new URL(window.location.href);
      clean.searchParams.delete("access");
      window.history.replaceState(null, "", clean.pathname + clean.search);
    }
  }, [params]);
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const directId = params.get("buy");
  const directProduct = products.find((p) => p.id === directId);
  const items = directId
    ? directProduct
      ? [{ product: directProduct, quantity: 1 }]
      : []
    : cartItems;
  const total =
    items.reduce((sum, item) => sum + Math.round(item.product.price * 100), 0) /
    100;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [availability, setAvailability] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const [retry, setRetry] = useState(0);
  const [polling, setPolling] = useState(false);
  const requestKey = useRef(crypto.randomUUID());
  useEffect(() => {
    if (orderReference) return;
    let active = true;
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        if (active) setAvailability(data.checkout ? "ready" : "unavailable");
      })
      .catch(() => {
        if (active) setAvailability("unavailable");
      });
    return () => {
      active = false;
    };
  }, [orderReference]);
  useEffect(() => {
    if (!orderReference) return;
    const controller = new AbortController();
    let active = true;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setOrder(null);
    setError("");
    setPolling(false);
    async function check() {
      try {
        const response = await fetch(
          `/api/orders/${encodeURIComponent(orderReference!)}`,
          {
            headers: accessToken
              ? { Authorization: `Bearer ${accessToken}` }
              : {},
            signal: controller.signal,
          },
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error ?? "Unable to verify your order.");
        if (!active) return;
        setOrder(data);
        if (data.status === "paid")
          removePurchased(data.items.map((i: { id: string }) => i.id));
        if (data.status === "pending" && attempts < 24) {
          setPolling(true);
          attempts++;
          timer = setTimeout(check, 2500);
        } else setPolling(false);
      } catch (e) {
        if (active && e instanceof Error && e.name !== "AbortError") {
          setError(e.message);
          setPolling(false);
        }
      }
    }
    void check();
    return () => {
      active = false;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [orderReference, accessToken, retry, removePurchased]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          name: form.get("name"),
          items: items.map((i) => i.product.id),
          direct: !!directId,
          requestKey: requestKey.current,
          consent: form.get("consent") === "on",
          digitalConsent: form.get("digitalConsent") === "on",
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error ?? "Payment is unavailable. Please try again shortly.",
        );
      const url = new URL(data.url);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com")
        throw new Error("Invalid payment link.");
      if (
        typeof data.sessionId !== "string" ||
        typeof data.accessToken !== "string"
      )
        throw new Error("Order access could not be saved. Please try again.");
      try {
        sessionStorage.setItem(
          `moya-order-${data.sessionId}`,
          data.accessToken,
        );
      } catch {
        throw new Error(
          "Please allow tab storage before continuing. Your selection is preserved; download recovery is also available by email.",
        );
      }
      window.location.assign(url.href);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }
  const statusCopy: Record<string, { title: string; message: string }> = {
    refunded: {
      title: "Payment refunded",
      message:
        "This order has been refunded. Downloads are no longer available. Contact the studio if you need help.",
    },
    partially_refunded: {
      title: "Order partially refunded",
      message:
        "Downloads are suspended while the studio reviews the partial refund. Contact us about access to any remaining items.",
    },
    disputed: {
      title: "Order under review",
      message:
        "Downloads are suspended while the payment dispute is reviewed. Contact the studio for help.",
    },
    failed: {
      title: "Payment unsuccessful",
      message:
        "This payment was not completed. No downloads have been unlocked. Your cart is preserved; you can return to your selection and try again.",
    },
    expired: {
      title: "Checkout expired",
      message:
        "This checkout expired without a confirmed payment. Your cart is preserved; return to your selection to start again.",
    },
  };
  const closedOrder = order ? statusCopy[order.status] : undefined;
  if (orderReference)
    return (
      <div className="container page">
        <div className="confirmation">
          <p className="eyebrow">Your order</p>
          {order?.status === "paid" ? (
            <>
              <CheckCircle2 size={44} />
              <h1>Make it yours.</h1>
              <p>
                Your payment of{" "}
                {new Intl.NumberFormat("en-IE", {
                  style: "currency",
                  currency: order.currency ?? "EUR",
                }).format(order.total)}{" "}
                is confirmed. Download and save your files below.
              </p>
              <div className="download-list">
                {order.items.map((i) => (
                  <a
                    className="button secondary full"
                    key={i.download}
                    href={i.download}
                  >
                    <Download size={18} />
                    {i.name}
                  </a>
                ))}
              </div>
              <p className="small muted">
                These download links expire after five minutes. Check again to
                renew them. Your private order access expires after 24 hours.
              </p>
              <button
                className="button secondary"
                onClick={() => setRetry((n) => n + 1)}
              >
                Refresh download links
              </button>
            </>
          ) : (
            <>
              <h1>
                {error
                  ? "Order access unavailable"
                  : (closedOrder?.title ??
                    (order ? "Payment pending" : "Verifying payment…"))}
              </h1>
              <p role="status">
                {error ||
                  closedOrder?.message ||
                  (polling
                    ? "Waiting for payment confirmation. This page checks automatically; your cart is preserved."
                    : order
                      ? "Payment is still pending. You can check again shortly; your cart is preserved."
                      : "Checking your order securely…")}
              </p>
              {closedOrder ? (
                <Link className="button secondary" to="/custom">
                  Contact the studio
                </Link>
              ) : (
                <button
                  className="button"
                  onClick={() => setRetry((n) => n + 1)}
                >
                  Check again
                </button>
              )}
            </>
          )}
          {!closedOrder && (
            <form
              className="recover-form"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                try {
                  const response = await fetch("/api/recover", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: form.get("email") }),
                  });
                  const result = await response.json();
                  setRecoveryMessage(
                    response.ok ? result.message : result.error,
                  );
                } catch {
                  setRecoveryMessage(
                    "Download recovery is temporarily unavailable.",
                  );
                }
              }}
            >
              <p className="recover-intro">
                Lost access later? Enter your purchase email to receive a new
                link.
              </p>
              <div className="recover-row">
                <label>
                  <span className="sr-only">Email address</span>
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Your purchase email"
                    aria-label="Email address"
                    required
                    maxLength={254}
                  />
                </label>
                <button className="button secondary">
                  Recover download access
                </button>
              </div>
              <p role="status">{recoveryMessage}</p>
            </form>
          )}
          <Link className="text-link" to="/shop">
            Back to the collection <Arrow />
          </Link>
        </div>
      </div>
    );
  if (directId && !directProduct && !orderReference)
    return (
      <div className="container page empty-state">
        <h1>Model not found.</h1>
        <Link className="button" to="/shop">
          See the collection
        </Link>
      </div>
    );
  if (!items.length) return <Navigate to="/cart" replace />;
  return (
    <div className="container page">
      <nav className="breadcrumbs" aria-label="Checkout steps">
        <Link to={directProduct ? `/product/${directProduct.id}` : "/cart"}>
          01 Selection
        </Link>
        <span>/</span>
        <strong>02 Details</strong>
        <span>/</span>
        <span>03 Payment</span>
      </nav>
      <div className="page-heading">
        <h1>
          Almost yours<span className="heading-dot">.</span>
        </h1>
        <p>Just a few details, then secure payment.</p>
      </div>
      {params.has("cancelled") && (
        <p className="notice" role="status">
          Payment was interrupted. Your selection is preserved; you can try
          again.
        </p>
      )}
      <div className="checkout-grid">
        <form onSubmit={submit} className="checkout-form">
          <h2>Your details</h2>
          <label>
            Full name
            <input name="name" autoComplete="name" required maxLength={120} />
          </label>
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </label>
          <p className="small muted">
            Use a valid address for your payment information.
          </p>
          <div className="digital-notice">
            <LockKeyhole size={22} />
            <div>
              <strong>Secure payment with Stripe</strong>
              <p>
                You will continue to Stripe. Your card details are not collected
                by this site.
              </p>
            </div>
          </div>
          <label className="checkbox-label">
            <input name="consent" type="checkbox" required />
            <span>
              I have read the{" "}
              <Link to="/terms" target="_blank">
                terms of sale
              </Link>{" "}
              and understand that these are digital files for personal use.
            </span>
          </label>
          <label className="checkbox-label">
            <input name="digitalConsent" type="checkbox" required />
            <span>{terms.digitalConsent}</span>
          </label>
          {availability === "unavailable" && (
            <p className="notice">
              Purchases are temporarily unavailable. Your cart is saved; please
              come back soon.
            </p>
          )}
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <button
            className="button full"
            disabled={busy || availability !== "ready"}
          >
            {busy
              ? "Opening checkout…"
              : availability === "loading"
                ? "Checking availability…"
                : `Continue to payment · ${money(total)}`}
            <Arrow />
          </button>
        </form>
        <aside className="order-summary">
          <div className="section-heading">
            <h2>Your selection</h2>
            <Link
              className="text-link small"
              to={directProduct ? `/product/${directProduct.id}` : "/cart"}
            >
              Edit
            </Link>
          </div>
          {items.map(({ product }) => (
            <div className="mini-product" key={product.id}>
              {stlImage(product, 480) ? (
                <img src={stlImage(product, 480)!} alt="" />
              ) : (
                <span className="media-empty" aria-hidden="true" />
              )}
              <div>
                <strong>{product.name}</strong>
                <span>STL file</span>
              </div>
              <span>{money(product.price)}</span>
            </div>
          ))}
          <div className="summary-line">
            <span>Digital delivery</span>
            <span>No shipping fees</span>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <strong>{money(total)}</strong>
          </div>
          <p className="small muted">
            Downloads will be available after your payment is confirmed.
          </p>
        </aside>
      </div>
    </div>
  );
}
