import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Package, Layers, Rocket, Check, Mail, User, MessageSquare, Upload } from 'lucide-react';

export function CustomOrder() {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: '',
    description: '',
    reference: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const packages = [
    {
      id: 'small',
      name: 'Petit Projet',
      price: '15-30',
      icon: Package,
      color: '#BBBBFF',
      features: [
        'Design simple',
        'Charm ou petit keychain',
        '1 variation de design',
        'Fichier STL optimisé',
        'Livraison 3-5 jours'
      ],
      description: 'Parfait pour un charm unique ou un petit porte-clés personnalisé'
    },
    {
      id: 'medium',
      name: 'Projet Moyen',
      price: '35-60',
      icon: Layers,
      color: '#F0B4DF',
      popular: true,
      features: [
        'Design détaillé',
        'Art toy ou objet déco',
        '2-3 variations',
        'Fichiers STL + supports',
        'Guide d\'impression',
        'Livraison 5-7 jours'
      ],
      description: 'Idéal pour une figurine art toy ou un objet décoratif avec plusieurs détails'
    },
    {
      id: 'large',
      name: 'Grand Projet',
      price: '70-120',
      icon: Rocket,
      color: '#190933',
      features: [
        'Design complexe premium',
        'Figurine articulée ou set',
        'Versions multiples',
        'Pack complet STL',
        'Support technique dédié',
        'Révisions incluses',
        'Livraison 7-10 jours'
      ],
      description: 'Pour des projets ambitieux : figurines articulées, sets complets, designs complexes'
    }
  ];

  const categories = [
    'Charm / Pendentif',
    'Keychain / Porte-clés',
    'Figurine Art Toy',
    'Objet Déco',
    'Accessoire',
    'Autre'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Ici vous pourriez envoyer les données à un backend
    console.log({ ...formData, package: selectedPackage });
    setIsSubmitted(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="pt-16 min-h-screen">
      {/* Header */}
      <div className="bg-[#f8f6f3]">
        <div className="max-w-6xl mx-auto px-6 py-14 md:py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="inline-block mb-6"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Sparkles className="w-12 h-12 text-[#BBBBFF] mx-auto" strokeWidth={1.5} />
            </motion.div>
            <h1
              className="text-3xl md:text-5xl text-[#190933] mb-3 tracking-tight"
              style={{ fontWeight: 300 }}
            >
              Commande Personnalisée
            </h1>
            <p className="text-sm text-[#8a8290] max-w-2xl mx-auto">
              Créez votre modèle 3D sur mesure ! Décrivez votre projet et recevez un fichier STL unique, conçu spécialement pour vous. Charm personnalisé, figurine custom ou objet déco original.
            </p>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-6 inline-block bg-white/80 backdrop-blur-sm px-6 py-3 rounded-lg border border-[#BBBBFF]/30"
            >
              <p className="text-xs text-[#8a8290]">
                <span style={{ fontWeight: 600 }} className="text-[#190933]">Pas d'imprimante 3D ?</span> Aucun souci ! Pour les commandes personnalisées, je peux aussi vous proposer l'impression et l'envoi de l'objet physique.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
        {/* Packages */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-16"
        >
          <h2
            className="text-xs tracking-[0.2em] text-[#8a8290] uppercase mb-8 text-center"
            style={{ fontWeight: 400 }}
          >
            Choisissez votre formule
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {packages.map((pkg, index) => {
              const Icon = pkg.icon;
              const isSelected = selectedPackage === pkg.id;

              return (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  onClick={() => setSelectedPackage(pkg.id)}
                  className={`relative cursor-pointer rounded-2xl p-6 md:p-8 border-2 transition-all ${
                    isSelected
                      ? 'border-[#190933] bg-white shadow-xl'
                      : 'border-gray-200 bg-white hover:border-[#BBBBFF] hover:shadow-lg'
                  }`}
                >
                  {/* Popular badge */}
                  {pkg.popular && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                      className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#BBBBFF] to-[#F0B4DF] text-white px-4 py-1 rounded-full text-xs shadow-lg"
                      style={{ fontWeight: 600 }}
                    >
                      POPULAIRE
                    </motion.div>
                  )}

                  {/* Selected check */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 180 }}
                        className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#190933] flex items-center justify-center"
                      >
                        <Check className="w-5 h-5 text-white" strokeWidth={3} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Icon */}
                  <motion.div
                    className="mb-4"
                    animate={{
                      rotate: isSelected ? 360 : 0
                    }}
                    transition={{ duration: 0.6 }}
                  >
                    <Icon
                      className="w-12 h-12"
                      style={{ color: pkg.color }}
                      strokeWidth={1.5}
                    />
                  </motion.div>

                  {/* Name & Price */}
                  <h3
                    className="text-xl text-[#190933] mb-2"
                    style={{ fontWeight: 500 }}
                  >
                    {pkg.name}
                  </h3>
                  <div className="mb-4">
                    <span className="text-3xl text-[#190933]" style={{ fontWeight: 300 }}>
                      ${pkg.price}
                    </span>
                  </div>

                  <p className="text-xs text-[#8a8290] mb-6" style={{ lineHeight: 1.6 }}>
                    {pkg.description}
                  </p>

                  {/* Features */}
                  <ul className="space-y-3">
                    {pkg.features.map((feature, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 + i * 0.05 }}
                        className="flex items-start gap-2 text-sm text-[#8a8290]"
                      >
                        <Check
                          className="w-4 h-4 flex-shrink-0 mt-0.5"
                          style={{ color: pkg.color }}
                          strokeWidth={2.5}
                        />
                        <span>{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Form */}
        <AnimatePresence mode="wait">
          {!isSubmitted ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.4 }}
              className="max-w-3xl mx-auto"
            >
              <h2
                className="text-xs tracking-[0.2em] text-[#8a8290] uppercase mb-8 text-center"
                style={{ fontWeight: 400 }}
              >
                Décrivez votre projet
              </h2>

              <motion.form
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl p-6 md:p-10 border border-gray-200 shadow-lg"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="space-y-6">
                  {/* Name */}
                  <div>
                    <label className="flex items-center gap-2 text-sm text-[#190933] mb-2" style={{ fontWeight: 500 }}>
                      <User className="w-4 h-4" strokeWidth={2} />
                      Votre nom
                    </label>
                    <motion.input
                      whileFocus={{ scale: 1.01 }}
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#BBBBFF] transition-colors text-sm"
                      placeholder="John Doe"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="flex items-center gap-2 text-sm text-[#190933] mb-2" style={{ fontWeight: 500 }}>
                      <Mail className="w-4 h-4" strokeWidth={2} />
                      Email
                    </label>
                    <motion.input
                      whileFocus={{ scale: 1.01 }}
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#BBBBFF] transition-colors text-sm"
                      placeholder="john@example.com"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="flex items-center gap-2 text-sm text-[#190933] mb-2" style={{ fontWeight: 500 }}>
                      <Layers className="w-4 h-4" strokeWidth={2} />
                      Type de projet
                    </label>
                    <motion.select
                      whileFocus={{ scale: 1.01 }}
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#BBBBFF] transition-colors text-sm bg-white"
                    >
                      <option value="">Sélectionnez une catégorie</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </motion.select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="flex items-center gap-2 text-sm text-[#190933] mb-2" style={{ fontWeight: 500 }}>
                      <MessageSquare className="w-4 h-4" strokeWidth={2} />
                      Description détaillée
                    </label>
                    <motion.textarea
                      whileFocus={{ scale: 1.01 }}
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      rows={5}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#BBBBFF] transition-colors text-sm resize-none"
                      placeholder="Décrivez votre projet en détail : style souhaité, dimensions, couleurs, inspirations, utilisation prévue..."
                    />
                  </div>

                  {/* Reference Images */}
                  <div>
                    <label className="flex items-center gap-2 text-sm text-[#190933] mb-2" style={{ fontWeight: 500 }}>
                      <Upload className="w-4 h-4" strokeWidth={2} />
                      Images de référence (optionnel)
                    </label>
                    <motion.input
                      whileFocus={{ scale: 1.01 }}
                      type="text"
                      name="reference"
                      value={formData.reference}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#BBBBFF] transition-colors text-sm"
                      placeholder="Lien vers vos images de référence (Google Drive, Dropbox, etc.)"
                    />
                  </div>

                  {/* Package reminder */}
                  {selectedPackage && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-r from-[#BBBBFF]/10 to-[#F0B4DF]/10 rounded-lg p-4 border border-[#BBBBFF]/30"
                    >
                      <p className="text-sm text-[#190933]">
                        Formule sélectionnée :{' '}
                        <span style={{ fontWeight: 600 }}>
                          {packages.find((p) => p.id === selectedPackage)?.name}
                        </span>
                      </p>
                    </motion.div>
                  )}

                  {/* Submit */}
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-[#190933] text-white py-4 rounded-lg text-sm transition-all hover:bg-[#2a1550] flex items-center justify-center gap-2 shadow-lg"
                    style={{ fontWeight: 500, letterSpacing: '0.05em' }}
                    disabled={!selectedPackage}
                  >
                    {selectedPackage ? (
                      <>
                        Envoyer ma demande
                        <Sparkles className="w-4 h-4" />
                      </>
                    ) : (
                      'Sélectionnez d\'abord une formule'
                    )}
                  </motion.button>
                </div>
              </motion.form>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="max-w-2xl mx-auto text-center py-16"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="inline-block mb-6"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#BBBBFF] to-[#F0B4DF] flex items-center justify-center mx-auto">
                  <Check className="w-10 h-10 text-white" strokeWidth={2.5} />
                </div>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl text-[#190933] mb-4"
                style={{ fontWeight: 300 }}
              >
                Demande envoyée !
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-[#8a8290] mb-8"
                style={{ lineHeight: 1.7 }}
              >
                Merci pour votre confiance ! Je vais étudier votre projet et vous répondre
                sous 24-48h avec un devis personnalisé et des questions complémentaires si nécessaire.
              </motion.p>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setIsSubmitted(false);
                  setFormData({
                    name: '',
                    email: '',
                    category: '',
                    description: '',
                    reference: ''
                  });
                  setSelectedPackage(null);
                }}
                className="text-sm text-[#190933] border border-[#190933] px-8 py-3 rounded-lg hover:bg-[#190933] hover:text-white transition-all"
                style={{ fontWeight: 500, letterSpacing: '0.05em' }}
              >
                Nouvelle demande
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}