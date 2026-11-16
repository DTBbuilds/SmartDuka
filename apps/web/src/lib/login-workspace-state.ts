/** Only an ID in the current shop list can qualify as a remembered shop. */
export function resolveCashierShopChoice(
  shops: ReadonlyArray<{ id: string }>,
  explicitPreferredId: string | undefined,
  deviceRememberedId: string | undefined,
): { shopId: string; step: 'shop' | 'pin' } {
  const validId = (id: string | undefined) => !!id && shops.some(shop => shop.id === id);
  const rememberedId = validId(explicitPreferredId)
    ? explicitPreferredId!
    : validId(deviceRememberedId) ? deviceRememberedId! : null;
  return {
    shopId: rememberedId ?? shops[0]?.id ?? '',
    step: rememberedId ? 'pin' : 'shop',
  };
}
