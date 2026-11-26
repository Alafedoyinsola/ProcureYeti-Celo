const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '../src/lib/altana/execution.ts'),
  'utf8'
);

function extractFunction(name, nextDeclaration) {
  const start = source.indexOf(`export function ${name}(`);
  assert.notStrictEqual(start, -1, `${name} must exist in execution.ts`);

  const end = source.indexOf(nextDeclaration, start);
  assert.notStrictEqual(end, -1, `Could not locate end of ${name}`);

  return source.slice(start, end);
}

test('Payment preparation always routes through the Purchase Mandate engine', () => {
  const body = extractFunction(
    'prepareExecutionPlan',
    'export interface PreparedRevocationPlan'
  );

  assert.match(
    body,
    /return\s+prepareDisburserExecutionPlan\s*\(/,
    'Payment preparation must use the mandate disburser'
  );

  assert.doesNotMatch(
    body,
    /buildVendorPaymentCall\s*\(/,
    'Payment preparation must never fall back to direct ERC-20 transfers'
  );

  assert.doesNotMatch(
    body,
    /resolveTokenConfig\s*\(/,
    'Payment preparation must not resolve a direct-transfer token'
  );
});

test('Mandate preparation requires configured disburser or an explicit override', () => {
  const body = extractFunction(
    'prepareDisburserExecutionPlan',
    'export interface PreparePaymentCallParams'
  );

  assert.match(
    body,
    /params\.disburserAddress\s*\|\|\s*getDisburserAddressOrThrow\s*\(\)/,
    'Missing disburser configuration must throw instead of creating a direct transfer'
  );

  assert.match(
    body,
    /buildMandatePaymentCall\s*\(/,
    'The prepared call must use the mandate payment builder'
  );

  assert.match(
    body,
    /disburserAddress:\s*targetAddress/,
    'The selected disburser address must be the mandate call target'
  );
});
