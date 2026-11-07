import { Information } from "./pages/Information";
import { createBrowserRouter } from "react-router";
import { Admin } from "./pages/Admin";
import { Layout } from "./components/Layout";
import { Landing } from "./pages/Landing";
import { ProductDetail } from "./pages/ProductDetail";
import { Cart } from "./pages/Cart";
import { Checkout } from "./pages/Checkout";
import { About } from "./pages/About";
import { FAQ } from "./pages/FAQ";
import { CustomOrder } from "./pages/CustomOrder";
import { Terms } from "./pages/Terms";
import { NotFound } from "./pages/NotFound";
import { Shop } from "./pages/Shop";

export const router = createBrowserRouter([
  { path: "/admin", Component: Admin },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Landing },
      { path: "shop", Component: Shop },
      { path: "product/:id", Component: ProductDetail },
      { path: "cart", Component: Cart },
      { path: "checkout", Component: Checkout },
      { path: "about", Component: About },
      { path: "faq", Component: FAQ },
      { path: "custom", Component: CustomOrder },
      { path: "contact", Component: CustomOrder },
      { path: "privacy", Component: Information },
      { path: "downloads", Component: Information },
      { path: "terms", Component: Terms },
      { path: "*", Component: NotFound },
    ],
  },
]);
