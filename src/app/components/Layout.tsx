import { Outlet, useLocation } from "react-router";
import { useEffect } from "react";
import { Toaster } from "sonner";
import "../../styles/portal.css";
import "../../styles/noir-site.css";
import "../../styles/lab.css";
import "../../styles/system.css";
import { Link } from "react-router";
import { PortalNav } from "./PortalNav";
import { Cursor } from "./Cursor";
import { replayIntro } from "./OpeningIntro";
import { CONTACT_EMAIL } from "../data/contact";
import { products } from "../data/products";
export function Layout() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash)
      requestAnimationFrame(() =>
        document.getElementById(hash.slice(1))?.scrollIntoView(),
      );
    else window.scrollTo(0, 0);
    const titles: Record<string, string> = {
      "/shop": "Shop",
      "/": "Objects worth printing",
      "/cart": "Your cart",
      "/checkout": "Checkout",
      "/about": "The studio",
      "/faq": "FAQ",
      "/custom": "Contact",
      "/terms": "Terms & privacy",
    };
    const product = products.find((p) => pathname === `/product/${p.id}`);
    document.title = `${product ? `${product.name}, Digital STL` : (titles[pathname] ?? "Collection")} | Tokki Pocket`;
  }, [pathname, hash]);
  return (
    <div className="portal-shell portal-dark">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <PortalNav />
      <main id="main" tabIndex={-1}>
        {/* Keyed on the path so every page plays the same entrance. */}
        <div key={pathname} className="page-enter">
          <Outlet />
        </div>
      </main>
      <Cursor />
      <footer className="lab-footer">
          <div className="lab-footer-top">
            <div className="lab-footer-brand">
              <Link to="/" className="lab-logo" onClick={replayIntro}>
                <img className="lab-logo-mark" src="/logo.png" alt="" />
                <span>Tokki Pocket</span>
              </Link>
              <p>
                Digital STL objects to print yourself. Small things, real
                character.
              </p>
              <a className="lab-footer-email" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
            </div>
            <nav className="lab-footer-cols" aria-label="Footer">
              <div>
                <p>Studio</p>
                <Link to="/about">About</Link>
                <Link to="/shop">Shop</Link>
                <Link to="/contact">Contact</Link>
                <Link to="/faq">FAQ</Link>
              </div>
              <div>
                <p>Help</p>
                <Link to="/downloads">Downloads</Link>
                <Link to="/terms">Terms</Link>
                <Link to="/privacy">Privacy</Link>
              </div>
            </nav>
          </div>
          <div className="lab-footer-bottom">
            <span>© {new Date().getFullYear()} Tokki Pocket</span>
            <span>Digital STL files · Personal use</span>
          </div>
        </footer>
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}
