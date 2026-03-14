import { motion } from 'motion/react';

export function Terms() {
  const sections = [
    {
      title: '1. Utilisation des fichiers',
      content: 'Les fichiers STL sont destinés à un usage personnel uniquement. Vous pouvez imprimer les fichiers autant de fois que vous le souhaitez, créer des objets pour votre usage personnel et offrir des impressions en cadeau.',
    },
    {
      title: '2. Restrictions',
      content: "Sans licence commerciale, vous ne pouvez pas vendre les fichiers STL, les partager, vendre les objets imprimés, utiliser les modèles à des fins commerciales ou redistribuer les fichiers.",
    },
    {
      title: '3. Téléchargements',
      content: "Les liens de téléchargement sont envoyés par email immédiatement après l'achat. Ils restent actifs pendant 30 jours. Sauvegardez vos fichiers localement.",
    },
    {
      title: '4. Propriété intellectuelle',
      content: "Tous les modèles 3D sont protégés par le droit d'auteur et restent la propriété de PopCharms. L'achat vous donne uniquement une licence d'utilisation personnelle.",
    },
    {
      title: '5. Remboursements',
      content: "En raison de la nature digitale des produits, les remboursements ne sont pas possibles une fois le fichier téléchargé. En cas de problème technique, contactez-nous.",
    },
    {
      title: '6. Licence commerciale',
      content: "Pour un usage commercial, contactez-nous à hello@popcharms.com pour discuter d'une licence adaptée.",
    },
    {
      title: '7. Modifications',
      content: "PopCharms se réserve le droit de modifier ces conditions à tout moment. Les modifications entrent en vigueur dès leur publication.",
    },
    {
      title: '8. Contact',
      content: 'Pour toute question : hello@popcharms.com',
    },
  ];

  return (
    <div className="pt-16 min-h-screen">
      <div className="bg-[#f8f6f3]">
        <div className="max-w-6xl mx-auto px-6 py-14 md:py-20 text-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h1 className="text-3xl md:text-5xl text-[#190933] mb-3 tracking-tight" style={{ fontWeight: 300 }}>
              Conditions
            </h1>
            <p className="text-sm text-[#8a8290]">Dernière mise à jour : Mars 2026</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-8"
        >
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-sm text-[#190933] mb-3" style={{ fontWeight: 500 }}>
                {section.title}
              </h2>
              <p className="text-sm text-[#8a8290]" style={{ lineHeight: 1.7 }}>
                {section.content}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
