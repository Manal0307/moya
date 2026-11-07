import { Product } from "../types";
import charmBunny from "../../assets/2575b3f2cc3c6ff004740f01bd56cb1ec02f4ce4.png";
import charmCat from "../../assets/9926b4e8a713b52cf81185a7c104c193c5283829.png";
import charmKitty from "../../assets/ecdb900658fc77f5565057733a8a559582612484.png";
import charmSilver from "../../assets/65d0a4941277e1c922b34b26655ab8bd2259317c.png";
import catalog from "./catalog.json";
const images: Record<string, string> = {
  charmBunny,
  charmCat,
  charmKitty,
  charmSilver,
};
export let products: Product[] = catalog.map((p) => ({
  ...p,
  category: p.category as Product["category"],
  image: images[p.image] ?? p.image,
}));
export const categories: Record<string, string> = {
  charm: "Charms",
  keychain: "Keychains",
  "art-toy": "Art toys",
  decoration: "Decor",
};
// STL listings show the smooth-shaded render (scripts/render-stl-smooth.py),
// served as WebP made by scripts/optimize-previews.py: 480 px for cards,
// 1200 px for large views. The 1600 px PNG masters are never sent to visitors.
// The Catstar listing still points at a placeholder, so it is mapped by id.
export type PreviewSize = 480 | 1200;
export const renderSrc = (name: string, size: PreviewSize = 1200) =>
  `/previews/smooth/${name}-${size}.webp`;
export const previewImage = (product: Product, size: PreviewSize = 1200) => {
  if (product.id === "catstar-test") return renderSrc("catstar", size);
  const render = product.image.match(/^\/previews\/([\w-]+)\.png$/);
  return render ? renderSrc(render[1], size) : product.image;
};
// srcset pair so cards stay sharp on high-density screens.
export const previewSrcSet = (product: Product) =>
  `${previewImage(product, 480)} 480w, ${previewImage(product, 1200)} 1200w`;
// The image to show for a product: its STL render, or null when there is no
// real STL render yet (photo placeholders are not shown; the empty stage is).
export const stlImage = (product: Product, size: PreviewSize = 1200) =>
  isCutout(product) ? previewImage(product, size) : null;
// Renders from the STL files are transparent cut-outs; everything else is a photo.
export const isCutout = (product: Product) =>
  previewImage(product).startsWith("/previews/");
export const money = (amount: number) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
    amount,
  );

// Load the server catalogue before mounting so prices and archived products reflect admin changes.
export async function loadPublicCatalogue() {
  try {
    const response = await fetch("/api/catalog", {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return;
    const data = await response.json();
    if (!Array.isArray(data.products)) return;
    products = data.products.map((p: Product) => ({
      ...p,
      image: images[p.image] ?? p.image,
    }));
    for (const product of products) {
      if (!categories[product.category])
        categories[product.category] = product.category.replace(/-/g, " ");
    }
  } catch {
    /* Keep the static browsing catalogue during API downtime; checkout is server validated. */
  }
}
