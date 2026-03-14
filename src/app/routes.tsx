import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { Shop } from './pages/Shop';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { About } from './pages/About';
import { FAQ } from './pages/FAQ';
import { CustomOrder } from './pages/CustomOrder';
import { Terms } from './pages/Terms';
import { NotFound } from './pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Landing },
      { path: 'shop', Component: Shop },
      { path: 'product/:id', Component: ProductDetail },
      { path: 'cart', Component: Cart },
      { path: 'checkout', Component: Checkout },
      { path: 'about', Component: About },
      { path: 'faq', Component: FAQ },
      { path: 'custom', Component: CustomOrder },
      { path: 'terms', Component: Terms },
      { path: '*', Component: NotFound },
    ],
  },
]);