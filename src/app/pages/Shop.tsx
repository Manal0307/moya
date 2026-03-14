import { useState } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { products } from '../data/products';
import { Sparkles, Star } from 'lucide-react';

export function Shop() {
  const [filter, setFilter] = useState<string>('all');
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);

  const filteredProducts =
    filter === 'all'
      ? products
      : products.filter((p) => p.category === filter);

  const categories = [
    { id: 'all', label: 'Tous', icon: Sparkles },
    { id: 'charm', label: 'Charms', icon: Star },
    { id: 'keychain', label: 'Keychains', icon: Star },
    { id: 'art-toy', label: 'Art Toys', icon: Star },
    { id: 'decoration', label: 'Décorations', icon: Star },
  ];

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
            <h1
              className="text-3xl md:text-5xl text-[#190933] mb-3 tracking-tight"
              style={{ fontWeight: 300 }}
            >
              Fichiers STL 3D à Télécharger
            </h1>
            <p className="text-sm text-[#8a8290] max-w-2xl mx-auto">
              Découvrez notre collection de modèles 3D pour impression : charms kawaii, keychains personnalisés, figurines art toys et objets déco. Fichiers STL optimisés pour imprimantes FDM et résine.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Filters with count */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap gap-2"
          >
            {categories.map((cat, index) => {
              const Icon = cat.icon;
              const isActive = filter === cat.id;
              const count = cat.id === 'all'
                ? products.length
                : products.filter(p => p.category === cat.id).length;

              return (
                <motion.button
                  key={cat.id}
                  onClick={() => setFilter(cat.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`relative text-xs tracking-wide px-4 py-2.5 rounded-lg border transition-all overflow-hidden ${
                    isActive
                      ? 'bg-[#190933] text-white border-[#190933] shadow-md'
                      : 'bg-white text-[#8a8290] border-gray-200 hover:border-[#BBBBFF] hover:text-[#190933]'
                  }`}
                  style={{ fontWeight: 400, letterSpacing: '0.05em' }}
                >
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                    {cat.label}
                    <span
                      className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                        isActive
                          ? 'bg-white/20'
                          : 'bg-gray-100'
                      }`}
                    >
                      {count}
                    </span>
                  </span>

                  {/* Animated background on hover */}
                  {!isActive && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-[#BBBBFF]/5 to-[#F0B4DF]/5"
                      initial={{ x: '-100%' }}
                      whileHover={{ x: 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </motion.div>

          {/* Product count */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-[#8a8290]"
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={filteredProducts.length}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
              >
                {filteredProducts.length} {filteredProducts.length > 1 ? 'produits' : 'produit'}
              </motion.span>
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Products Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={filter}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
          >
            {filteredProducts.map((product, index) => {
              const isHovered = hoveredProduct === product.id;

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  onHoverStart={() => setHoveredProduct(product.id)}
                  onHoverEnd={() => setHoveredProduct(null)}
                  whileHover={{ y: -8 }}
                  className="group"
                >
                  <Link to={`/product/${product.id}`} className="block">
                    <div className="relative">
                      {/* Image container */}
                      <div className="aspect-square overflow-hidden bg-[#f8f6f3] mb-3 rounded-lg relative">
                        <motion.img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          animate={{
                            scale: isHovered ? 1.1 : 1
                          }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        />

                        {/* Overlay on hover */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0 flex items-end justify-center pb-4"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: isHovered ? 1 : 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <motion.div
                            initial={{ y: 10 }}
                            animate={{ y: isHovered ? 0 : 10 }}
                            transition={{ duration: 0.3 }}
                            className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full text-xs text-[#190933]"
                            style={{ fontWeight: 500 }}
                          >
                            Voir le produit
                          </motion.div>
                        </motion.div>

                        {/* New badge if index < 2 */}
                        {index < 2 && (
                          <motion.div
                            initial={{ scale: 0, rotate: -12 }}
                            animate={{ scale: 1, rotate: -12 }}
                            transition={{ delay: index * 0.05 + 0.3, type: "spring", stiffness: 200 }}
                            className="absolute top-3 right-3 bg-gradient-to-br from-[#BBBBFF] to-[#F0B4DF] text-white px-3 py-1 rounded-full text-[10px] shadow-lg"
                            style={{ fontWeight: 600 }}
                          >
                            NOUVEAU
                          </motion.div>
                        )}
                      </div>

                      {/* Product info */}
                      <div className="space-y-1">
                        <motion.h3
                          className="text-[#190933] text-sm"
                          style={{ fontWeight: 500 }}
                          animate={{
                            color: isHovered ? '#BBBBFF' : '#190933'
                          }}
                          transition={{ duration: 0.2 }}
                        >
                          {product.name}
                        </motion.h3>

                        <div className="flex items-center justify-between">
                          <motion.span
                            className="text-sm text-[#8a8290]"
                            animate={{
                              scale: isHovered ? 1.1 : 1,
                              fontWeight: isHovered ? 600 : 400
                            }}
                            transition={{ duration: 0.2 }}
                          >
                            ${product.price}
                          </motion.span>

                          {/* Category badge */}
                          <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{
                              opacity: isHovered ? 1 : 0,
                              x: isHovered ? 0 : -10
                            }}
                            transition={{ duration: 0.2 }}
                            className="text-[10px] text-[#8a8290] bg-[#f8f6f3] px-2 py-1 rounded"
                            style={{ letterSpacing: '0.05em' }}
                          >
                            {categories.find(c => c.id === product.category)?.label || 'Autre'}
                          </motion.span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {filteredProducts.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="inline-block mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#BBBBFF]/20 to-[#F0B4DF]/20 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-[#8a8290]" strokeWidth={1.5} />
              </div>
            </div>
            <p className="text-[#8a8290] text-sm">
              Aucun produit dans cette catégorie.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}