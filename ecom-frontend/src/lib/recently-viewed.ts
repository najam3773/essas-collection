const STORE_KEY = 'essa';

export type RecentItem = {
  id: string;
  slug: string;
  name: string;
  image?: string;
  priceCents?: number;
};

export function pushRecentlyViewed(_tenant: string, item: RecentItem) {
  const prev = getRecentlyViewed().filter((x) => x.id !== item.id);
  const next = [item, ...prev].slice(0, 8);
  if (typeof window !== 'undefined') localStorage.setItem(`recent_${STORE_KEY}`, JSON.stringify(next));
}

export function getRecentlyViewed(_tenant?: string): RecentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(`recent_${STORE_KEY}`) || '[]');
  } catch {
    return [];
  }
}

export function toggleCompare(_tenant: string, id: string) {
  const set = new Set(getCompare());
  if (set.has(id)) set.delete(id);
  else set.add(id);
  const next = [...set];
  if (typeof window !== 'undefined') localStorage.setItem(`compare_${STORE_KEY}`, JSON.stringify(next));
  return next;
}

export function getCompare(_tenant?: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(`compare_${STORE_KEY}`) || '[]');
  } catch {
    return [];
  }
}
