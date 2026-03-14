import { Link } from 'react-router';
import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowRight, Sparkles, Download, Heart, Star } from 'lucide-react';
import { products } from '../data/products';
import { useState, useRef } from 'react';
import heroBanner from '../../assets/5bb4367ead5633e0254bee4550870cc5c06d624c.png';

export function Landing() {
  const featuredProducts = products.filter((p) => p.featured);
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);
  
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, 100]);

  return (
    <div className="min-h-screen">
      {/* Hero - split layout with image with parallax */}
      <section ref={heroRef} className="pt-16 bg-[#f8f6f3] relative overflow-hidden">
        <motion.div 
          className="absolute inset-0 mt-16"
          style={{ y: heroY }}
        >
          <img
            src={heroBanner}
            alt="PopCharms - Charms en verre irisé dans un champ de fleurs"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-white/40" />
        </motion.div>
        
        <motion.div 
          className="max-w-6xl mx-auto px-6 py-24 md:py-32 text-center relative z-10"
          style={{ y: textY, opacity: heroOpacity }}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.p 
              className="text-xs tracking-[0.2em] text-[#8a8290] uppercase mb-6" 
              style={{ fontWeight: 400 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              Fichiers STL premium pour impression 3D
            </motion.p>
            
            <motion.h1
              className="text-4xl md:text-5xl lg:text-6xl text-[#190933] mb-6 tracking-tight"
              style={{ fontWeight: 300, lineHeight: 1.1 }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              Charms 3D & Keychains<br />à imprimer
            </motion.h1>
            
            <motion.p 
              className="text-[#8a8290] max-w-md mx-auto mb-10" 
              style={{ lineHeight: 1.7 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              Téléchargez des fichiers STL originaux pour imprimer chez vous : charms, porte-clés, figurines kawaii et objets déco mignons. Créez votre propre collection avec votre imprimante 3D.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 text-sm text-[#190933] border border-[#190933] px-8 py-3 hover:bg-[#190933] hover:text-white transition-all rounded-lg"
                  style={{ fontWeight: 500, letterSpacing: '0.05em' }}
                >
                  Explorer le shop
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
        
        {/* Floating elements */}
        <motion.div
          className="absolute top-1/4 left-10 hidden md:block"
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 5, 0]
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 4,
            ease: "easeInOut"
          }}
        >
          <Sparkles className="w-8 h-8 text-[#BBBBFF]/30" strokeWidth={1.5} />
        </motion.div>
        
        <motion.div
          className="absolute bottom-1/4 right-10 hidden md:block"
          animate={{ 
            y: [0, 20, 0],
            rotate: [0, -5, 0]
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 5,
            ease: "easeInOut"
          }}
        >
          <Heart className="w-6 h-6 text-[#F0B4DF]/30" strokeWidth={1.5} />
        </motion.div>
      </section>

      {/* Stats Section */}
      <motion.section 
        className="max-w-6xl mx-auto px-6 py-16"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <div className="grid grid-cols-3 gap-8 text-center">
          {[
            { icon: Download, value: '8+', label: 'Modèles 3D', color: '#BBBBFF' },
            { icon: Star, value: '100%', label: 'Fait main', color: '#F0B4DF' },
            { icon: Heart, value: '∞', label: 'Créativité', color: '#BBBBFF' },
          ].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ scale: 0, rotate: -10 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="relative group cursor-default"
              >
                <motion.div
                  className="absolute -inset-4 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ backgroundColor: `${stat.color}10` }}
                />
                <div className="relative">
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                    className="inline-block mb-3"
                  >
                    <Icon className="w-8 h-8 mx-auto" style={{ color: stat.color }} strokeWidth={1.5} />
                  </motion.div>
                  <div className="text-3xl md:text-4xl text-[#190933] mb-2" style={{ fontWeight: 300 }}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-[#8a8290] tracking-wide uppercase">
                    {stat.label}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* Featured Products Grid */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <motion.div 
          className="flex items-center justify-between mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-xs tracking-[0.2em] text-[#8a8290] uppercase" style={{ fontWeight: 400 }}>
            Populaires
          </h2>
          <motion.div whileHover={{ x: 5 }}>
            <Link
              to="/shop"
              className="text-xs tracking-[0.1em] text-[#8a8290] hover:text-[#190933] transition-colors uppercase flex items-center gap-1"
              style={{ fontWeight: 400 }}
            >
              Tout voir
              <ArrowRight className="w-3 h-3" />
            </Link>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {featuredProducts.map((product, index) => {
            const isHovered = hoveredProduct === product.id;
            
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15, duration: 0.5 }}
                onHoverStart={() => setHoveredProduct(product.id)}
                onHoverEnd={() => setHoveredProduct(null)}
                whileHover={{ y: -10 }}
              >
                <Link to={`/product/${product.id}`} className="group block">
                  <div className="relative aspect-square overflow-hidden bg-[#f8f6f3] mb-4 rounded-lg">
                    <motion.img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      animate={{ scale: isHovered ? 1.08 : 1 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                    
                    {/* Overlay gradient on hover */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-t from-[#190933]/60 via-transparent to-transparent flex items-end justify-center pb-6"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: isHovered ? 1 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <motion.div
                        initial={{ y: 20 }}
                        animate={{ y: isHovered ? 0 : 20 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white px-5 py-2 rounded-full text-xs text-[#190933] shadow-lg"
                        style={{ fontWeight: 500 }}
                      >
                        Découvrir
                      </motion.div>
                    </motion.div>
                    
                    {/* Sparkle icon on corner */}
                    <motion.div
                      className="absolute top-3 right-3"
                      animate={{ 
                        rotate: isHovered ? 360 : 0,
                        scale: isHovered ? 1.2 : 1
                      }}
                      transition={{ duration: 0.6 }}
                    >
                      <div className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md">
                        <Star className="w-4 h-4 text-[#F0B4DF]" strokeWidth={2} fill={isHovered ? "#F0B4DF" : "none"} />
                      </div>
                    </motion.div>
                  </div>
                  
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <motion.h3 
                        className="text-[#190933] text-sm mb-1" 
                        style={{ fontWeight: 500 }}
                        animate={{ color: isHovered ? '#BBBBFF' : '#190933' }}
                        transition={{ duration: 0.2 }}
                      >
                        {product.name}
                      </motion.h3>
                      <p className="text-xs text-[#8a8290]">{product.description}</p>
                    </div>
                    <motion.span 
                      className="text-sm text-[#190933] flex-shrink-0" 
                      style={{ fontWeight: 500 }}
                      animate={{ 
                        scale: isHovered ? 1.15 : 1,
                        color: isHovered ? '#BBBBFF' : '#190933'
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      ${product.price}
                    </motion.span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* About Banner with image */}
      <section className="bg-[#d4a5b5] relative overflow-hidden">
        {/* Decorative floating elements */}
        <motion.div
          className="absolute top-10 left-20 hidden lg:block"
          animate={{ 
            y: [0, -15, 0],
            rotate: [0, 10, 0]
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 6,
            ease: "easeInOut"
          }}
        >
          <Sparkles className="w-12 h-12 text-white/20" strokeWidth={1.5} />
        </motion.div>
        
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <motion.p 
                className="text-xs tracking-[0.2em] text-white/70 uppercase mb-6" 
                style={{ fontWeight: 400 }}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                L&apos;univers PopCharms
              </motion.p>
              <motion.h2
                className="text-3xl md:text-4xl text-white mb-6"
                style={{ fontWeight: 300, lineHeight: 1.3 }}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                Créations 3D uniques pour collectionneurs
              </motion.h2>
              <motion.p 
                className="text-white/80 mb-10" 
                style={{ lineHeight: 1.7 }}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                Téléchargez nos fichiers STL optimisés pour toutes imprimantes 3D (FDM, résine). Chaque modèle 3D est conçu pour un rendu parfait : charms kawaii, porte-clés personnalisés, figurines art toys et accessoires déco. Installation facile, résultats professionnels garantis.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/about"
                    className="text-sm text-white underline underline-offset-4 hover:opacity-60 transition-opacity inline-flex items-center gap-2"
                    style={{ fontWeight: 400 }}
                  >
                    En savoir plus
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Custom Order CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative bg-gradient-to-br from-[#BBBBFF]/10 to-[#F0B4DF]/10 rounded-3xl p-8 md:p-16 text-center overflow-hidden border border-[#BBBBFF]/30"
        >
          {/* Floating sparkles */}
          <motion.div
            className="absolute top-8 right-16 hidden md:block"
            animate={{ 
              y: [0, -10, 0],
              rotate: [0, 15, 0]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 4,
              ease: "easeInOut"
            }}
          >
            <Sparkles className="w-10 h-10 text-[#BBBBFF]/30" strokeWidth={1.5} />
          </motion.div>
          
          <motion.div
            className="absolute bottom-8 left-16 hidden md:block"
            animate={{ 
              y: [0, 10, 0],
              rotate: [0, -15, 0]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 5,
              ease: "easeInOut",
              delay: 1
            }}
          >
            <Heart className="w-8 h-8 text-[#F0B4DF]/30" strokeWidth={1.5} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="relative z-10"
          >
            <motion.div
              className="inline-block mb-6"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            >
              <Sparkles className="w-14 h-14 text-[#BBBBFF] mx-auto" strokeWidth={1.5} />
            </motion.div>

            <h2
              className="text-2xl md:text-4xl text-[#190933] mb-4"
              style={{ fontWeight: 300 }}
            >
              Un projet unique en tête ?
            </h2>
            <p className="text-[#8a8290] max-w-xl mx-auto mb-8" style={{ lineHeight: 1.7 }}>
              Commandez un modèle 3D personnalisé ! Charm custom, figurine sur mesure, ou objet déco original. 
              Je crée votre fichier STL unique selon vos envies.
            </p>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                to="/custom"
                className="inline-flex items-center gap-2 text-sm text-white bg-[#190933] px-8 py-4 rounded-lg hover:bg-[#2a1550] transition-all shadow-lg"
                style={{ fontWeight: 500, letterSpacing: '0.05em' }}
              >
                Créer ma commande personnalisée
                <Sparkles className="w-4 h-4" />
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* All Products Grid */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <motion.h2 
          className="text-xs tracking-[0.2em] text-[#8a8290] uppercase mb-10" 
          style={{ fontWeight: 400 }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          Toute la collection
        </motion.h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
              whileHover={{ y: -6 }}
            >
              <Link to={`/product/${product.id}`} className="group block">
                <div className="relative aspect-square overflow-hidden bg-[#f8f6f3] mb-3 rounded-lg">
                  <motion.img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                  
                  {/* Quick view overlay */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  />
                  
                  {/* Price badge on hover */}
                  <motion.div
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white px-4 py-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  >
                    <span className="text-xs text-[#190933]" style={{ fontWeight: 600 }}>
                      ${product.price}
                    </span>
                  </motion.div>
                </div>
                
                <motion.h3 
                  className="text-[#190933] text-sm mb-0.5 transition-colors" 
                  style={{ fontWeight: 500 }}
                  whileHover={{ color: '#BBBBFF' }}
                >
                  {product.name}
                </motion.h3>
                <span className="text-sm text-[#8a8290]">${product.price}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
