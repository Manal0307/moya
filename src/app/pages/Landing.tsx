import { Fragment, useRef } from "react";
import { Link } from "react-router";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from "motion/react";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { products, money, isCutout } from "../data/products";
import { useCart } from "../context/CartContext";
import { PinCard } from "../components/PinCard";
import { Star } from "../components/Star";
import { Model3D } from "../components/Model3D";
import { Arrow } from "../components/Arrow";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Landing() {
  // Real STL renders only; Catstar already leads the hero.
  const ready = products.filter((p) => isCutout(p) && p.id !== "catstar-test").slice(0, 4);

  return (
    <div className="home">
      <Hero />
      <Facts />
      <ReadyToPrint items={ready} />
      <HowItWorks />
      <Statement />
    </div>
  );
}

/* ---------- 1. Hero: real-time 3D model over a drifting wordmark ---------- */
function Hero() {
  const reduce = useReducedMotion();
  const { items, addToCart } = useCart();
  const catstar = products.find((p) => p.id === "catstar-test");
  const inBag = items.some((i) => i.product.id === "catstar-test");
  return (
    <section className="home-hero">
      <Marquee text="Tokki Pocket" />

      {/* Three light-grey stars in the background, framing the cat. */}
      <div className="hero-bg-stars" aria-hidden="true">
        <span className="hero-bg-star hero-bg-star-a">
          <Star variant={1} />
        </span>
        <span className="hero-bg-star hero-bg-star-b">
          <Star variant={3} />
        </span>
        <span className="hero-bg-star hero-bg-star-c">
          <Star variant={2} />
        </span>
      </div>

      <h1 className="sr-only">Tokki Pocket, Catstar</h1>

      <motion.div
        className="hero-object"
        initial={reduce ? false : { opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, ease: EASE, delay: 0.3 }}
      >
        <div className="hero-stage">
          <Model3D
            src="/models/catstar.mesh"
            poster="/previews/smooth/catstar-1200.webp"
            label="Catstar, a cat-head charm, in 3D"
          />
        </div>
      </motion.div>

      <motion.div
        className="hero-caption"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE, delay: 1 }}
      >
        <div className="hero-product">
          <Link to="/product/catstar-test" className="hero-name" data-cursor="View">
            Catstar
          </Link>
          <span>Digital STL file · Personal-use licence</span>
        </div>
        {catstar && (
          <div className="hero-buy">
            <span className="hero-price">{money(catstar.price)}</span>
            <button
              className="button secondary"
              disabled={inBag}
              onClick={() => {
                addToCart(catstar);
                toast.success("Added to your bag", { description: catstar.name });
              }}
            >
              {inBag ? <Check size={16} /> : <Plus size={16} />}
              {inBag ? "In your bag" : "Add to bag"}
            </button>
            <Link className="button" to="/checkout?buy=catstar-test">
              Buy now <Arrow />
            </Link>
          </div>
        )}
      </motion.div>
    </section>
  );
}

// Giant wordmark drifting behind the object; scrolling speeds it up.
function Marquee({ text }: { text: string }) {
  const reduce = useReducedMotion();
  const base = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 300 });
  const boost = useTransform(velocity, [-2000, 0, 2000], [-6, 0, 6], { clamp: false });
  const x = useTransform(base, (v) => `${((v % 50) + 50) % 50 - 50}%`);

  useAnimationFrame((_, delta) => {
    if (reduce) return;
    base.set(base.get() + (0.6 + Math.abs(boost.get())) * (delta / 1000));
  });

  return (
    <div className="hero-marquee" aria-hidden="true">
      <motion.div className="hero-marquee-track" style={{ x }}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i}>{text}</span>
        ))}
      </motion.div>
    </div>
  );
}

/* ---------- 2. Facts: what you get, before anything else ---------- */
const FACTS = [
  ["Instant download", "Your STL is on your order page as soon as payment is confirmed."],
  ["Secure payment", "No account needed. Checkout runs on Stripe."],
  ["Personal-use licence", "Print it as often as you like for yourself."],
  ["Nothing is shipped", "A digital file for your own 3D printer and slicer."],
];

function Facts() {
  return (
    <section className="facts" aria-label="What you get">
      {FACTS.map(([title, text], i) => (
        <motion.div
          key={title}
          className="fact"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -10% 0px" }}
          transition={{ duration: 0.7, ease: EASE, delay: i * 0.08 }}
        >
          <h3>{title}</h3>
          <p>{text}</p>
        </motion.div>
      ))}
    </section>
  );
}

