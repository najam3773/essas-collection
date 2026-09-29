export const CART_CHANGED_EVENT = 'df-cart-changed';

export function cartQuantity(items?: Array<{ quantity?: number }> | null) {
  return (items || []).reduce((n, item) => n + (Number(item.quantity) || 0), 0);
}

export function notifyCartChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CART_CHANGED_EVENT));
}
