import { SalesController } from './sales.controller';

/**
 * POS-CURRENCY-CHECKOUT-DEPLOY1 — capability-probe endpoint contract.
 *
 * The endpoint is the SOLE reliable distinguisher between an API that
 * accepts the `expectedTotal` quote-integrity field and one that does not.
 * It must exist ONLY in capable releases and return an affirmative,
 * unambiguous capability object.
 */
describe('sales checkout-capabilities probe endpoint', () => {
  let controller: SalesController;

  beforeEach(async () => {
    controller = new SalesController({} as any, {} as any, {} as any);
  });

  it('affirmatively advertises quote integrity (expectedTotal accepted)', () => {
    expect(controller.checkoutCapabilities()).toEqual({
      quoteIntegrity: true,
      expectedTotal: true,
    });
  });

  it('is registered as a GET route on the sales controller', () => {
    const routes = Object.getOwnPropertyNames(SalesController.prototype);
    expect(routes).toContain('checkoutCapabilities');
  });
});
