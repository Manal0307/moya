import { motion, useScroll, useTransform } from 'motion/react';
import { useState, useRef } from 'react';
import { Heart, Sparkles, Printer, Star } from 'lucide-react';

export function About() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
  
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const values = [
    {
      id: 'design',
      title: 'Design unique',
      desc: 'Chaque création est originale, pensée avec soin pour créer des objets adorables et uniques.',
      icon: Sparkles,
      color: '#BBBBFF'
    },
    {
      id: 'quality',
      title: 'Qualité premium',
      desc: "Tous mes fichiers STL sont testés et optimisés pour l'impression 3D.",
      icon: Star,
      color: '#F0B4DF'
    },
    {
      id: 'universe',
      title: 'Univers cohérent',
      desc: 'Un style visuel doux et mignon qui crée un véritable univers à collectionner.',
      icon: Printer,
      color: '#BBBBFF'
    },
    {
      id: 'love',
      title: 'Fait avec amour',
      desc: 'Chaque modèle est créé avec passion et attention aux détails.',
      icon: Heart,
      color: '#F0B4DF'
    },
  ];

  const timeline = [
    { year: '2023', event: 'Découverte de la modélisation 3D', emoji: '✨' },
    { year: '2024', event: 'Premières créations de charms', emoji: '🎨' },
    { year: '2025', event: 'Lancement de PopCharms', emoji: '🚀' },
    { year: '2026', event: 'Expansion de la collection', emoji: '💫' },
  ];

  return (
    <div className="pt-16 min-h-screen relative" ref={containerRef}>
      {/* Header with parallax effect */}
      <div className="bg-[#f8f6f3] relative overflow-hidden">
        <motion.div 
          className="max-w-6xl mx-auto px-6 py-14 md:py-20 text-center relative z-10"
          style={{ y }}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl md:text-5xl text-[#190933] mb-3 tracking-tight" style={{ fontWeight: 300 }}>
              À propos
            </h1>
            <p className="text-sm text-[#8a8290]">L&apos;histoire derrière PopCharms</p>
          </motion.div>
        </motion.div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Story section with stagger animation */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="space-y-8 mb-20"
        >
          <div>
            <h2 className="text-[#190933] text-lg mb-4" style={{ fontWeight: 500 }}>Mon histoire</h2>
            <div className="space-y-4 text-sm text-[#8a8290]" style={{ lineHeight: 1.8 }}>
              {[
                "PopCharms est né de ma passion pour créer des choses jolies et partager cette créativité avec le monde. J'ai toujours adoré concevoir de petits objets adorables qui apportent de la joie au quotidien.",
                "Je crée des fichiers STL pour impression 3D — pas d'objets physiques ! Mon objectif est d'aider les personnes qui veulent imprimer elles-mêmes leurs créations, leur donner accès à des designs originaux et mignons qu'elles peuvent réaliser chez elles.",
                "Chaque modèle 3D est testé et optimisé pour être facile à imprimer, avec une attention particulière portée aux détails. Je veux rendre la création accessible : vous téléchargez le fichier STL, vous lancez votre imprimante, et vous créez votre propre collection unique.",
                "Pour les commandes personnalisées, je peux aussi proposer l'impression physique si vous n'avez pas d'imprimante 3D. Mais avant tout, PopCharms, c'est donner à chacun les outils pour créer et personnaliser ses propres objets."
              ].map((text, index) => (
                <motion.p
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                >
                  {text}
                </motion.p>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Interactive Timeline */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          className="mb-20"
        >
          <h2 className="text-[#190933] text-lg mb-8 text-center" style={{ fontWeight: 500 }}>
            Mon parcours
          </h2>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#BBBBFF] via-[#F0B4DF] to-[#BBBBFF] -translate-x-1/2" />
            
            <div className="space-y-12">
              {timeline.map((item, index) => (
                <motion.div
                  key={item.year}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15, duration: 0.5 }}
                  className={`flex items-center gap-8 ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}
                >
                  <div className={`flex-1 ${index % 2 === 0 ? 'text-right' : 'text-left'}`}>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="inline-block bg-white p-4 rounded-lg border border-gray-200 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="text-[#190933] text-xs mb-1" style={{ fontWeight: 600 }}>
                        {item.year}
                      </div>
                      <div className="text-sm text-[#8a8290]">{item.event}</div>
                    </motion.div>
                  </div>
                  
                  <motion.div 
                    whileHover={{ rotate: 360, scale: 1.2 }}
                    transition={{ duration: 0.5 }}
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-[#BBBBFF] to-[#F0B4DF] flex items-center justify-center text-2xl z-10 cursor-pointer shadow-lg"
                  >
                    {item.emoji}
                  </motion.div>
                  
                  <div className="flex-1" />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Interactive Values Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          className="border-t border-[#e8e4e0] pt-12"
        >
          <h2 className="text-[#190933] text-lg mb-8 text-center" style={{ fontWeight: 500 }}>
            Ce qui compte
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((item, index) => {
              const Icon = item.icon;
              const isHovered = hoveredCard === item.id;
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                  onHoverStart={() => setHoveredCard(item.id)}
                  onHoverEnd={() => setHoveredCard(null)}
                  whileHover={{ y: -8 }}
                  className="relative group"
                >
                  <div className="bg-white p-6 rounded-xl border border-gray-200 cursor-pointer transition-all duration-300 h-full relative overflow-hidden">
                    {/* Animated background on hover */}
                    <motion.div
                      className="absolute inset-0 opacity-0"
                      style={{ backgroundColor: item.color }}
                      animate={{ opacity: isHovered ? 0.05 : 0 }}
                      transition={{ duration: 0.3 }}
                    />
                    
                    <div className="relative z-10">
                      <motion.div
                        animate={{ 
                          rotate: isHovered ? 10 : 0,
                          scale: isHovered ? 1.1 : 1
                        }}
                        transition={{ duration: 0.3 }}
                        className="inline-block mb-3"
                      >
                        <Icon 
                          className="w-8 h-8 transition-colors duration-300" 
                          style={{ color: isHovered ? item.color : '#8a8290' }}
                          strokeWidth={1.5}
                        />
                      </motion.div>
                      
                      <h3 className="text-sm text-[#190933] mb-2" style={{ fontWeight: 500 }}>
                        {item.title}
                      </h3>
                      <p className="text-sm text-[#8a8290]" style={{ lineHeight: 1.7 }}>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Fun stats with animated counters */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          className="mt-20 bg-gradient-to-br from-[#BBBBFF]/10 to-[#F0B4DF]/10 rounded-2xl p-8"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '50+', label: 'Modèles créés' },
              { value: '100%', label: 'Fait main' },
              { value: '∞', label: 'Créativité' },
              { value: '💜', label: 'Passion' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
                whileHover={{ scale: 1.1 }}
              >
                <div className="text-3xl md:text-4xl text-[#190933] mb-2" style={{ fontWeight: 300 }}>
                  {stat.value}
                </div>
                <div className="text-xs text-[#8a8290] tracking-wide">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}