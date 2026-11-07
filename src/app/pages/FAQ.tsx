import { useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CONTACT_EMAIL } from "../data/contact";
import { Star } from "../components/Star";
import { Arrow } from "../components/Arrow";

const EASE = [0.22, 1, 0.36, 1] as const;

export const faqs = [
  [
    "What am I buying?",
    "A digital STL file describing a three-dimensional shape. No physical object or printer is included. Preview textures and colours illustrate the model.",
  ],
  [
    "How do I download my file?",
    "After payment is verified, download buttons appear on your order page. Bookmark that private page and back up your files.",
  ],
  [
    "Can I print a model more than once?",
    "Yes, for personal use. One copy of the file is enough, so each model can only appear once in a single order.",
  ],
  [
    "What do I need to print?",
    "A 3D printer and STL-compatible slicing software, or a printing service. Settings and supports depend on your equipment, material and chosen scale.",
  ],
  [
    "Can I sell the files or physical prints?",
    "The collection is offered for personal use. For commercial use, contact the studio before buying to discuss the required permission.",
  ],
  [
    "What if my payment is interrupted?",
    "Your cart is preserved. Return to checkout to try again. If you believe you have been charged, check your order page and contact the studio before paying again.",
  ],
  [
    "How do I get help with a file?",
    `Use the contact form or write to ${CONTACT_EMAIL} with the model name and your payment reference. Never send card or banking details.`,
  ],
  [
    "Can I request a custom model?",
    "Yes. Describe your idea, its intended use and dimensions in the contact form. Scope, price and timing will be agreed before work begins.",
  ],
];

export function FAQ() {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState<number | null>(0);
  const rise = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, ease: EASE, delay: 0.05 + i * 0.07 },
        };

  return (
    <div className="container page narrow faq-page">
      <div className="page-heading">
        <motion.p className="eyebrow" {...rise(0)}>
          A little guidance
        </motion.p>
        <motion.h1 {...rise(1)}>
          A few questions,
          <br />
          <em>answered.</em>
          <span className="faq-star" aria-hidden="true">
            <Star variant={2} />
          </span>
        </motion.h1>
        <motion.p {...rise(2)}>
          The essentials for choosing, downloading and printing your model.
        </motion.p>
      </div>

      <div className="faq-list">
        {faqs.map(([q, a], i) => {
          const isOpen = open === i;
          const id = `faq-${i}`;
          return (
            <motion.div
              className={`faq-item ${isOpen ? "is-open" : ""}`}
              key={q}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -6% 0px" }}
              transition={{ duration: 0.6, ease: EASE, delay: Math.min(i, 6) * 0.05 }}
            >
              <h2 className="faq-question">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={id}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span className="faq-index">{String(i + 1).padStart(2, "0")}</span>
                  <span className="faq-q">{q}</span>
                  <motion.span
                    className="faq-icon"
                    aria-hidden="true"
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ type: "spring", stiffness: 380, damping: 26 }}
                  >
                    +
                  </motion.span>
                </button>
              </h2>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={id}
                    role="region"
                    className="faq-answer"
                    initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                    exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.45, ease: EASE }}
                  >
                    <p>{a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        className="help-block"
        initial={reduce ? false : { opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <h2>Still wondering?</h2>
        <p>
          Tell us what you need help with, or write to{" "}
          <a className="text-link" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
        <Link className="button" to="/contact">
          Contact the studio <Arrow />
        </Link>
      </motion.div>
    </div>
  );
}
