export type CheckoutAuth = { realm?: string; sub?: string } | null | undefined;

export function authenticatedCustomerId(auth: CheckoutAuth): string | undefined {
  if (auth?.realm === 'customer' && typeof auth.sub === 'string' && auth.sub) {
    return auth.sub;
  }
  return undefined;
}

/**
 * Bind the order to the logged-in customer when present.
 * Never use a client-supplied email/id to override that identity.
 * Guests are resolved later by email upsert — not by stale cart.customerId.
 */
export function orderCustomerIdFromAuth(auth: CheckoutAuth): string | undefined {
  return authenticatedCustomerId(auth);
}

export type SavedAddress = {
  id: string;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode?: string | null;
  country: string;
  isDefault?: boolean;
};

export function pickCheckoutAddress(addresses: SavedAddress[]): SavedAddress | undefined {
  if (!addresses.length) return undefined;
  return addresses.find((a) => a.isDefault) || (addresses.length === 1 ? addresses[0] : undefined);
}

export function assertAddressOwned<T extends { id: string; customerId: string }>(
  address: T | null | undefined,
  customerId: string,
): asserts address is T {
  if (!address || address.customerId !== customerId) {
    throw new Error('ADDRESS_NOT_OWNED');
  }
}

export type AddressSnapshot = {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  fullName?: string;
  phone?: string;
};

export function snapshotShippingAddress(
  address: {
    line1: string;
    line2?: string | null;
    city: string;
    state?: string | null;
    postalCode?: string | null;
    country: string;
  },
  contact?: { fullName?: string | null; phone?: string | null },
): AddressSnapshot {
  return {
    line1: address.line1,
    ...(address.line2 ? { line2: address.line2 } : {}),
    city: address.city,
    ...(address.state ? { state: address.state } : {}),
    postalCode: address.postalCode || '',
    country: address.country || 'Pakistan',
    ...(contact?.fullName ? { fullName: contact.fullName } : {}),
    ...(contact?.phone ? { phone: contact.phone } : {}),
  };
}

export function codCheckoutSettlement() {
  return { orderStatus: 'pending' as const, paymentStatus: 'pending' as const, provider: 'cod' as const };
}
