import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { CartItem, Product } from "../types";
import { products } from "../data/products";
interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  removePurchased: (ids: string[]) => void;
  total: number;
  itemCount: number;
}
const CartContext = createContext<CartContextType | undefined>(undefined);
function restore(value: string | null): CartItem[] {
  try {
    const parsed = JSON.parse(value ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const ids = new Set(
      parsed.map((i) => (typeof i === "string" ? i : i?.product?.id)),
    );
    return products
      .filter((p) => ids.has(p.id))
      .map((product) => ({ product, quantity: 1 }));
  } catch {
    return [];
  }
}
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      return restore(
        localStorage.getItem("moya-cart") ?? localStorage.getItem("cart"),
      );
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(
        "moya-cart",
        JSON.stringify(items.map((i) => i.product.id)),
      );
    } catch {
      /* Shopping remains available when storage is disabled. */
    }
  }, [items]);
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === "moya-cart") setItems(restore(e.newValue));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const addToCart = useCallback(
    (p: Product) =>
      setItems((prev) =>
        prev.some((i) => i.product.id === p.id)
          ? prev
          : [...prev, { product: p, quantity: 1 }],
      ),
    [],
  );
  const removeFromCart = useCallback(
    (id: string) => setItems((prev) => prev.filter((i) => i.product.id !== id)),
    [],
  );
  const removePurchased = useCallback(
    (ids: string[]) =>
      setItems((prev) => prev.filter((i) => !ids.includes(i.product.id))),
    [],
  );
  const clearCart = useCallback(() => setItems([]), []);
  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        removePurchased,
        clearCart,
        updateQuantity: (id, q) => {
          if (q <= 0) removeFromCart(id);
        },
        total:
          items.reduce((s, i) => s + Math.round(i.product.price * 100), 0) /
          100,
        itemCount: items.length,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("CartProvider missing");
  return context;
}
