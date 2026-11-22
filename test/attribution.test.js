const test = require('node:test');
const assert = require('node:assert');

// Dynamically import ES modules in Node 24
async function getAttributionModule() {
  return await import('../src/lib/altana/attribution.ts');
}

test('Attribution Safety Gate - 1. Attribution report returns gated_relay_incompatible', async () => {
  const {
    getAttributionReport,
    HACKATHON_ATTRIBUTION_TAG,
    CELO_MAINNET_CHAIN_ID,
    CELO_SEPOLIA_CHAIN_ID,
  } = await getAttributionModule();

  // Test Celo Mainnet report
  const mainnetReport = getAttributionReport(CELO_MAINNET_CHAIN_ID);
  assert.strictEqual(mainnetReport.status, 'gated_relay_incompatible');
  assert.strictEqual(mainnetReport.isExecutionGated, true);
  assert.strictEqual(mainnetReport.isLiveExecutionBlocked, true);
  assert.strictEqual(mainnetReport.tag, HACKATHON_ATTRIBUTION_TAG);
  assert.strictEqual(mainnetReport.tag, 'celo_43f4a9848a4b');
  assert.strictEqual(mainnetReport.relayType, 'Ithaca Porto / EIP-7702 Relayer');
  assert.strictEqual(mainnetReport.verifierMethod, 'ERC-8021 Outermost Calldata Inspection');
  assert.strictEqual(mainnetReport.targetChainId, 42220);
  assert.ok(mainnetReport.blockerReason.includes('Ithaca Porto'));
  assert.ok(mainnetReport.blockerReason.includes('ERC-8021'));

  // Test Celo Sepolia report
  const sepoliaReport = getAttributionReport(CELO_SEPOLIA_CHAIN_ID);
  assert.strictEqual(sepoliaReport.status, 'gated_relay_incompatible');
  assert.strictEqual(sepoliaReport.isExecutionGated, true);
  assert.strictEqual(sepoliaReport.isLiveExecutionBlocked, true);
  assert.strictEqual(sepoliaReport.targetChainId, 11142220);

  // Test default chainId parameter
  const defaultReport = getAttributionReport();
  assert.strictEqual(defaultReport.status, 'gated_relay_incompatible');
  assert.strictEqual(defaultReport.isExecutionGated, true);
});

test('Attribution Safety Gate - 2. Live execution is blocked when attribution cannot be verified', async () => {
  const {
    isLiveExecutionAllowed,
    assertExecutionAllowed,
    validateExecutionSafety,
    AttributionGateError,
    CELO_MAINNET_CHAIN_ID,
    CELO_SEPOLIA_CHAIN_ID,
  } = await getAttributionModule();

  // isLiveExecutionAllowed must return false
  assert.strictEqual(isLiveExecutionAllowed(CELO_MAINNET_CHAIN_ID), false);
  assert.strictEqual(isLiveExecutionAllowed(CELO_SEPOLIA_CHAIN_ID), false);
  assert.strictEqual(isLiveExecutionAllowed(), false);

  // assertExecutionAllowed must throw AttributionGateError
  assert.throws(
    () => {
      assertExecutionAllowed(CELO_MAINNET_CHAIN_ID);
    },
    (err) => {
      assert.ok(err instanceof Error);
      assert.strictEqual(err.name, 'AttributionGateError');
      assert.strictEqual(err.status, 'gated_relay_incompatible');
      assert.strictEqual(err.targetChainId, 42220);
      assert.ok(err.message.includes('Live execution blocked'));
      return true;
    }
  );

  // validateExecutionSafety must evaluate to blocked
  const evalResult = validateExecutionSafety();
  assert.strictEqual(evalResult.allowed, false);
  assert.strictEqual(evalResult.isExecutionGated, true);
  assert.strictEqual(evalResult.isLiveExecutionBlocked, true);
  assert.strictEqual(evalResult.status, 'gated_relay_incompatible');
});

