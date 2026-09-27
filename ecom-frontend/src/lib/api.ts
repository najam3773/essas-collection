const API_PREFIX = (process.env.NEXT_PUBLIC_API_URL || '/api').replace(/\/+$/, '') || '/api';

export type ApiOptions = {
  token?: string | null;
  cartSession?: string;
  method?: string;
  body?: unknown;
};

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const method = opts.method || (opts.body ? 'POST' : 'GET');
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.cartSession) headers['x-cart-session'] = opts.cartSession;

  const res = await fetch(`${API_PREFIX}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const fieldErrors = err?.details?.fieldErrors as Record<string, string[]> | undefined;
    if (fieldErrors && typeof fieldErrors === 'object') {
      const parts = Object.entries(fieldErrors)
        .filter(([, msgs]) => Array.isArray(msgs) && msgs.length)
        .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`);
      if (parts.length) throw new Error(parts.join(' · '));
    }
    throw new Error(err.error || 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

let storeCurrency = 'PKR';

export function setStoreCurrency(code: string) {
  if (code && /^[A-Z]{3}$/.test(code)) storeCurrency = code;
}

export function getStoreCurrency() {
  return storeCurrency;
}

export function money(cents: number, currency = storeCurrency) {
  try {
    if (currency === 'PKR') {
      return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        maximumFractionDigits: 0,
      }).format(cents / 100);
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
  } catch {
    return `PKR ${Math.round(cents / 100).toLocaleString('en-PK')}`;
  }
}

export function getCartSession() {
  if (typeof window === 'undefined') return '';
  let s = localStorage.getItem('cart_session');
  if (!s) {
    s = crypto.randomUUID();
    localStorage.setItem('cart_session', s);
  }
  return s;
}

export async function uploadProductImages(
  files: File[],
  token: string,
): Promise<Array<{ url: string; alt?: string }>> {
  const fd = new FormData();
  for (const file of files) fd.append('files', file);
  const res = await fetch(`${API_PREFIX}/admin/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Upload failed');
  }
  const data = (await res.json()) as { files?: Array<{ url: string; alt?: string }> };
  return data.files || [];
}

/** @deprecated single-store — kept so older call sites compile during conversion */
export function paramSlug(_value?: string | string[]) {
  return '';
}
