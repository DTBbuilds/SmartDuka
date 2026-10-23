/**
 * CJS-compatible nanoid stub for the Jest (ts-jest) test environment.
 *
 * nanoid v5 ships ESM-only, which Jest cannot require without ESM support.
 * Tests that need deterministic ids mock 'nanoid' explicitly; this mapper
 * exists so suites that merely TRANSITIVELY import nanoid (e.g. via
 * loyalty.service.ts) can load without a parse error.
 */
export const nanoid = (size = 21): string => {
  const alphabet =
    'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict';
  let id = '';
  for (let i = 0; i < size; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
};
