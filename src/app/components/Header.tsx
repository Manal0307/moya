import { Link, useLocation } from 'react-router';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useState } from 'react';

export function Header() {
  const location = useLocation();
  const { itemCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/shop', label: 'Shop' },
    { path: '/custom', label: 'Custom' },
    { path: '/about', label: 'About' },
    { path: '/faq', label: 'FAQ' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white backdrop-blur-sm border-b border-gray-200">
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="text-[#190933] tracking-wide" style={{ fontWeight: 600, fontSize: '1.1rem', letterSpacing: '0.08em' }}>
          POPCHARMS
        </Link>

        {/* Desktop Nav - right side */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-sm tracking-wide transition-colors ${
                isActive(link.path)
                  ? 'text-[#190933]'
                  : 'text-[#190933]/60 hover:text-[#190933]'
              }`}
              style={{ fontWeight: 400, letterSpacing: '0.05em' }}
            >
              {link.label}
            </Link>
          ))}
          
          {/* Cart icon on desktop */}
          <Link
            to="/cart"
            className="relative text-[#190933] hover:opacity-60 transition-opacity"
          >
            <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#190933] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center" style={{ fontWeight: 600 }}>
                {itemCount}
              </span>
            )}
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center gap-4 md:hidden">
          <Link
            to="/cart"
            className="relative text-[#190933] hover:opacity-60 transition-opacity"
          >
            <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#190933] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center" style={{ fontWeight: 600 }}>
                {itemCount}
              </span>
            )}
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-[#190933]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-sm tracking-wide py-2 ${
                  isActive(link.path) ? 'text-[#190933]' : 'text-[#190933]/60'
                }`}
                style={{ fontWeight: 400, letterSpacing: '0.05em' }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}