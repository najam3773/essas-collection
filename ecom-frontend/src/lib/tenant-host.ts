/** Single-store leftovers: no host-based tenant routing. */

export function getHostname() {
  if (typeof window === 'undefined') return '';
  return window.location.hostname;
}

export function isAdminHostname() {
  return false;
}

export function isPlatformHostname() {
  return false;
}

export async function resolveHost() {
  return { surface: 'store', tenant: { slug: 'essas-collection', name: "Essa's Collection" } };
}

export function storeOrigin(_domain?: string | null) {
  return '/';
}

export function adminOrigin() {
  return '/admin';
}
