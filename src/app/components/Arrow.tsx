import { ArrowLeft, ArrowRight } from "lucide-react";

/**
 * The one arrow used on every button and link: a thin straight arrow that
 * nudges in its direction on hover (see .btn-arrow in system.css).
 */
export function Arrow({
  direction = "right",
  size = 16,
}: {
  direction?: "right" | "left";
  size?: number;
}) {
  const Icon = direction === "left" ? ArrowLeft : ArrowRight;
  return (
    <Icon
      className={`btn-arrow btn-arrow-${direction}`}
      size={size}
      strokeWidth={1.6}
      aria-hidden="true"
    />
  );
}
