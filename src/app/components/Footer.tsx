import { Link } from 'react-router';

export function Footer() {
  return (
    <footer className="border-t border-[#e8e4e0] mt-20">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="md:col-span-1">
            <span className="text-[#190933] tracking-wide" style={{ fontWeight: 600, fontSize: '0.95rem', letterSpacing: '0.08em' }}>
              POPCHARMS
            </span>
            <p className="text-sm text-[#8a8290] mt-3 leading-relaxed">
              Créations digitales 3D<br />
              Fichiers STL pour impression 3D
            </p>
          </div>

          <div>
            <h4 className="text-[#190933] text-xs tracking-widest uppercase mb-4" style={{ fontWeight: 500 }}>Shop</h4>
            <div className="flex flex-col gap-2 text-sm">
              <Link to="/shop" className="text-[#8a8290] hover:text-[#190933] transition-colors">Tous les produits</Link>
              <Link to="/shop" className="text-[#8a8290] hover:text-[#190933] transition-colors">Charms</Link>
              <Link to="/shop" className="text-[#8a8290] hover:text-[#190933] transition-colors">Keychains</Link>
            </div>
          </div>

          <div>
            <h4 className="text-[#190933] text-xs tracking-widest uppercase mb-4" style={{ fontWeight: 500 }}>Info</h4>
            <div className="flex flex-col gap-2 text-sm">
              <Link to="/about" className="text-[#8a8290] hover:text-[#190933] transition-colors">À propos</Link>
              <Link to="/faq" className="text-[#8a8290] hover:text-[#190933] transition-colors">FAQ</Link>
              <Link to="/terms" className="text-[#8a8290] hover:text-[#190933] transition-colors">Conditions</Link>
            </div>
          </div>

          <div>
            <h4 className="text-[#190933] text-xs tracking-widest uppercase mb-4" style={{ fontWeight: 500 }}>Contact</h4>
            <div className="flex flex-col gap-2 text-sm">
              <a href="mailto:hello@popcharms.com" className="text-[#8a8290] hover:text-[#190933] transition-colors">hello@popcharms.com</a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-[#e8e4e0] text-center text-xs text-[#8a8290]">
          © 2026 PopCharms. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
