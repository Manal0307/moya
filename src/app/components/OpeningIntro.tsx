import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { preloadHome } from "../preload";
// Inlined at build time so the bunny shows instantly and whole.
import bunny from "../../assets/bunny-loader.png?inline";
import "../../styles/opening-intro.css";

const key = "small-things-lab-intro";
const REPLAY = "small-things-lab:replay-intro";

const MIN_MS = 700; // avoids a flash when everything is already cached
const MAX_MS = 10000; // never keep a visitor waiting behind the loader

/** Plays the opening screen again (used by the logo). */
export function replayIntro() {
  window.dispatchEvent(new Event(REPLAY));
}

/**
 * Loading screen: the bunny and a percentage under it, nothing else.
 * The percentage is real: it follows preloadHome(), which loads the fonts,
 * three.js, the Catstar 3D model and the home images. The number eases toward
 * the real value so it never jumps, and the screen lifts once it reaches 100.
 * Shown on the first home visit of a session and whenever the logo is clicked.
 * Click or Escape skips it.
 */
export function OpeningIntro() {
  const reduce = useReducedMotion();
  const [run, setRun] = useState(0);
  const [visible, setVisible] = useState(() => {
    if (window.location.pathname !== "/") return false;
    try {
      return sessionStorage.getItem(key) !== "seen";
    } catch {
      return true;
    }
  });
  const [shown, setShown] = useState(0);
  const target = useRef(0);

  useEffect(() => {
    const replay = () => {
      setRun((n) => n + 1);
      setVisible(true);
    };
    window.addEventListener(REPLAY, replay);
    return () => window.removeEventListener(REPLAY, replay);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    let finished = false;
    let raf = 0;
    let value = 0;
    const started = performance.now();
    target.current = 0;
    setShown(0);

    const close = () => {
      if (finished) return;
      finished = true;
      try {
        sessionStorage.setItem(key, "seen");
      } catch {
        /* Session storage may be disabled. */
      }
      setVisible(false);
    };

    preloadHome((fraction) => {
      target.current = Math.max(target.current, fraction);
    }).then(() => {
      target.current = 1;
    });

    // Ease the displayed number toward the real progress every frame.
    const step = () => {
      value += (target.current * 100 - value) * (reduce ? 1 : 0.12);
      if (target.current >= 1 && 100 - value < 0.5) value = 100;
      setShown(Math.floor(value));
      const elapsed = performance.now() - started;
      if ((value >= 100 && elapsed >= MIN_MS) || elapsed >= MAX_MS) {
        setShown(100);
        window.setTimeout(close, 180);
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", escape);
    window.addEventListener("pointerdown", close);
    return () => {
      finished = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", escape);
      window.removeEventListener("pointerdown", close);
      document.body.style.overflow = previousOverflow;
    };
  }, [visible, run, reduce]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={run}
          className="opening-intro"
          role="progressbar"
          aria-label="Loading Tokki Pocket"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={shown}
          initial={{ opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: "-100%" }}
          transition={{ duration: reduce ? 0.25 : 0.7, ease: [0.7, 0, 0.25, 1] }}
        >
          <div className="opening-center">
            <img className="opening-bunny" src={bunny} alt="" draggable={false} />
            <span className="opening-percent">{shown}%</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