test('Attribution Safety Gate - 3. Configured attribution tag is never presented as proof of a qualifying transaction', async () => {
  const {
    HACKATHON_ATTRIBUTION_TAG,
    isTagProofOfQualifyingTransaction,
    validateExecutionSafety,
  } = await getAttributionModule();

  // The tag string in local configuration is NOT proof of on-chain attribution
  assert.strictEqual(
    isTagProofOfQualifyingTransaction(HACKATHON_ATTRIBUTION_TAG),
    false,
    'Configured tag string must not be treated as proof of qualifying transaction'
  );

  assert.strictEqual(
    isTagProofOfQualifyingTransaction('celo_43f4a9848a4b'),
    false,
    'Hardcoded tag must not be treated as proof of qualifying transaction'
  );

  assert.strictEqual(
    isTagProofOfQualifyingTransaction(undefined),
    false,
    'Undefined tag must not be treated as proof'
  );

  assert.strictEqual(
    isTagProofOfQualifyingTransaction(''),
    false,
    'Empty tag must not be treated as proof'
  );

  // validateExecutionSafety explicitly confirms isQualifyingProof is false
  const safety = validateExecutionSafety();
  assert.strictEqual(
    safety.isQualifyingProof,
    false,
    'Safety evaluation must reflect that tag is not qualifying proof'
  );
});

test('Attribution Safety Gate - 4. Inner calldata tagging cannot override the execution gate', async () => {
  const {
    HACKATHON_ATTRIBUTION_TAG,
    canInnerCalldataTagOverrideGate,
    validateExecutionSafety,
    assertExecutionAllowed,
  } = await getAttributionModule();

  // Simulate an inner contract call (disburseWithMandate) appended with attribution suffix
  const mockInnerCalldata = '0x82f9d51f00000000000000000000000000000000000000000000000000000000';
  const tagHex = Buffer.from(HACKATHON_ATTRIBUTION_TAG).toString('hex');
  const innerCalldataWithSuffix = mockInnerCalldata + tagHex;

  // Verify that inner calldata tagging CANNOT override gate
  assert.strictEqual(
    canInnerCalldataTagOverrideGate(innerCalldataWithSuffix),
    false,
    'Inner calldata suffix must not override gate'
  );

  assert.strictEqual(
    canInnerCalldataTagOverrideGate(mockInnerCalldata),
    false,
    'Plain inner calldata must not override gate'
  );

  assert.strictEqual(
    canInnerCalldataTagOverrideGate(undefined),
    false,
    'Undefined calldata must not override gate'
  );

  // validateExecutionSafety with inner calldata passed
  const evalWithInner = validateExecutionSafety({ innerCalldata: innerCalldataWithSuffix });
  assert.strictEqual(evalWithInner.allowed, false, 'Execution must remain blocked');
  assert.strictEqual(evalWithInner.isExecutionGated, true, 'Gate must remain engaged');
  assert.strictEqual(
    evalWithInner.innerCalldataOverridesGate,
    false,
    'Inner override must be strictly false'
  );

  // assertExecutionAllowed must still throw
  assert.throws(
    () => {
      assertExecutionAllowed();
    },
    (err) => {
      assert.strictEqual(err.name, 'AttributionGateError');
      return true;
    }
  );
});

test('Attribution Safety Gate - 5. Architectural Invariant & Zero-Spend Guarantee', async () => {
  const {
    getAttributionReport,
    validateExecutionSafety,
  } = await getAttributionModule();

  const report = getAttributionReport();

  // Architectural invariant: Altana relayer wraps inner calls in EIP-7702 UserOp envelope
  assert.strictEqual(report.relayType, 'Ithaca Porto / EIP-7702 Relayer');
  assert.strictEqual(report.verifierMethod, 'ERC-8021 Outermost Calldata Inspection');

  // Verify safest action preserves funds
  assert.ok(
    report.safestAction.includes('No live funds are spent'),
    'Safest action must confirm zero funds spent'
  );
  assert.ok(
    report.safestAction.includes('audit receipts'),
    'Safest action must emphasize cryptographic audit receipts'
  );

  const evaluation = validateExecutionSafety();
  assert.strictEqual(evaluation.isExecutionGated, true);
  assert.strictEqual(evaluation.allowed, false);
});

