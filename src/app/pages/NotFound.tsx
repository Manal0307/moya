import { Link } from 'react-router';
import { motion } from 'motion/react';

export function NotFound() {
  return (
    <div className="pt-16 min-h-screen flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        <p className="text-7xl text-[#190933] mb-6" style={{ fontWeight: 200 }}>404</p>
        <h1 className="text-xl text-[#190933] mb-3" style={{ fontWeight: 400 }}>Page non trouvée</h1>
        <p className="text-sm text-[#8a8290] mb-8">
          Cette page n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          to="/"
          className="text-sm text-[#190933] underline underline-offset-4 hover:opacity-60 transition-opacity"
        >
          Retour à l&apos;accueil
        </Link>
      </motion.div>
    </div>
  );
}
