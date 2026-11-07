import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { Menu, X } from "lucide-react";
import { useCart } from "../context/CartContext";
import { replayIntro } from "./OpeningIntro";
const links = [
  ["/", "Home"],
  ["/about", "About"],
  ["/shop", "Shop"],
  ["/contact", "Contact"],
  ["/faq", "FAQ"],
];
export function PortalNav() {
  const { pathname } = useLocation();
  const { itemCount } = useCart();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <header className={`lab-nav${scrolled || open ? " is-scrolled" : ""}`}>
      <Link
        to="/"
        className="lab-logo"
        aria-label="Tokki Pocket, home"
        onClick={replayIntro}
      >
        <img className="lab-logo-mark" src="/logo.png" alt="" />
        <span>Tokki Pocket</span>
      </Link>
      <nav className="lab-links" aria-label="Main navigation">
        {links.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === "/"}>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="lab-actions">
        <Link
          className="lab-bag"
          to="/cart"
          aria-label={`Bag, ${itemCount} items`}
        >
          <span className="lab-bag-label">Bag</span>
          <span className="lab-bag-count">({itemCount})</span>
        </Link>
        <button
          className="lab-menu-toggle"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" className="lab-sheet" aria-label="Mobile navigation">
          {links.map(([to, label]) => (
            <Link key={to} to={to}>
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
