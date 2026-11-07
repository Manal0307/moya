import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { Search } from "lucide-react";
import { categories, isCutout, products } from "../data/products";
import { PinCard } from "../components/PinCard";
import { Star } from "../components/Star";

// Board of every STL file in equal squares, filterable by category and name.
export function Shop() {
  const [params, setParams] = useSearchParams();
  const active = params.get("category") ?? "all";
  const query = params.get("q") ?? "";

  const present = useMemo(
    () => Object.keys(categories).filter((c) => products.some((p) => p.category === c)),
    [],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => active === "all" || p.category === active)
      .filter((p) => !q || `${p.name} ${p.description}`.toLowerCase().includes(q))
      // Real STL renders lead the board; photo listings follow.
      .sort((a, b) => Number(isCutout(b)) - Number(isCutout(a)));
  }, [active, query]);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  return (
    <div className="shop">
      <header className="shop-head">
        <div>
          <p className="eyebrow shop-count">
            {shown.length} STL {shown.length === 1 ? "file" : "files"}
          </p>
          <h1>
            The collection.
            <br />
            <span className="ab-title-soft">Pick your charm.</span>
            <span className="ab-star" aria-hidden="true">
              <Star variant={1} />
            </span>
          </h1>
        </div>
        <p className="shop-intro">
          Choose a file, download it, print it at home. Every model comes with a
          personal-use licence.
        </p>
      </header>

      <div className="shop-tools">
        <div className="shop-filters" role="group" aria-label="Category">
          {["all", ...present].map((c) => (
            <button
              key={c}
              aria-pressed={active === c}
              onClick={() => update("category", c)}
            >
              {c === "all" ? "All" : categories[c]}
            </button>
          ))}
        </div>
        <label className="shop-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search STL files</span>
          <input
            type="search"
            placeholder="Search"
            value={query}
            onChange={(e) => update("q", e.target.value)}
          />
        </label>
      </div>

      {shown.length ? (
        <div className="pin-board">
          {shown.map((product, index) => (
            <PinCard key={product.id} product={product} index={index} />
          ))}
        </div>
      ) : (
        <p className="shop-empty">
          Nothing matches “{query}”.{" "}
          <button className="text-link" onClick={() => setParams({})}>
            Clear filters
          </button>
        </p>
      )}
    </div>
  );
}
