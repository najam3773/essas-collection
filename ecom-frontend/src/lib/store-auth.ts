const CUSTOMER_KEY = 'customer_token';

export function getCustomerToken(_ignored?: string) {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CUSTOMER_KEY);
}

export function setCustomerToken(_ignored: string | undefined, token?: string) {
  const value = token ?? _ignored;
  if (value) localStorage.setItem(CUSTOMER_KEY, value);
}

export function clearCustomerToken(_ignored?: string) {
  localStorage.removeItem(CUSTOMER_KEY);
}
