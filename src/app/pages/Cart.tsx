import { Link } from "react-router";
import { ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "../context/CartContext";
import { categories, money, stlImage } from "../data/products";
import { toast } from "sonner";
import { Arrow } from "../components/Arrow";
export function Cart() {
  const { items, total, removeFromCart, addToCart } = useCart();
  return (
    <div className="container page">
      <div className="page-heading">
        <p className="eyebrow">Your selection</p>
        <h1>
          Your cart<span className="heading-dot">.</span>
        </h1>
        <p>
          {items.length
            ? `${items.length} model${items.length > 1 ? "s" : ""} to make your own.`
            : "Your next print starts here."}
        </p>
      </div>
      {!items.length ? (
        <div className="empty-state">
          <ShoppingBag size={38} />
          <h2>Your cart is a blank canvas.</h2>
          <p>Explore the collection and find your next model to print.</p>
          <Link className="button" to="/shop">
            See the collection <Arrow />
          </Link>
        </div>
      ) : (
        <div className="checkout-grid">
          <div>
            <div className="cart-table-heading">
              <span>Model</span>
              <span>Price</span>
            </div>
            {items.map(({ product }) => (
              <article className="cart-row" key={product.id}>
                <Link to={`/product/${product.id}`}>
                  {stlImage(product, 480) ? (
                    <img src={stlImage(product, 480)!} alt={product.name} />
                  ) : (
                    <span className="media-empty" aria-hidden="true" />
                  )}
                </Link>
                <div>
                  <span className="eyebrow">
                    {categories[product.category]}
                  </span>
                  <h2>
                    <Link to={`/product/${product.id}`}>{product.name}</Link>
                  </h2>
                  <p className="small muted">Digital STL · Personal licence</p>
                  <button
                    className="remove-button"
                    onClick={() => {
                      removeFromCart(product.id);
                      toast("Model removed", {
                        action: {
                          label: "Undo",
                          onClick: () => addToCart(product),
                        },
                      });
                    }}
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </div>
                <strong>{money(product.price)}</strong>
              </article>
            ))}
            <Link className="text-link back-link" to="/shop">
              Back to the collection <Arrow />
            </Link>
          </div>
          <aside className="order-summary">
            <h2>Your order</h2>
            <div className="summary-line">
              <span>Subtotal</span>
              <span>{money(total)}</span>
            </div>
            <div className="summary-line">
              <span>Digital delivery</span>
              <span>No shipping fees</span>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <strong>{money(total)}</strong>
            </div>
            <Link to="/checkout" className="button full">
              Checkout <Arrow />
            </Link>
            <p className="small muted">
              One copy of each file. No physical items or shipping fees.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
