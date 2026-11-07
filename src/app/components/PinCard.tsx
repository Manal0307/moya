import { Link } from "react-router";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { motion, useReducedMotion } from "motion/react";
import { Product } from "../types";
import { useCart } from "../context/CartContext";
import { categories, money, previewSrcSet, stlImage } from "../data/products";

export function PinCard({ product, index }: { product: Product; index: number }) {
  const { items, addToCart } = useCart();
  const added = items.some((item) => item.product.id === product.id);
  const image = stlImage(product, 480);
  const reduce = useReducedMotion();

  return (
    <motion.article
      className="pin"
      initial={reduce ? false : { opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: (index % 4) * 0.07 }}
    >
      <Link
        to={`/product/${product.id}`}
        className={`pin-media ${image ? "is-cutout" : "is-empty"}`}
        aria-label={`View ${product.name}`}
        data-cursor="View"
      >
        {image && (
          <img
            src={image}
            srcSet={previewSrcSet(product)}
            sizes="(max-width: 600px) 50vw, (max-width: 1100px) 33vw, 25vw"
            alt=""
            loading={index < 6 ? "eager" : "lazy"}
            draggable={false}
          />
        )}
        <span className="pin-view" aria-hidden="true">
          View
        </span>
      </Link>
      <button
        className="pin-add"
        disabled={added}
        aria-label={added ? `${product.name} is in your bag` : `Add ${product.name} to bag`}
        onClick={() => {
          addToCart(product);
          toast.success("Added to your bag", { description: product.name });
        }}
      >
        {added ? <Check size={16} /> : <Plus size={16} />}
      </button>
      <div className="pin-meta">
        <Link to={`/product/${product.id}`} className="pin-name">
          {product.name}
        </Link>
        <span className="pin-price">{money(product.price)}</span>
        <span className="pin-kind">{categories[product.category]} · STL</span>
      </div>
    </motion.article>
  );
}
