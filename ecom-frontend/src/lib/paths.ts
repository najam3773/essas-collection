export const paths = {
  home: '/',
  shop: '/shop',
  product: (slug: string) => `/product/${slug}`,
  collection: (slug: string) => `/collections/${slug}`,
  page: (slug: string) => `/pages/${slug}`,
  cart: '/cart',
  account: '/account',
  login: '/login',
  register: '/register',
  wishlist: '/wishlist',
  compare: '/compare',
  admin: '/admin',
};