test('Attribution Safety Gate - 6. Client broadcast proxy systematically intercepts and blocks all broadcast methods', async () => {
  const { wrapWithAttributionGate, GUARDED_BROADCAST_METHODS } = await getAttributionModule();

  // Create a mock client that tracks if underlying methods were reached
  let reachedUnderlying = false;
  const mockClient = {
    execute: async () => { reachedUnderlying = true; return { status: 'CONFIRMED' }; },
    grantSession: async () => { reachedUnderlying = true; return {}; },
    revokeSession: async () => { reachedUnderlying = true; return {}; },
    registerAgentIdentity: async () => { reachedUnderlying = true; return {}; },
    registerSessionKey: async () => { reachedUnderlying = true; return {}; },
    syncSessionToCache: async () => { reachedUnderlying = true; return {}; },
    approveSignatureChecker: async () => { reachedUnderlying = true; return {}; },
    revokeSignatureChecker: async () => { reachedUnderlying = true; return {}; },
    approveTokenForPermit2: async () => { reachedUnderlying = true; return {}; },
    // Safe read-only / quote query methods
    quoteExecute: async () => ({ maxFee: 100n }),
    balances: async () => ({ balances: [] }),
    holdings: async () => ({ assets: [] }),
    feeCurrencies: async () => ({ currencies: [] }),
  };

  const guardedClient = wrapWithAttributionGate(mockClient, 42220);

  // Every single guarded method must throw AttributionGateError before reaching underlying implementation
  for (const method of GUARDED_BROADCAST_METHODS) {
    reachedUnderlying = false;
    await assert.rejects(
      async () => {
        await guardedClient[method]();
      },
      (err) => {
        assert.strictEqual(err.name, 'AttributionGateError');
        assert.strictEqual(err.status, 'gated_relay_incompatible');
        assert.ok(err.message.includes('Live execution blocked'));
        return true;
      },
      `Guarded method ${method} must be intercepted`
    );
    assert.strictEqual(reachedUnderlying, false, `Underlying method ${method} must NOT be reached`);
  }

  // Safe read queries and quotes must pass through without error
  const quote = await guardedClient.quoteExecute();
  assert.strictEqual(quote.maxFee, 100n, 'Quote query must pass through');

  const balances = await guardedClient.balances();
  assert.ok(balances, 'Balances query must pass through');
});

test('Attribution Safety Gate - 7. Inner calldata or parameter tampering cannot bypass client proxy', async () => {
  const { wrapWithAttributionGate, HACKATHON_ATTRIBUTION_TAG } = await getAttributionModule();

  let reached = false;
  const rawClient = {
    execute: async (_opts) => { reached = true; return { status: 'CONFIRMED' }; },
  };

  const client = wrapWithAttributionGate(rawClient, 11142220);

  // Try calling execute with inner calldata tagged with attribution suffix
  const callWithSuffix = {
    to: '0xD15b805E8004081cE10c0eF62b2f2dC9fFDb7702',
    data: '0x82f9d51f' + Buffer.from(HACKATHON_ATTRIBUTION_TAG).toString('hex'),
  };

  await assert.rejects(
    async () => {
      await client.execute({ calls: [callWithSuffix] });
    },
    (err) => {
      assert.strictEqual(err.name, 'AttributionGateError');
      assert.strictEqual(err.targetChainId, 11142220);
      return true;
    }
  );

  assert.strictEqual(reached, false, 'Client execute must never reach underlying transport');
});
