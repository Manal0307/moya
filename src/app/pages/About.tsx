import { Link } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import { isCutout, products } from "../data/products";
import { CONTACT_EMAIL } from "../data/contact";
import { Arrow } from "../components/Arrow";
import { PinCard } from "../components/PinCard";
import { Star } from "../components/Star";
import "../../styles/studio-pages.css";

const EASE = [0.22, 1, 0.36, 1] as const;

// What / for whom / why: the three questions an About page has to answer.
const POINTS = [
  {
    title: "What",
    text: "Cute charms and keychains, sold as digital STL files. Nothing is shipped: you print them.",
  },
  {
    title: "For whom",
    text: "Anyone with a 3D printer, or access to a printing service near you.",
  },
  {
    title: "Why",
    text: "Little objects with character that you can make in any colour or material you like.",
  },
];

const STEPS = [
  ["Choose", "Pick a model in the shop. Every file is a ready-to-slice STL."],
  ["Pay", "Check out securely with Stripe. No account needed."],
  ["Print", "Download from your order page and print it as often as you like for yourself."],
];

export function About() {
  const reduce = useReducedMotion();
  const collection = products.filter(isCutout);

  // Fade-up as each block scrolls into view.
  const reveal = (delay = 0) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 22 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: "0px 0px -10% 0px" },
          transition: { duration: 0.7, ease: EASE, delay },
        };

  return (
    <div className="studio-page about-page">
      {/* 1. What Tokki Pocket is, and where to go next */}
      <header className="ab-hero">
        <motion.h1 {...reveal(0)}>
          We design it.
          <br />
          <span className="ab-title-soft">You print it.</span>
          <span className="ab-star" aria-hidden="true">
            <Star variant={0} />
          </span>
        </motion.h1>
        <motion.div className="ab-hero-side" {...reveal(0.1)}>
          <p>
            Tokki Pocket designs cute charms and keychains as STL files. You buy
            the file, print it at home and make it yours.
          </p>
          <div className="ab-actions">
            <Link className="button" to="/shop">
              Shop all STL files <Arrow />
            </Link>
            <Link className="button secondary" to="/contact">
              Contact
            </Link>
          </div>
        </motion.div>
      </header>

      {/* 2. What / for whom / why */}
      <section className="ab-points" aria-label="About Tokki Pocket">
        {POINTS.map((point, i) => (
          <motion.div className="ab-point" key={point.title} {...reveal(i * 0.08)}>
            <h2>{point.title}</h2>
            <p>{point.text}</p>
          </motion.div>
        ))}
      </section>

      {/* 3. The collection, buyable right here */}
      <section className="ab-collection" aria-labelledby="ab-collection-title">
        <motion.header className="section-row" {...reveal()}>
          <h2 id="ab-collection-title">The collection</h2>
          <Link className="text-link" to="/shop">
            See all <Arrow />
          </Link>
        </motion.header>
        <div className="pin-board ab-board">
          {collection.map((product, index) => (
            <PinCard key={product.id} product={product} index={index} />
          ))}
        </div>
      </section>

      {/* 4. How it works */}
      <section className="ab-steps" aria-labelledby="ab-steps-title">
        <motion.h2 id="ab-steps-title" {...reveal()}>
          How it works
        </motion.h2>
        <ol>
          {STEPS.map(([title, text], i) => (
            <motion.li key={title} {...reveal(i * 0.08)}>
              <span className="step-index">0{i + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </motion.li>
          ))}
        </ol>
      </section>

      {/* 5. Custom work */}
      <motion.section className="ab-custom" {...reveal()}>
        <div>
          <h2>Have an idea for a custom model?</h2>
          <p>
            Describe it in a message. Scope, price and timing are agreed before
            any work begins. You can also write to{" "}
            <a className="text-link" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>
        <Link className="button" to="/contact">
          Start a custom model <Arrow />
        </Link>
      </motion.section>
    </div>
  );
}
