import type { StoreTheme } from '../types';
import Layout from './Layout';
import Home from './Home';
import ShopPage from '../shared/ShopPage';
import ProductPage from '../shared/ProductPage';
import CollectionPage from '../shared/CollectionPage';
import CartPage from '../shared/CartPage';
import AccountPage from '../shared/AccountPage';
import LoginPage from '../shared/LoginPage';
import WishlistPage from '../shared/WishlistPage';
import ComparePage from '../shared/ComparePage';
import ContentPage from '../shared/ContentPage';
import './theme.css';

const theme: StoreTheme = {
  key: 'default',
  name: 'Default Store',
  version: '1.0.0',
  dark: false,
  Layout,
  pages: {
    home: Home,
    shop: ShopPage,
    product: ProductPage,
    collection: CollectionPage,
    cart: CartPage,
    account: AccountPage,
    login: LoginPage,
    wishlist: WishlistPage,
    compare: ComparePage,
    content: ContentPage,
  },
};

export default theme;
