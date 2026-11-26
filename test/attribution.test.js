const test = require('node:test');
const assert = require('node:assert');

// Dynamically import ES modules in Node 24
async function getAttributionModule() {
  return await import('../src/lib/altana/attribution.ts');
}

test('Attribution Safety Gate - 1. Attribution report returns gated_attribution_not_guaranteed', async () => {
  const {
    getAttributionReport,
    HACKATHON_ATTRIBUTION_TAG,
    CELO_MAINNET_CHAIN_ID,
    CELO_SEPOLIA_CHAIN_ID,
  } = await getAttributionModule();

  // Test Celo Mainnet report
  const mainnetReport = getAttributionReport(CELO_MAINNET_CHAIN_ID);
  assert.strictEqual(mainnetReport.status, 'gated_attribution_not_guaranteed');
  assert.strictEqual(mainnetReport.isExecutionGated, true);
  assert.strictEqual(mainnetReport.isLiveExecutionBlocked, true);
  assert.strictEqual(mainnetReport.tag, HACKATHON_ATTRIBUTION_TAG);
  assert.strictEqual(mainnetReport.tag, 'celo_43f4a9848a4b');
  assert.strictEqual(mainnetReport.relayType, 'Ithaca Porto / EIP-7702 Relayer');
  assert.strictEqual(mainnetReport.verifierMethod, 'Receipt-aware Orchestrator and ERC-4337 execution verification');
  assert.strictEqual(mainnetReport.targetChainId, 42220);
  assert.ok(mainnetReport.blockerReason.includes('Ithaca Porto'));
  assert.ok(mainnetReport.blockerReason.includes('ERC-8021'));

  // Test Celo Sepolia report
  const sepoliaReport = getAttributionReport(CELO_SEPOLIA_CHAIN_ID);
  assert.strictEqual(sepoliaReport.status, 'gated_attribution_not_guaranteed');
  assert.strictEqual(sepoliaReport.isExecutionGated, true);
  assert.strictEqual(sepoliaReport.isLiveExecutionBlocked, true);
  assert.strictEqual(sepoliaReport.targetChainId, 11142220);

  // Test default chainId parameter
  const defaultReport = getAttributionReport();
  assert.strictEqual(defaultReport.status, 'gated_attribution_not_guaranteed');
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
      assert.strictEqual(err.status, 'gated_attribution_not_guaranteed');
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
  assert.strictEqual(evalResult.status, 'gated_attribution_not_guaranteed');
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
  assert.strictEqual(report.verifierMethod, 'Receipt-aware Orchestrator and ERC-4337 execution verification');

  // Verify safest action preserves funds
  assert.ok(
    report.safestAction.includes('No live funds are spent'),
    'Safest action must confirm zero funds spent'
  );
  assert.ok(
    report.safestAction.includes('audit evidence'),
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
        assert.strictEqual(err.status, 'gated_attribution_not_guaranteed');
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

// Helper for Altana SDK 1.2.0 integration tests
const fs = require('fs');
const path = require('path');

async function getSdkModule() {
  return await import('@altananetwork/sdk');
}

test('Altana SDK 1.2.0 - 8. Configured client uses correct app code (celo_43f4a9848a4b)', async () => {
  const { createClient, CELO_SEPOLIA, attributionCodes } = await getSdkModule();

  // 1. Inspect source file src/lib/altana/client.ts to verify attribution configuration
  const clientSourcePath = path.join(__dirname, '../src/lib/altana/client.ts');
  const clientSource = fs.readFileSync(clientSourcePath, 'utf8');

  assert.ok(
    clientSource.includes("appCode: 'celo_43f4a9848a4b'"),
    'src/lib/altana/client.ts must configure appCode: celo_43f4a9848a4b'
  );
  assert.ok(
    clientSource.includes('agentIdentity: false'),
    'src/lib/altana/client.ts must preserve agentIdentity: false'
  );
  assert.ok(
    clientSource.includes('wrapWithAttributionGate'),
    'src/lib/altana/client.ts must preserve wrapWithAttributionGate integration'
  );
  assert.ok(
    clientSource.includes('clientInstance'),
    'src/lib/altana/client.ts must preserve singleton client pattern'
  );

  // 2. Verify SDK attributionCodes helper returns altana first, then celo_43f4a9848a4b
  const appCode = 'celo_43f4a9848a4b';
  const codes = attributionCodes(appCode);
  assert.deepStrictEqual(codes, ['altana', 'celo_43f4a9848a4b']);

  // 3. Verify SDK client initializes without error using configured appCode
  const rawClient = createClient({
    chains: [CELO_SEPOLIA],
    agentIdentity: false,
    appCode: 'celo_43f4a9848a4b',
  });
  assert.ok(rawClient, 'createClient successfully instantiates client with appCode');

  // 4. Verify invalid app code is rejected by SDK validation
  assert.throws(
    () => {
      createClient({
        chains: [CELO_SEPOLIA],
        appCode: 'INVALID-CODE-WITH-UPPERCASE!',
      });
    },
    /the app code .* cannot be used/
  );
});

test('Altana SDK 1.2.0 - 9. SDK-generated calldata contains ERC-8021 attribution tag', async () => {
  const { attributionCodes, attributionTag, tagCalls, parseAttribution, ERC_8021_MARKER } = await getSdkModule();

  const appCode = 'celo_43f4a9848a4b';
  const codes = attributionCodes(appCode);
  const tag = attributionTag(codes);

  // Generate a call payload with selector 0x16b677a2
  const targetAddress = '0xD15b805E8004081cE10c0eF62b2f2dC9fFDb7702';
  const initialData = '0x16b677a200000000000000000000000000000000000000000000000000000000';
  const calls = [{ to: targetAddress, data: initialData }];

  const taggedCalls = tagCalls(calls, tag, { session: true });
  assert.strictEqual(taggedCalls.length, 1);

  const taggedData = taggedCalls[0].data;

  // Calldata must contain the full ERC-8021 attribution tag
  assert.ok(
    taggedData.endsWith(tag.slice(2)),
    'Tagged calldata must end with the ERC-8021 attribution tag'
  );

  // Tag must end with the standard ERC-8021 16-byte marker
  assert.ok(
    taggedData.endsWith(ERC_8021_MARKER.slice(2)),
    'Tagged calldata must end with ERC-8021 marker 0x80218021802180218021802180218021'
  );

  // Parse attribution back using official SDK parseAttribution
  const parsed = parseAttribution(taggedData);
  assert.ok(parsed, 'parseAttribution successfully extracts attribution from tagged calldata');
  assert.deepStrictEqual(parsed.codes, ['altana', 'celo_43f4a9848a4b']);
});

test('Altana SDK 1.2.0 - 10. Original function selector 0x16b677a2 and target contract address remain unchanged', async () => {
  const { attributionCodes, attributionTag, tagCalls } = await getSdkModule();

  const appCode = 'celo_43f4a9848a4b';
  const targetAddress = '0xD15b805E8004081cE10c0eF62b2f2dC9fFDb7702';
  const originalSelector = '0x16b677a2';
  const rawArguments = '11223344556677889900aabbccddeeff0011223344556677889900aabbccddeeff';
  const originalCalldata = originalSelector + rawArguments;

  const calls = [
    {
      to: targetAddress,
      data: originalCalldata,
      value: 0n,
    },
  ];

  const tag = attributionTag(attributionCodes(appCode));
  const taggedCalls = tagCalls(calls, tag, { session: true });

  // 1. Selector must remain 0x16b677a2
  const resultSelector = taggedCalls[0].data.slice(0, 10);
  assert.strictEqual(
    resultSelector.toLowerCase(),
    originalSelector.toLowerCase(),
    'The original function selector remains 0x16b677a2'
  );

  // 2. Target contract address must remain unchanged
  assert.strictEqual(
    taggedCalls[0].to.toLowerCase(),
    targetAddress.toLowerCase(),
    'The target contract address is unchanged'
  );

  // 3. Call value must remain unchanged
  assert.strictEqual(taggedCalls[0].value, 0n, 'Call value is unchanged');

  // 4. Original arguments must precede the appended tag
  assert.ok(
    taggedCalls[0].data.startsWith(originalCalldata),
    'Calldata prefix must strictly match original selector and arguments'
  );

  // 5. Companion check: Canonical Disburser selector 0xc9e953bf remains unchanged after SDK tagging
  const canonicalSelector = '0xc9e953bf'; // disburseWithMandate(bytes32,address,uint256,string)
  const canonicalMandateCalldata = canonicalSelector + '00'.repeat(32);
  const [taggedMandateCall] = tagCalls([{ to: targetAddress, data: canonicalMandateCalldata }], tag, { session: true });
  assert.strictEqual(
    taggedMandateCall.data.slice(0, 10).toLowerCase(),
    canonicalSelector,
    'Canonical Disburser selector 0xc9e953bf remains unchanged after SDK tagging'
  );
  assert.ok(
    taggedMandateCall.data.startsWith(canonicalMandateCalldata),
    'Calldata prefix must strictly match canonical selector and arguments'
  );
});

test('Altana SDK 1.2.0 - 11. Attribution is attached before session authorization', async () => {
  const { attributionCodes, attributionTag, tagCalls, parseAttribution } = await getSdkModule();

  // In SDK 1.2.0, execute() calls withAttribution() to tag the calls array
  // prior to passing calls into submitCallsDetailed, withAppLaneNonce, and prepareCalls/signCalls.
  // This ensures the session authorization digest covers the tagged calldata.
  const appCode = 'celo_43f4a9848a4b';
  const tag = attributionTag(attributionCodes(appCode));
  const rawCalls = [
    {
      to: '0xD15b805E8004081cE10c0eF62b2f2dC9fFDb7702',
      data: '0x16b677a200000000000000000000000000000000000000000000000000000001',
    },
  ];

  // For a session execution ({ session: true }), tagCalls tags the call:
  const preAuthorizationCalls = tagCalls(rawCalls, tag, { session: true });

  // Verify the calls are tagged before any signature / authorization could occur
  assert.notStrictEqual(preAuthorizationCalls[0].data, rawCalls[0].data);
  const parsed = parseAttribution(preAuthorizationCalls[0].data);
  assert.deepStrictEqual(parsed.codes, ['altana', 'celo_43f4a9848a4b']);

  // The input array was not mutated (pure transform)
  assert.strictEqual(
    rawCalls[0].data,
    '0x16b677a200000000000000000000000000000000000000000000000000000001'
  );
});

test('Attribution Safety Gate - 12. Existing attribution gate still blocks live execution on configured client', async () => {
  const { createClient, CELO_SEPOLIA } = await getSdkModule();
  const { wrapWithAttributionGate, assertExecutionAllowed, isLiveExecutionAllowed, getAttributionReport } =
    await getAttributionModule();

  // Verify report status
  const report = getAttributionReport();
  assert.strictEqual(report.isExecutionGated, true, 'Execution gate must remain engaged');
  assert.strictEqual(report.isLiveExecutionBlocked, true, 'Live execution must remain blocked');
  assert.strictEqual(isLiveExecutionAllowed(), false, 'isLiveExecutionAllowed must return false');

  // Verify assertExecutionAllowed throws
  assert.throws(() => {
    assertExecutionAllowed();
  }, /Live execution blocked by attribution safety gate/);

  // Verify that calling execute() on the configured, gated client is blocked by the gate
  const rawClient = createClient({
    chains: [CELO_SEPOLIA],
    agentIdentity: false,
    appCode: 'celo_43f4a9848a4b',
  });
  const guardedClient = wrapWithAttributionGate(rawClient, CELO_SEPOLIA.chainId);

  await assert.rejects(
    async () => {
      await guardedClient.execute({
        session: {
          walletAddress: '0x1111111111111111111111111111111111111111',
          publicKey: '0x02',
          expiry: 9999999999,
          permissions: { calls: [], spend: [] },
          signer: {},
        },
        calls: [
          {
            to: '0xD15b805E8004081cE10c0eF62b2f2dC9fFDb7702',
            data: '0x16b677a20000',
          },
        ],
      });
    },
    (err) => {
      assert.strictEqual(err.name, 'AttributionGateError');
      assert.strictEqual(err.status, 'gated_attribution_not_guaranteed');
      return true;
    }
  );
});

test('Security Invariant - 13. Unauthorized session call remains rejected by existing permission model', () => {
  const disburserAddress = '0xD15b805E8004081cE10c0eF62b2f2dC9fFDb7702';
  const usdcAddress = '0x01C5C0122039549AD1493B8220cABEdD739BC44E';

  // Permission model strictly scopes calls to disburseWithMandate
  const permissions = {
    calls: [
      {
        to: disburserAddress,
        signature: 'disburseWithMandate(bytes32,address,uint256,string)',
      },
    ],
    spend: [
      {
        token: usdcAddress,
        limit: 500000000n, // $500 USDC (6 decimals)
        period: 'day',
      },
      {
        // Native CELO gas fee headroom for Altana relay execution on Celo Sepolia
        limit: 1000000000000000000n, // 1 CELO (18 decimals)
        period: 'day',
      },
    ],
  };

  const expirySeconds = 7 * 24 * 60 * 60;
  const expiry = Math.floor(Date.now() / 1000) + expirySeconds;

  assert.strictEqual(permissions.calls.length, 1);
  const callPerm = permissions.calls[0];
  assert.strictEqual(callPerm.to.toLowerCase(), disburserAddress.toLowerCase());
  assert.strictEqual(
    callPerm.signature,
    'disburseWithMandate(bytes32,address,uint256,string)',
    'Calls are restricted exclusively to disburseWithMandate'
  );

  // 1. Unauthorized contract target check: direct call to unauthorized contract is rejected
  const unauthorizedContract = '0x01C5C0122039549AD1493B8220cABEdD739BC44E'; // USDC contract directly
  const isTargetAuthorized = permissions.calls.some(
    (c) => c.to.toLowerCase() === unauthorizedContract.toLowerCase()
  );
  assert.strictEqual(isTargetAuthorized, false, 'Direct calls to token contract are not permitted in session');

  // 2. Unauthorized function selector check:
  // e.g. function with selector 0x16b677a2 or un-mandated disbursePayment
  const unauthorizedSignature = 'disbursePayment(address,uint256,string)';
  const isSignatureAuthorized = permissions.calls.some(
    (c) => c.signature === unauthorizedSignature
  );
  assert.strictEqual(isSignatureAuthorized, false, 'Un-mandated disbursePayment signature is not permitted');

  // 3. Daily spending velocity cap invariant ($500 USDC = 500_000_000 units)
  const usdcSpendPerm = permissions.spend.find((s) => s.token);
  assert.ok(usdcSpendPerm, 'Session must define USDC spend limit');
  assert.strictEqual(usdcSpendPerm.limit, 500000000n, 'Daily spending limit must remain exactly $500 USDC');
  assert.strictEqual(usdcSpendPerm.period, 'day');

  // 4. Native gas headroom invariant (1 CELO = 10^18 units)
  const nativeSpendPerm = permissions.spend.find((s) => !s.token);
  assert.ok(nativeSpendPerm, 'Session must define native CELO gas headroom');
  assert.strictEqual(nativeSpendPerm.limit, 1000000000000000000n, 'Native gas limit must remain exactly 1 CELO');
  assert.strictEqual(nativeSpendPerm.period, 'day');

  // 5. Seven-day expiry boundary
  const now = Math.floor(Date.now() / 1000);
  const sevenDays = 7 * 24 * 60 * 60;
  assert.ok(expiry >= now + sevenDays - 10 && expiry <= now + sevenDays + 10, 'Expiry is 7 days');
});

test('ERC-8004 - 14. Metadata schema validity, absence of fabricated Agent ID & unverified URLs', async () => {
  const { encodeErc8004AgentUri, decodeErc8004AgentUri } = await getSdkModule();

  // 1. Inspect source file src/lib/altana/erc8004.ts
  const erc8004SourcePath = path.join(__dirname, '../src/lib/altana/erc8004.ts');
  const erc8004Source = fs.readFileSync(erc8004SourcePath, 'utf8');

  // Must not contain hardcoded fabricated agentId: 0
  assert.strictEqual(
    erc8004Source.includes('agentId: 0'),
    false,
    'src/lib/altana/erc8004.ts must NOT contain hardcoded agentId: 0'
  );

  // Must not advertise unverified placeholder domain procureyeti.io
  assert.strictEqual(
    erc8004Source.includes('procureyeti.io'),
    false,
    'src/lib/altana/erc8004.ts must NOT advertise unverified procureyeti.io endpoints'
  );

  // Must define registrations: [] and services: [] for initial registration
  assert.ok(
    erc8004Source.includes('registrations: []'),
    'src/lib/altana/erc8004.ts must initialize registrations with empty array'
  );
  assert.ok(
    erc8004Source.includes('services: []'),
    'src/lib/altana/erc8004.ts must initialize services with empty array'
  );

  // Must preserve exact agent name and accurate project description
  assert.ok(
    erc8004Source.includes("'ProcureYeti Autonomous Procurement Agent'"),
    'src/lib/altana/erc8004.ts must preserve official agent name'
  );
  assert.ok(
    erc8004Source.includes(
      "'Autonomous AI procurement agent governed by Altana Agent Wallets on Celo.'"
    ),
    'src/lib/altana/erc8004.ts must preserve accurate project description'
  );

  // 2. Test metadata schema output structure
  const metadata = {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: 'ProcureYeti Autonomous Procurement Agent',
    description: 'Autonomous AI procurement agent governed by Altana Agent Wallets on Celo.',
    services: [],
    registrations: [],
  };

  assert.strictEqual(
    metadata.type,
    'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    'Metadata type must match official EIP-8004 registration schema'
  );
  assert.strictEqual(metadata.name, 'ProcureYeti Autonomous Procurement Agent');
  assert.strictEqual(
    metadata.description,
    'Autonomous AI procurement agent governed by Altana Agent Wallets on Celo.'
  );
  assert.strictEqual(metadata.registrations.length, 0, 'Initial registrations must be empty array');
  assert.strictEqual(metadata.services.length, 0, 'Initial services must be empty array');
  assert.strictEqual(metadata.image, undefined, 'No unverified image URL should be advertised');

  // 3. Verify encoding to data URI and decoding
  const dataUri = encodeErc8004AgentUri(metadata);
  assert.ok(
    dataUri.startsWith('data:application/json;base64,'),
    'URI must be a base64 encoded data URI'
  );

  const decoded = decodeErc8004AgentUri(dataUri);
  assert.deepStrictEqual(decoded, metadata, 'Decoded metadata must match original metadata');
});

test('ERC-8004 - 15. Correct Mainnet registry reference when chain ID is 42220', async () => {
  const { erc8004Registry, ERC8004_ADDRESSES } = await getSdkModule();

  // Canonical Celo Mainnet registry address
  const mainnetRegistry = erc8004Registry(42220);
  assert.strictEqual(
    mainnetRegistry.toLowerCase(),
    '0x8004a169fb4a3325136eb29fa0ceb6d2e539a432',
    'Mainnet registry must resolve to 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432'
  );
  assert.strictEqual(
    ERC8004_ADDRESSES[42220].toLowerCase(),
    '0x8004a169fb4a3325136eb29fa0ceb6d2e539a432',
    'ERC8004_ADDRESSES[42220] must match canonical Mainnet address'
  );

  // Canonical Celo Sepolia testnet registry address
  const sepoliaRegistry = erc8004Registry(11142220);
  assert.strictEqual(
    sepoliaRegistry.toLowerCase(),
    '0x8004a818bfb912233c491871b3d84c89a494bd9e',
    'Sepolia registry must resolve to 0x8004A818BFB912233c491871b3d84c89A494BD9e'
  );
  assert.strictEqual(
    ERC8004_ADDRESSES[11142220].toLowerCase(),
    '0x8004a818bfb912233c491871b3d84c89a494bd9e',
    'ERC8004_ADDRESSES[11142220] must match canonical Sepolia address'
  );
});

test('ERC-8004 - 16. Registration calldata target and function selectors', async () => {
  const {
    buildErc8004RegisterCall,
    buildErc8004SetAgentUriCall,
    erc8004RegisterPermissions,
    encodeErc8004AgentUri,
  } = await getSdkModule();
  const { toFunctionSelector } = require('viem');

  const metadata = {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: 'ProcureYeti Autonomous Procurement Agent',
    description: 'Autonomous AI procurement agent governed by Altana Agent Wallets on Celo.',
    services: [],
    registrations: [],
  };
  const agentUri = encodeErc8004AgentUri(metadata);

  // Phase 1: buildErc8004RegisterCall
  const regCall = buildErc8004RegisterCall(42220, agentUri, []);
  assert.strictEqual(
    regCall.to.toLowerCase(),
    '0x8004a169fb4a3325136eb29fa0ceb6d2e539a432',
    'Register call must target Celo Mainnet ERC-8004 registry'
  );

  const registerSelector = toFunctionSelector('register(string,(string,bytes)[])');
  assert.strictEqual(
    regCall.data.slice(0, 10).toLowerCase(),
    registerSelector.toLowerCase(),
    'Register calldata must start with register(string,(string,bytes)[]) selector (0x8ea42286)'
  );

  // Phase 2: buildErc8004SetAgentUriCall
  const setUriCall = buildErc8004SetAgentUriCall(42220, 12345n, agentUri);
  assert.strictEqual(
    setUriCall.to.toLowerCase(),
    '0x8004a169fb4a3325136eb29fa0ceb6d2e539a432',
    'setAgentURI call must target Celo Mainnet ERC-8004 registry'
  );

  const setUriSelector = toFunctionSelector('setAgentURI(uint256,string)');
  assert.strictEqual(
    setUriCall.data.slice(0, 10).toLowerCase(),
    setUriSelector.toLowerCase(),
    'setAgentURI calldata must start with setAgentURI(uint256,string) selector (0x0af28bd3)'
  );

  // Session permissions scoping
  const perms = erc8004RegisterPermissions(42220);
  assert.strictEqual(perms.length, 2, 'Must define exactly 2 scoped call permissions');
  assert.strictEqual(
    perms[0].to.toLowerCase(),
    '0x8004a169fb4a3325136eb29fa0ceb6d2e539a432'
  );
  assert.strictEqual(perms[0].signature, 'register(string,(string,bytes)[])');
  assert.strictEqual(
    perms[1].to.toLowerCase(),
    '0x8004a169fb4a3325136eb29fa0ceb6d2e539a432'
  );
  assert.strictEqual(perms[1].signature, 'setAgentURI(uint256,string)');
});

test('ERC-8004 - 17. Attribution trailer preservation on registration calls', async () => {
  const {
    buildErc8004RegisterCall,
    attributionCodes,
    attributionTag,
    tagCalls,
    parseAttribution,
    encodeErc8004AgentUri,
    ERC_8021_MARKER,
  } = await getSdkModule();
  const { toFunctionSelector } = require('viem');

  const metadata = {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: 'ProcureYeti Autonomous Procurement Agent',
    description: 'Autonomous AI procurement agent governed by Altana Agent Wallets on Celo.',
    services: [],
    registrations: [],
  };
  const agentUri = encodeErc8004AgentUri(metadata);

  const rawCall = buildErc8004RegisterCall(42220, agentUri, []);
  const appCode = 'celo_43f4a9848a4b';
  const tag = attributionTag(attributionCodes(appCode));

  const taggedCalls = tagCalls([rawCall], tag, { session: true });
  assert.strictEqual(taggedCalls.length, 1);

  const taggedCall = taggedCalls[0];
  // 1. Target address unchanged
  assert.strictEqual(
    taggedCall.to.toLowerCase(),
    '0x8004a169fb4a3325136eb29fa0ceb6d2e539a432',
    'Target contract address must remain unchanged'
  );

  // 2. Function selector unchanged
  const registerSelector = toFunctionSelector('register(string,(string,bytes)[])');
  assert.strictEqual(
    taggedCall.data.slice(0, 10).toLowerCase(),
    registerSelector.toLowerCase(),
    'Function selector must remain unchanged'
  );

  // 3. Calldata ends with ERC-8021 tag
  assert.ok(
    taggedCall.data.endsWith(tag.slice(2)),
    'Tagged calldata must end with the ERC-8021 attribution tag'
  );
  assert.ok(
    taggedCall.data.endsWith(ERC_8021_MARKER.slice(2)),
    'Tagged calldata must end with the 16-byte ERC-8021 marker'
  );

  // 4. Decodes correctly with parseAttribution
  const parsed = parseAttribution(taggedCall.data);
  assert.ok(parsed, 'Attribution must be parseable from tagged calldata');
  assert.deepStrictEqual(parsed.codes, ['altana', 'celo_43f4a9848a4b']);
});

test('ERC-8004 - 18. Correct metadata patching after a real Agent ID is supplied', async () => {
  const {
    withErc8004Registration,
    encodeErc8004AgentUri,
    decodeErc8004AgentUri,
  } = await getSdkModule();

  const initialMetadata = {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: 'ProcureYeti Autonomous Procurement Agent',
    description: 'Autonomous AI procurement agent governed by Altana Agent Wallets on Celo.',
    services: [],
    registrations: [],
  };

  // Supply a real minted token ID: 888n on Celo Mainnet (42220)
  const agentId = 888n;
  const patched = withErc8004Registration(initialMetadata, agentId, 42220);

  // Initial metadata must remain unmutated
  assert.strictEqual(initialMetadata.registrations.length, 0);

  // Patched metadata must have exactly one registration record
  assert.strictEqual(patched.registrations.length, 1);
  assert.strictEqual(patched.registrations[0].agentId, 888);
  assert.strictEqual(
    patched.registrations[0].agentRegistry.toLowerCase(),
    'eip155:42220:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432'
  );
  assert.strictEqual(patched.name, initialMetadata.name);
  assert.strictEqual(patched.description, initialMetadata.description);

  // Encode patched metadata to data URI and verify round-trip
  const patchedUri = encodeErc8004AgentUri(patched);
  const decoded = decodeErc8004AgentUri(patchedUri);
  assert.strictEqual(decoded.registrations.length, 1);
  assert.strictEqual(decoded.registrations[0].agentId, 888);
  assert.strictEqual(
    decoded.registrations[0].agentRegistry.toLowerCase(),
    'eip155:42220:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432'
  );
});



// Receipt-aware Orchestrator verification regression tests.
// Mocked RPC only. No transactions are broadcast.

const {
  encodeAbiParameters,
  encodeFunctionData,
  concat,
  pad,
  toHex,
} = require('viem');

async function buildMockOrchestratorExecution({
  tagged = true,
  nonce = 7n,
  eventNonce = nonce,
  receiptStatus = 'success',
  executed = true,
  target = '0xAF140d0416A994Aebb3fA6212B16CE6700f09751',
} = {}) {
  const {
    INTENT_EXECUTED_TOPIC,
    toDataSuffix,
  } = await import('@celo/attribution-tags');

  const sender = '0x1111111111111111111111111111111111111111';
  const callTarget = '0x2222222222222222222222222222222222222222';

  const callData = tagged
    ? concat([
        '0x12345678',
        toDataSuffix(['altana', 'celo_43f4a9848a4b']),
      ])
    : '0x12345678';

  const executionData = encodeAbiParameters(
    [{
      type: 'tuple[]',
      components: [
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'data', type: 'bytes' },
      ],
    }],
    [[{ to: callTarget, value: 0n, data: callData }]],
  );

  const intentComponents = [
    { name: 'eoa', type: 'address' },
    { name: 'executionData', type: 'bytes' },
    { name: 'nonce', type: 'uint256' },
    { name: 'payer', type: 'address' },
    { name: 'paymentToken', type: 'address' },
    { name: 'paymentMaxAmount', type: 'uint256' },
    { name: 'combinedGas', type: 'uint256' },
    { name: 'encodedPreCalls', type: 'bytes[]' },
    { name: 'encodedFundTransfers', type: 'bytes[]' },
    { name: 'settler', type: 'address' },
    { name: 'expiry', type: 'uint256' },
    { name: 'isMultichain', type: 'bool' },
    { name: 'funder', type: 'address' },
    { name: 'funderSignature', type: 'bytes' },
    { name: 'settlerContext', type: 'bytes' },
    { name: 'paymentAmount', type: 'uint256' },
    { name: 'paymentRecipient', type: 'address' },
    { name: 'signature', type: 'bytes' },
    { name: 'paymentSignature', type: 'bytes' },
    { name: 'supportedAccountImplementation', type: 'address' },
  ];

  const zeroAddress = '0x0000000000000000000000000000000000000000';

  const encodedIntent = encodeAbiParameters(
    [{ type: 'tuple', components: intentComponents }],
    [{
      eoa: sender,
      executionData,
      nonce,
      payer: zeroAddress,
      paymentToken: zeroAddress,
      paymentMaxAmount: 0n,
      combinedGas: 0n,
      encodedPreCalls: [],
      encodedFundTransfers: [],
      settler: zeroAddress,
      expiry: 2000000000n,
      isMultichain: false,
      funder: zeroAddress,
      funderSignature: '0x',
      settlerContext: '0x',
      paymentAmount: 0n,
      paymentRecipient: zeroAddress,
      signature: '0x',
      paymentSignature: '0x',
      supportedAccountImplementation: zeroAddress,
    }],
  );

  const input = encodeFunctionData({
    abi: [{
      type: 'function',
      name: 'execute',
      stateMutability: 'nonpayable',
      inputs: [{ name: 'intent', type: 'bytes' }],
      outputs: [],
    }],
    functionName: 'execute',
    args: [encodedIntent],
  });

  const eventData = encodeAbiParameters(
    [
      { name: 'incremented', type: 'bool' },
      { name: 'err', type: 'bytes4' },
    ],
    [executed, '0x00000000'],
  );

  const receipt = {
    status: receiptStatus,
    logs: [{
      address: target,
      topics: [
        INTENT_EXECUTED_TOPIC,
        pad(sender, { size: 32 }),
        pad(toHex(eventNonce), { size: 32 }),
      ],
      data: eventData,
    }],
  };

  return {
    sender,
    hash: `0x${'ab'.repeat(32)}`,
    client: {
      getTransaction: async () => ({ to: target, input }),
      getTransactionReceipt: async () => receipt,
    },
  };
}

test('Celo verifier - receipt-aware Orchestrator intent attribution', async (t) => {
  const { verifyIntents } = await import('@celo/attribution-tags');

  const {
    isLiveExecutionAllowed,
    getAttributionReport,
  } = await getAttributionModule();

  await t.test('credits tagged inner calldata after successful matching execution', async () => {
    const fixture = await buildMockOrchestratorExecution();

    const result = await verifyIntents({
      client: fixture.client,
      hash: fixture.hash,
    });

    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].sender.toLowerCase(), fixture.sender.toLowerCase());
    assert.ok(result[0].attribution);
    assert.deepStrictEqual(
      result[0].attribution.codes,
      ['altana', 'celo_43f4a9848a4b'],
    );
  });

  await t.test('does not credit untagged inner calldata', async () => {
    const fixture = await buildMockOrchestratorExecution({ tagged: false });
    const result = await verifyIntents({ client: fixture.client, hash: fixture.hash });

    assert.ok(Array.isArray(result));
    assert.strictEqual(result[0].attribution, null);
  });

  await t.test('does not credit a reverted transaction', async () => {
    const fixture = await buildMockOrchestratorExecution({
      receiptStatus: 'reverted',
    });
    const result = await verifyIntents({ client: fixture.client, hash: fixture.hash });

    assert.ok(Array.isArray(result));
    assert.strictEqual(result[0].attribution, null);
  });

  await t.test('does not credit a mismatched event nonce', async () => {
    const fixture = await buildMockOrchestratorExecution({ eventNonce: 8n });
    const result = await verifyIntents({ client: fixture.client, hash: fixture.hash });

    assert.ok(Array.isArray(result));
    assert.strictEqual(result[0].attribution, null);
  });

  await t.test('does not credit an unsuccessful execution event', async () => {
    const fixture = await buildMockOrchestratorExecution({ executed: false });
    const result = await verifyIntents({ client: fixture.client, hash: fixture.hash });

    assert.ok(Array.isArray(result));
    assert.strictEqual(result[0].attribution, null);
  });

  await t.test('does not verify a transaction sent to a non-Orchestrator address', async () => {
    const fixture = await buildMockOrchestratorExecution({
      target: '0x3333333333333333333333333333333333333333',
    });
    const result = await verifyIntents({ client: fixture.client, hash: fixture.hash });

    assert.strictEqual(result, null);
  });

  // Verifier results must never silently open the application safety gate.
  assert.strictEqual(isLiveExecutionAllowed(), false);
  assert.strictEqual(getAttributionReport().isLiveExecutionBlocked, true);
});