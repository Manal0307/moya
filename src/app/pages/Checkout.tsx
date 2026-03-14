import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { useCart } from '../context/CartContext';

export function Checkout() {
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setProcessing(false);
    setCompleted(true);
    setTimeout(() => {
      clearCart();
      navigate('/');
    }, 3000);
  };

  if (items.length === 0 && !completed) {
    navigate('/cart');
    return null;
  }

  if (completed) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center max-w-sm px-6"
        >
          <div className="w-12 h-12 bg-[#190933] rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl text-[#190933] mb-3" style={{ fontWeight: 500 }}>
            Commande confirmée
          </h2>
          <p className="text-sm text-[#8a8290] mb-1">
            Merci {name} !
          </p>
          <p className="text-xs text-[#8a8290]">
            Vos fichiers STL seront envoyés à {email}
          </p>
        </motion.div>
      </div>
    );
  }

  const inputClass =
    'w-full px-4 py-3 border border-[#e8e4e0] text-sm text-[#190933] focus:outline-none focus:border-[#190933] transition-colors bg-white placeholder:text-[#c4bfc8]';

  return (
    <div className="pt-16 min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-2xl text-[#190933] mb-2" style={{ fontWeight: 400 }}>Paiement</h1>
          <p className="text-sm text-[#8a8290] mb-10">Finalisez votre commande</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Form */}
          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <h3 className="text-xs tracking-[0.15em] text-[#8a8290] uppercase mb-4" style={{ fontWeight: 400 }}>
                  Informations
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className={inputClass}
                    placeholder="Nom complet"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={inputClass}
                    placeholder="Email"
                  />
                  <p className="text-xs text-[#8a8290]">
                    Vos fichiers STL seront envoyés à cette adresse.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xs tracking-[0.15em] text-[#8a8290] uppercase mb-4" style={{ fontWeight: 400 }}>
                  Paiement
                </h3>
                <div className="space-y-3">
                  <input type="text" placeholder="Numéro de carte" className={inputClass} required />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="MM / AA" className={inputClass} required />
                    <input type="text" placeholder="CVC" className={inputClass} required />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full bg-[#190933] text-white py-3.5 text-sm tracking-wide hover:bg-[#2a1a4e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontWeight: 500, letterSpacing: '0.05em' }}
              >
                {processing ? 'Traitement...' : `Payer $${total.toFixed(2)}`}
              </button>

              <p className="text-xs text-center text-[#8a8290]">
                Paiement sécurisé · Livraison instantanée par email
              </p>
            </form>
          </div>

          {/* Summary */}
          <div className="lg:col-span-2">
            <h3 className="text-xs tracking-[0.15em] text-[#8a8290] uppercase mb-4" style={{ fontWeight: 400 }}>
              Récapitulatif
            </h3>

            <div className="space-y-4 mb-6">
              {items.map((item) => (
                <div key={item.product.id} className="flex gap-3">
                  <div className="w-14 h-14 bg-[#f8f6f3] flex-shrink-0 overflow-hidden">
                    <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#190933] truncate" style={{ fontWeight: 500 }}>
                      {item.product.name}
                    </p>
                    <p className="text-xs text-[#8a8290]">
                      Qté: {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm text-[#190933] flex-shrink-0" style={{ fontWeight: 500 }}>
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-[#e8e4e0] pt-4 space-y-2">
              <div className="flex justify-between text-sm text-[#8a8290]">
                <span>Sous-total</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-[#8a8290]">
                <span>Frais</span>
                <span>$0.00</span>
              </div>
              <div className="border-t border-[#e8e4e0] pt-3 flex justify-between">
                <span className="text-sm text-[#190933]" style={{ fontWeight: 500 }}>Total</span>
                <span className="text-sm text-[#190933]" style={{ fontWeight: 500 }}>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
