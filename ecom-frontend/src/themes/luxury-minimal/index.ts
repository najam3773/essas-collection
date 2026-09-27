import type { StoreTheme } from '../types';
import Layout from './Layout';
import Home from './Home';
import Shop from './Shop';
import Product from './Product';
import Collection from './Collection';
import CartPage from '../shared/CartPage';
import AccountPage from '../shared/AccountPage';
import LoginPage from '../shared/LoginPage';
import WishlistPage from '../shared/WishlistPage';
import ComparePage from '../shared/ComparePage';
import ContentPage from '../shared/ContentPage';
import './theme.css';

const theme: StoreTheme = {
  key: 'luxury-minimal',
  name: 'Luxury Minimal',
  version: '2.0.0',
  dark: false,
  Layout,
  pages: {
    home: Home,
    shop: Shop,
    product: Product,
    collection: Collection,
    cart: CartPage,
    account: AccountPage,
    login: LoginPage,
    wishlist: WishlistPage,
    compare: ComparePage,
    content: ContentPage,
  },
};

export default theme;
