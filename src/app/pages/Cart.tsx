import { Link, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';

export function Cart() {
  const { items, removeFromCart, updateQuantity, total } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="pt-16 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-24 text-center">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl text-[#190933] mb-4" style={{ fontWeight: 400 }}>Votre panier est vide</h1>
            <p className="text-sm text-[#8a8290] mb-8">Découvrez nos créations et commencez votre collection.</p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 text-sm border border-[#190933] text-[#190933] px-8 py-3 hover:bg-[#190933] hover:text-white transition-all"
              style={{ fontWeight: 500, letterSpacing: '0.05em' }}
            >
              Découvrir le shop
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-2xl text-[#190933] mb-2" style={{ fontWeight: 400 }}>Panier</h1>
          <p className="text-sm text-[#8a8290] mb-10">
            {items.length} {items.length === 1 ? 'article' : 'articles'}
          </p>
        </motion.div>

        {/* Items */}
        <div className="border-t border-[#e8e4e0]">
          {items.map((item) => (
            <div key={item.product.id} className="border-b border-[#e8e4e0] py-6 flex gap-5">
              <Link to={`/product/${item.product.id}`} className="w-24 h-24 flex-shrink-0 bg-[#f8f6f3] overflow-hidden">
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-full h-full object-cover"
                />
              </Link>

              <div className="flex-1 flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      to={`/product/${item.product.id}`}
                      className="text-sm text-[#190933] hover:opacity-60 transition-opacity"
                      style={{ fontWeight: 500 }}
                    >
                      {item.product.name}
                    </Link>
                    <p className="text-xs text-[#8a8290] mt-1">{item.product.category}</p>
                  </div>
                  <span className="text-sm text-[#190933]" style={{ fontWeight: 500 }}>
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3 border border-[#e8e4e0]">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-[#f8f6f3] transition-colors"
                    >
                      <Minus className="w-3 h-3 text-[#190933]" />
                    </button>
                    <span className="text-sm text-[#190933] w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-[#f8f6f3] transition-colors"
                    >
                      <Plus className="w-3 h-3 text-[#190933]" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-[#8a8290] hover:text-[#190933] transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-8 flex flex-col items-end">
          <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between text-sm text-[#8a8290]">
              <span>Sous-total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-[#8a8290]">
              <span>Livraison</span>
              <span>Digital</span>
            </div>
            <div className="border-t border-[#e8e4e0] pt-3 flex justify-between">
              <span className="text-sm text-[#190933]" style={{ fontWeight: 500 }}>Total</span>
              <span className="text-sm text-[#190933]" style={{ fontWeight: 500 }}>${total.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/checkout')}
            className="mt-6 w-full max-w-xs bg-[#190933] text-white py-3.5 text-sm tracking-wide hover:bg-[#2a1a4e] transition-colors"
            style={{ fontWeight: 500, letterSpacing: '0.05em' }}
          >
            Passer commande
          </button>

          <Link
            to="/shop"
            className="mt-3 text-xs text-[#8a8290] underline underline-offset-4 hover:text-[#190933] transition-colors"
          >
            Continuer mes achats
          </Link>
        </div>
      </div>
    </div>
  );
}
