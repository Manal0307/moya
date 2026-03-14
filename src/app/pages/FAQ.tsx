import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, FileQuestion, Download, Printer, Scale, Settings, RefreshCw, Mail } from 'lucide-react';
import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
  icon: typeof FileQuestion;
  color: string;
}

const faqs: FAQItem[] = [
  {
    question: "Qu'est-ce qu'un fichier STL ?",
    answer: "Un fichier STL est un format utilisé pour l'impression 3D. Vous pouvez l'ouvrir avec n'importe quel logiciel de tranchage comme Cura, PrusaSlicer ou Simplify3D.",
    icon: FileQuestion,
    color: '#BBBBFF'
  },
  {
    question: 'Comment télécharger mes fichiers ?',
    answer: "Immédiatement après votre paiement, vous recevrez un email avec les liens de téléchargement. Les liens restent actifs pendant 30 jours.",
    icon: Download,
    color: '#F0B4DF'
  },
  {
    question: 'Puis-je imprimer les fichiers plusieurs fois ?',
    answer: "Oui ! Une fois acheté, vous pouvez l'imprimer autant de fois que vous le souhaitez pour votre usage personnel.",
    icon: RefreshCw,
    color: '#BBBBFF'
  },
  {
    question: 'Ai-je le droit de vendre mes impressions ?',
    answer: "Les fichiers sont pour usage personnel uniquement. Contactez-moi pour discuter d'une licence commerciale.",
    icon: Scale,
    color: '#F0B4DF'
  },
  {
    question: 'Quelle imprimante 3D me conseillez-vous ?',
    answer: "Mes modèles fonctionnent avec la plupart des imprimantes FDM. Une Ender 3, Prusa Mini ou Bambu Lab A1 est parfaite pour commencer.",
    icon: Printer,
    color: '#BBBBFF'
  },
  {
    question: "Quels réglages d'impression ?",
    answer: "Hauteur de couche 0.2mm, remplissage 15-20%. Pour un effet glossy, utilisez du PLA silk. Chaque produit inclut des recommandations spécifiques.",
    icon: Settings,
    color: '#F0B4DF'
  },
  {
    question: 'Puis-je obtenir un remboursement ?',
    answer: "En raison de la nature digitale des produits, les remboursements ne sont pas possibles sauf en cas de problème technique.",
    icon: RefreshCw,
    color: '#BBBBFF'
  },
  {
    question: 'Comment me contacter ?',
    answer: "Par email à hello@popcharms.com. Je réponds généralement dans les 24-48h.",
    icon: Mail,
    color: '#F0B4DF'
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="pt-16 min-h-screen">
      <div className="bg-[#f8f6f3]">
        <div className="max-w-6xl mx-auto px-6 py-14 md:py-20 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl md:text-5xl text-[#190933] mb-3 tracking-tight" style={{ fontWeight: 300 }}>
              FAQ
            </h1>
            <p className="text-sm text-[#8a8290]">Questions fréquentes</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const Icon = faq.icon;
            const isOpen = openIndex === index;
            const isHovered = hoveredIndex === index;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
                onHoverStart={() => setHoveredIndex(index)}
                onHoverEnd={() => setHoveredIndex(null)}
                className="relative"
              >
                <motion.div
                  animate={{
                    scale: isOpen ? 1.02 : 1,
                  }}
                  transition={{ duration: 0.2 }}
                  className={`bg-white rounded-xl border transition-all duration-300 overflow-hidden ${
                    isOpen 
                      ? 'border-[#190933]/20 shadow-lg' 
                      : 'border-gray-200 shadow-sm hover:shadow-md'
                  }`}
                >
                  {/* Colored accent bar */}
                  <motion.div
                    className="absolute top-0 left-0 w-1 h-full"
                    style={{ backgroundColor: faq.color }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: isOpen || isHovered ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                  />

                  <button
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    className="w-full p-5 flex items-center gap-4 text-left"
                  >
                    {/* Icon */}
                    <motion.div
                      animate={{
                        rotate: isOpen ? 360 : 0,
                        scale: isOpen || isHovered ? 1.1 : 1
                      }}
                      transition={{ duration: 0.4 }}
                      className="flex-shrink-0"
                    >
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-300"
                        style={{ 
                          backgroundColor: isOpen || isHovered ? `${faq.color}20` : '#f8f6f3'
                        }}
                      >
                        <Icon 
                          className="w-5 h-5 transition-colors duration-300" 
                          style={{ color: isOpen || isHovered ? faq.color : '#8a8290' }}
                          strokeWidth={1.5}
                        />
                      </div>
                    </motion.div>

                    {/* Question */}
                    <span 
                      className="flex-1 text-sm transition-colors duration-300" 
                      style={{ 
                        fontWeight: 500,
                        color: isOpen ? '#190933' : '#190933'
                      }}
                    >
                      {faq.question}
                    </span>

                    {/* Chevron */}
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronDown
                        className="w-5 h-5 transition-colors duration-300"
                        style={{ color: isOpen ? faq.color : '#8a8290' }}
                        strokeWidth={1.5}
                      />
                    </motion.div>
                  </button>

                  {/* Answer with smooth animation */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                      >
                        <motion.div 
                          className="px-5 pb-5 pl-[76px]"
                          initial={{ y: -10 }}
                          animate={{ y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <p className="text-sm text-[#8a8290]" style={{ lineHeight: 1.8 }}>
                            {faq.answer}
                          </p>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Enhanced contact section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16"
        >
          <div className="bg-gradient-to-br from-[#BBBBFF]/10 to-[#F0B4DF]/10 rounded-2xl p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-block mb-4"
            >
              <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center shadow-md">
                <Mail className="w-8 h-8 text-[#BBBBFF]" strokeWidth={1.5} />
              </div>
            </motion.div>
            
            <h3 className="text-lg text-[#190933] mb-2" style={{ fontWeight: 500 }}>
              Besoin d&apos;aide ?
            </h3>
            <p className="text-sm text-[#8a8290] mb-5" style={{ lineHeight: 1.7 }}>
              Vous avez d&apos;autres questions ? N&apos;hésitez pas à me contacter.
              <br />
              Je réponds généralement dans les 24-48h.
            </p>
            <motion.a
              href="mailto:hello@popcharms.com"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-block bg-white text-[#190933] px-6 py-3 rounded-lg text-sm border border-gray-200 hover:border-[#BBBBFF] hover:shadow-md transition-all duration-300"
              style={{ fontWeight: 500 }}
            >
              hello@popcharms.com
            </motion.a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}