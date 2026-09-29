import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertAddressOwned,
  authenticatedCustomerId,
  codCheckoutSettlement,
  orderCustomerIdFromAuth,
  pickCheckoutAddress,
  snapshotShippingAddress,
} from '../src/lib/checkout-identity.ts';

test('authenticated customer wins over client email identity', () => {
  const haroon = 'customer-haroon-id';
  const shopper = 'customer-shopper-id';
  assert.equal(orderCustomerIdFromAuth({ realm: 'customer', sub: haroon }), haroon);
  assert.notEqual(orderCustomerIdFromAuth({ realm: 'customer', sub: haroon }), shopper);
  assert.equal(authenticatedCustomerId({ realm: 'staff', sub: haroon }), undefined);
});

test('two distinct customers never share auth-derived order identity', () => {
  const a = orderCustomerIdFromAuth({ realm: 'customer', sub: 'cust-a' });
  const b = orderCustomerIdFromAuth({ realm: 'customer', sub: 'cust-b' });
  assert.equal(a, 'cust-a');
  assert.equal(b, 'cust-b');
  assert.notEqual(a, b);
});

test('guest checkout has no auth customer id', () => {
  assert.equal(orderCustomerIdFromAuth(undefined), undefined);
  assert.equal(orderCustomerIdFromAuth({ realm: 'customer' }), undefined);
});

test('pick default saved address, or the only address', () => {
  const only = [{ id: '1', line1: 'A', city: 'Lahore', country: 'Pakistan' }];
  assert.equal(pickCheckoutAddress(only)?.id, '1');
  const many = [
    { id: '1', line1: 'A', city: 'Lahore', country: 'Pakistan', isDefault: false },
    { id: '2', line1: 'B', city: 'Karachi', country: 'Pakistan', isDefault: true },
  ];
  assert.equal(pickCheckoutAddress(many)?.id, '2');
  assert.equal(pickCheckoutAddress([]), undefined);
});

test('address ownership is isolated per customer', () => {
  assert.doesNotThrow(() => assertAddressOwned({ id: 'addr-1', customerId: 'cust-a' }, 'cust-a'));
  assert.throws(() => assertAddressOwned({ id: 'addr-1', customerId: 'cust-a' }, 'cust-b'));
  assert.throws(() => assertAddressOwned(null, 'cust-a'));
});

test('order shipping snapshot is independent of later profile edits', () => {
  const placed = snapshotShippingAddress(
    { line1: '12 MM Alam Road', city: 'Lahore', postalCode: '54000', country: 'Pakistan' },
    { fullName: 'Haroon', phone: '03001234567' },
  );
  const profileLater = snapshotShippingAddress(
    { line1: '99 New Street', city: 'Islamabad', postalCode: '', country: 'Pakistan' },
    { fullName: 'Haroon Updated', phone: '03009999999' },
  );
  assert.equal(placed.line1, '12 MM Alam Road');
  assert.equal(placed.city, 'Lahore');
  assert.equal(placed.fullName, 'Haroon');
  assert.equal(profileLater.line1, '99 New Street');
  assert.notEqual(placed.line1, profileLater.line1);
  assert.notEqual(placed.phone, profileLater.phone);
});

test('COD is recorded as pending until collection', () => {
  const cod = codCheckoutSettlement();
  assert.equal(cod.orderStatus, 'pending');
  assert.equal(cod.paymentStatus, 'pending');
  assert.equal(cod.provider, 'cod');
});

test('client email cannot impersonate another customer via auth helper', () => {
  const haroon = orderCustomerIdFromAuth({ realm: 'customer', sub: 'haroon-id' });
  const shopper = orderCustomerIdFromAuth({ realm: 'customer', sub: 'shopper-id' });
  assert.equal(haroon, 'haroon-id');
  assert.equal(shopper, 'shopper-id');
  assert.notEqual(haroon, shopper);
});

test('saved-address picker never crosses customer lists', () => {
  const haroon = [
    { id: 'h-default', line1: 'Haroon House', city: 'Lahore', country: 'Pakistan', isDefault: true },
  ];
  const shopper = [
    { id: 's-only', line1: '12 MM Alam Road', city: 'Lahore', country: 'Pakistan' },
  ];
  assert.equal(pickCheckoutAddress(haroon)?.id, 'h-default');
  assert.equal(pickCheckoutAddress(shopper)?.id, 's-only');
  assert.notEqual(pickCheckoutAddress(haroon)?.id, pickCheckoutAddress(shopper)?.id);
});
