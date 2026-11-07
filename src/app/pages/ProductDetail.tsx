import { CatstarDetail } from "./CatstarDetail";
import { Link, useParams } from "react-router";
import { Check, Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { products, categories, money, stlImage } from "../data/products";
import { useCart } from "../context/CartContext";
import { PinCard } from "../components/PinCard";
import { NotFound } from "./NotFound";
import { Arrow } from "../components/Arrow";
export function ProductDetail() {
  const { id } = useParams();
  const product = products.find((p) => p.id === id);
  const { items, addToCart } = useCart();
  if (["catstar-test", "amulet", "bunny", "kero", "kitty"].includes(id ?? ""))
    return <CatstarDetail />;
  if (!product) return <NotFound />;
  const added = items.some((i) => i.product.id === id);
  return (
    <div className="container page product-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/shop">All STL files</Link>
        <span>/</span>
        <span>{categories[product.category]}</span>
        <span>/</span>
        <span>{product.name}</span>
      </nav>
      <div className="product-detail">
        <div className="detail-image">
          {stlImage(product) ? (
            <img src={stlImage(product)!} alt={product.name} />
          ) : (
            <span className="media-empty" aria-hidden="true" />
          )}
          {stlImage(product) && <span className="file-tag">Preview · Digital STL</span>}
        </div>
        <div className="detail-copy">
          <p className="eyebrow">
            {categories[product.category]} · Digital STL
          </p>
          <h1>{product.name}</h1>
          <p className="detail-price">{money(product.price)}</p>
          <p>
            {product.description}. Print it in your own choice of material and
            colour.
          </p>
          <div className="digital-notice">
            <Download size={21} />
            <div>
              <strong>Digital STL file. Yours to print.</strong>
              <p>
                No physical item will be shipped. Preview colours and finishes
                are not included in the STL file.
              </p>
            </div>
          </div>
          <div className="product-actions">
            <Link
              className="button full buy-now"
              to={`/checkout?buy=${product.id}`}
            >
              Buy now · {money(product.price)}
              <Arrow />
            </Link>
            <button
              className="button secondary full"
              disabled={added}
              onClick={() => {
                addToCart(product);
                toast.success("Added to your cart", {
                  description: product.name,
                });
              }}
            >
              {added ? <Check size={18} /> : <Plus size={18} />}
              {added ? "Added to cart" : "Add to cart"}
            </button>
          </div>
          <p className="small muted">
            No account needed. Continue to secure payment with Stripe.
          </p>
          <section className="included-files">
            <h2>What’s included</h2>
            <div>
              <span>01 / STL model file</span>
              <span>{product.fileSize}</span>
            </div>
            <p>
              Personal-use licence. A 3D printer and compatible slicing software
              are required.
            </p>
          </section>
          <details className="accordion" open>
            <summary>Print specifications</summary>
            <dl className="spec-list">
              <div>
                <dt>Format</dt>
                <dd>STL</dd>
              </div>
              <div>
                <dt>Listed file size</dt>
                <dd>{product.fileSize}</dd>
              </div>
              <div>
                <dt>Estimated print time</dt>
                <dd>{product.printTime}</dd>
              </div>
              <div>
                <dt>Licence</dt>
                <dd>Personal use</dd>
              </div>
            </dl>
            <p>
              Check scale, orientation and support settings in your slicer.
              Print time depends on your printer and settings. Dimensions and
              support requirements have not yet been supplied.
            </p>
          </details>
          <details className="accordion">
            <summary>Downloads & help</summary>
            <p>
              Download links appear on your order page after payment is
              verified. Keep the private order link and back up your files. Need
              help?{" "}
              <Link className="text-link" to="/custom">
                Contact the studio
              </Link>
              .
            </p>
          </details>
          <p className="small">
            <Link className="text-link" to="/terms">
              Licence & terms
            </Link>
          </p>
        </div>
      </div>
      <section className="section">
        <div className="section-heading">
          <h2>More to print</h2>
          <Link className="text-link" to="/shop">
            All STL files <Arrow />
          </Link>
        </div>
        <div className="pin-board">
          {[
            ...products.filter(
              (p) => p.id !== id && p.category === product.category,
            ),
            ...products.filter(
              (p) => p.id !== id && p.category !== product.category,
            ),
          ]
            .slice(0, 8)
            .map((p, index) => (
              <PinCard key={p.id} product={p} index={index} />
            ))}
        </div>
      </section>
    </div>
  );
}
