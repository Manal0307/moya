import { useParams, useNavigate, Link } from 'react-router';
import { motion } from 'motion/react';
import { ShoppingBag, Check, ArrowLeft } from 'lucide-react';
import { products } from '../data/products';
import { useCart } from '../context/CartContext';
import { useState } from 'react';

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-[#190933] text-xl mb-4" style={{ fontWeight: 500 }}>Produit non trouvé</h2>
          <Link to="/shop" className="text-sm text-[#8a8290] underline underline-offset-4 hover:text-[#190933]">
            Retour au shop
          </Link>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const relatedProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="pt-16 min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs text-[#8a8290] hover:text-[#190933] transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="aspect-square bg-[#f8f6f3] overflow-hidden">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col justify-center"
          >
            <p className="text-xs tracking-[0.15em] text-[#8a8290] uppercase mb-3" style={{ fontWeight: 400 }}>
              {product.category}
            </p>

            <h1 className="text-2xl md:text-3xl text-[#190933] mb-3" style={{ fontWeight: 400 }}>
              {product.name}
            </h1>

            <p className="text-2xl text-[#190933] mb-6" style={{ fontWeight: 500 }}>
              ${product.price}
            </p>

            <p className="text-sm text-[#8a8290] leading-relaxed mb-8" style={{ lineHeight: 1.7 }}>
              {product.details}
            </p>

            {/* File Info */}
            <div className="border-t border-b border-[#e8e4e0] py-5 mb-8 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#8a8290]">Format</span>
                <span className="text-[#190933]">STL</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#8a8290]">Taille</span>
                <span className="text-[#190933]">{product.fileSize}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#8a8290]">Temps d&apos;impression</span>
                <span className="text-[#190933]">{product.printTime}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleAddToCart}
                className="w-full bg-[#190933] text-white py-3.5 text-sm tracking-wide hover:bg-[#2a1a4e] transition-colors flex items-center justify-center gap-2"
                style={{ fontWeight: 500, letterSpacing: '0.05em' }}
              >
                {added ? (
                  <>
                    <Check className="w-4 h-4" />
                    Ajouté au panier
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    Ajouter au panier
                  </>
                )}
              </button>
              <button
                onClick={() => { addToCart(product); navigate('/checkout'); }}
                className="w-full border border-[#190933] text-[#190933] py-3.5 text-sm tracking-wide hover:bg-[#190933] hover:text-white transition-all"
                style={{ fontWeight: 500, letterSpacing: '0.05em' }}
              >
                Acheter maintenant
              </button>
            </div>

            {/* Details */}
            <div className="mt-8 space-y-2 text-xs text-[#8a8290]">
              <p>✓ Téléchargement instantané après achat</p>
              <p>✓ Usage personnel illimité</p>
              <p>✓ Fichier testé et optimisé pour l&apos;impression</p>
            </div>
          </motion.div>
        </div>

        {/* Related */}
        {relatedProducts.length > 0 && (
          <div className="mt-24">
            <h2 className="text-xs tracking-[0.2em] text-[#8a8290] uppercase mb-8" style={{ fontWeight: 400 }}>
              Vous aimerez aussi
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {relatedProducts.map((related) => (
                <Link key={related.id} to={`/product/${related.id}`} className="group block">
                  <div className="aspect-square overflow-hidden bg-[#f8f6f3] mb-3">
                    <img
                      src={related.image}
                      alt={related.name}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                    />
                  </div>
                  <h3 className="text-[#190933] text-sm mb-0.5" style={{ fontWeight: 500 }}>{related.name}</h3>
                  <span className="text-sm text-[#8a8290]">${related.price}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
