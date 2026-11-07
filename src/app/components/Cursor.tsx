import { useEffect, useState } from "react";
import { motion, useMotionValue } from "motion/react";

// Transparent 1x1 image cursor, with "none" as fallback (see system.css).
const BLANK_CURSOR = 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABpfZFQAAAAABJRU5ErkJggg==") 0 0, none';

/**
 * A small dot that sits exactly on the pointer and grows into a labelled disc over
 * anything marked with data-cursor="Label". Mouse and trackpad only; touch
 * screens and reduced-motion users keep the system cursor.
 */
export function Cursor() {
  const [enabled] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [label, setLabel] = useState<string | null>(null);
  const [hidden, setHidden] = useState(true);
  const [pressed, setPressed] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.classList.add("has-cursor");
    // Inline too: some browsers (Safari) only re-read the cursor on the root.
    root.style.setProperty("cursor", BLANK_CURSOR, "important");
    document.body.style.setProperty("cursor", BLANK_CURSOR, "important");
    let px = -100;
    let py = -100;
    const pick = (el: Element | null) =>
      setLabel(el?.closest?.("[data-cursor]")?.getAttribute("data-cursor") ?? null);
    const move = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      x.set(px);
      y.set(py);
      setHidden(false);
      pick(e.target as Element | null);
    };
    // Content moves under a still pointer while scrolling; re-read what is below it.
    const scroll = () => pick(document.elementFromPoint(px, py));
    const leave = () => setHidden(true);
    const down = () => setPressed(true);
    const up = () => setPressed(false);
    window.addEventListener("pointermove", move);
    // When the window loses focus the system pointer can come back (devtools,
    // another app on top): hide the dot so the two never show together.
    window.addEventListener("blur", leave);
    window.addEventListener("scroll", scroll, { passive: true });
    document.addEventListener("pointerleave", leave);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    return () => {
      root.classList.remove("has-cursor");
      root.style.removeProperty("cursor");
      document.body.style.removeProperty("cursor");
      window.removeEventListener("blur", leave);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", scroll);
      document.removeEventListener("pointerleave", leave);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;
  return (
    <motion.div
      className={`cursor ${label ? "has-label" : ""}`}
      // Follows the pointer exactly: no smoothing, so it never trails behind.
      style={{ x, y }}
      animate={{ opacity: hidden ? 0 : 1, scale: pressed ? 0.85 : 1 }}
      transition={{ duration: 0.2 }}
      aria-hidden="true"
    >
      <motion.span
        className="cursor-disc"
        animate={{ width: label ? 76 : 10, height: label ? 76 : 10 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        <motion.span animate={{ opacity: label ? 1 : 0 }}>{label}</motion.span>
      </motion.span>
    </motion.div>
  );
}
