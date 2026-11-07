import { Link, useParams } from "react-router";
import { Plus, Check } from "lucide-react";
import { products, money, categories, previewImage } from "../data/products";
import { PinCard } from "../components/PinCard";
import { useCart } from "../context/CartContext";
import { Arrow } from "../components/Arrow";
export function CatstarDetail() {
  const { id = "catstar-test" } = useParams();
  const { items, addToCart } = useCart();
  const product = products.find((p) => p.id === id);
  if (!product)
    return (
      <section className="portal-home">
        <h1>This object is resting.</h1>
        <Link to="/shop">All STL files</Link>
      </section>
    );
  const added = items.some((i) => i.product.id === product.id);
  return (
    <section className="object-detail">
      <Link className="object-back" to="/shop">
        <Arrow direction="left" /> All STL files
      </Link>
      <div className="object-columns">
        <div className="object-gallery">
          <div className="object-photo">
            {/* Front view only, like every other model. */}
            <img
              src={previewImage(product)}
              alt={`${product.name}, preview rendered from the STL`}
            />
          </div>
        </div>
        <div className="object-copy">
          <p className="eyebrow">{categories[product.category]} · Digital STL</p>
          <h1>{product.name}</h1>
          <p className="object-price">{money(product.price)}</p>

          <Link className="object-buy" to={`/checkout?buy=${product.id}`}>
            Buy now{" "}
            <span>
              {money(product.price)} <Arrow />
            </span>
          </Link>
          <button
            className="object-cart"
            disabled={added}
            onClick={() => addToCart(product)}
          >
            {added ? <Check size={16} /> : <Plus size={16} />}{" "}
            {added ? "Added to your bag" : "Add to bag"}
          </button>
          <p className="object-disclaimer">
            Digital STL · Personal use. No physical item. Preview colour is for illustration only.
          </p>
          <details>
            <summary>The file</summary>
            <p>
              STL · {product.fileSize || "Digital download"} · Personal-use
              licence. Check orientation, scale and supports in your slicer.
            </p>
          </details>
          <details>
            <summary>Getting your object</summary>
            <p>
              After payment confirmation, download your STL from the order page.
              Your private access link is also sent by email when delivery
              emails are enabled.
            </p>
          </details>
          <Link className="object-terms" to="/terms">
            Licence & terms <Arrow size={14} />
          </Link>
        </div>
      </div>
      <section className="more-pins" aria-labelledby="more-pins-title">
        <h2 id="more-pins-title">More to print</h2>
        <div className="pin-board">
          {products
            .filter((p) => p.id !== product.id)
            .slice(0, 8)
            .map((p, index) => (
              <PinCard key={p.id} product={p} index={index} />
            ))}
        </div>
      </section>
    </section>
  );
}
