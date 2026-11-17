import { resolveCashierShopChoice } from './login-workspace-state';

const shops = [{ id: 'shop-a' }, { id: 'shop-b' }];

describe('cashier login shop memory', () => {
  it('only skips the shop picker for a valid remembered shop', () => {
    expect(resolveCashierShopChoice(shops, 'shop-b', undefined)).toEqual({ shopId: 'shop-b', step: 'pin' });
  });
  it('uses a valid remembered shop when a preferred ID is stale', () => {
    expect(resolveCashierShopChoice(shops, 'deleted-shop', 'shop-a')).toEqual({ shopId: 'shop-a', step: 'pin' });
  });
  it('does not skip directly to PIN on a public first-shop fallback', () => {
    expect(resolveCashierShopChoice(shops, 'deleted-shop', 'old-shop')).toEqual({ shopId: 'shop-a', step: 'shop' });
  });
  it('handles an empty shop directory without inventing a selection', () => {
    expect(resolveCashierShopChoice([], undefined, 'old-shop')).toEqual({ shopId: '', step: 'shop' });
  });
});
