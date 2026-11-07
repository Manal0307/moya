import { OpeningIntro } from "./components/OpeningIntro";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { CartProvider } from "./context/CartContext";

export default function App() {
  return (
    <CartProvider>
      <OpeningIntro />
      <RouterProvider router={router} />
    </CartProvider>
  );
}