/* ---------- 3. Ready to print: buyable products ---------- */
function ReadyToPrint({ items }: { items: typeof products }) {
  return (
    <section className="ready" aria-labelledby="ready-title">
      <header className="section-row">
        <h2 id="ready-title">Ready to print</h2>
        <Link className="button secondary" to="/shop">
          Shop all STL files <Arrow />
        </Link>
      </header>
      <div className="pin-board">
        {items.map((product, index) => (
          <PinCard key={product.id} product={product} index={index} />
        ))}
      </div>
    </section>
  );
}

/* ---------- 4. How it works ---------- */
const STEPS = [
  ["Choose", "Pick a model in the shop. Every file is a ready-to-slice STL."],
  ["Pay", "Check out securely with Stripe, no account required."],
  ["Print", "Download from your order page, slice it, print it in any colour."],
];

function HowItWorks() {
  return (
    <section className="steps" aria-labelledby="steps-title">
      <h2 id="steps-title">How it works</h2>
      <ol>
        {STEPS.map(([title, text], i) => (
          <motion.li
            key={title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -10% 0px" }}
            transition={{ duration: 0.7, ease: EASE, delay: i * 0.1 }}
          >
            <span className="step-index">0{i + 1}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </motion.li>
        ))}
      </ol>
      <Link className="button" to="/shop">
        Find your model <Arrow />
      </Link>
    </section>
  );
}

/* ---------- 5. Statement: words (and little stars) ink in as you scroll ---------- */
// "*N" places hand-drawn star variant N between words.
const STATEMENT =
  "Tokki Pocket *0 turns little characters into charms you print yourself. *2 Pick a file, download it right after payment *3 and print it at home in any colour you like. *1";
const STATEMENT_TEXT = STATEMENT.replace(/ \*\d/g, "");
// Each star gets its own tilt and size so the row feels hand placed.
const STAR_LOOK = [
  { rotate: -12, size: 0.78 },
  { rotate: 14, size: 0.62 },
  { rotate: 8, size: 0.86 },
  { rotate: -20, size: 0.7 },
];

function Statement() {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.9", "end 0.75"] });
  const tokens = STATEMENT.split(" ");
  return (
    <section className="statement">
      <p ref={ref} aria-label={STATEMENT_TEXT}>
        {tokens.map((token, i) => {
          if (/^\*\d$/.test(token)) return null; // rendered with the word before it
          const range = (k: number): [number, number] => [k / tokens.length, (k + 1) / tokens.length];
          const star = tokens[i + 1]?.match(/^\*(\d)$/);
          if (!star)
            return (
              <Word key={i} progress={scrollYProgress} range={range(i)}>
                {token}
              </Word>
            );
          // Keep a star on the same line as its word: never alone after a wrap.
          return (
            <Fragment key={i}>
              <span className="statement-pair">
                <Word progress={scrollYProgress} range={range(i)} trailingSpace={false}>
                  {token}
                </Word>
                <InlineStar variant={Number(star[1])} progress={scrollYProgress} range={range(i + 1)} />
              </span>{" "}
            </Fragment>
          );
        })}
      </p>
      <div className="statement-cta">
        <Link className="button" to="/shop">
          Shop all STL files <Arrow />
        </Link>
        <Link className="button secondary" to="/faq">
          Questions? Read the FAQ
        </Link>
      </div>
    </section>
  );
}

function Word({
  children,
  progress,
  range,
  trailingSpace = true,
}: {
  children: string;
  progress: MotionValue<number>;
  range: [number, number];
  trailingSpace?: boolean;
}) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <motion.span aria-hidden="true" style={{ opacity }}>
      {children}
      {trailingSpace ? " " : ""}
    </motion.span>
  );
}

// A star that pops in (scale and a little spin) as its place in the text is reached.
function InlineStar({
  variant,
  progress,
  range,
}: {
  variant: number;
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const look = STAR_LOOK[variant % STAR_LOOK.length];
  const opacity = useTransform(progress, range, [0.14, 1]);
  const scale = useTransform(progress, range, [0.4, 1]);
  const rotate = useTransform(progress, range, [look.rotate - 40, look.rotate]);
  return (
    <motion.span
      className="statement-star"
      aria-hidden="true"
      style={{ opacity, scale, rotate, fontSize: `${look.size}em` }}
    >
      <Star variant={variant} />
    </motion.span>
  );
}
