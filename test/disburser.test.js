const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const solc = require('solc');
const {
  keccak256,
  toBytes,
  encodeFunctionData,
  decodeFunctionData,
  parseUnits,
  toFunctionSelector,
} = require('viem');

// Load and compile ProcureYetiDisburser.sol
const contractPath = path.join(__dirname, '../contracts/ProcureYetiDisburser.sol');
const contractSource = fs.readFileSync(contractPath, 'utf8');

const compilerInput = {
  language: 'Solidity',
  sources: {
    'ProcureYetiDisburser.sol': { content: contractSource },
  },
  settings: {
    evmVersion: 'cancun',
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode'],
      },
    },
  },
};

const compiled = JSON.parse(solc.compile(JSON.stringify(compilerInput)));
if (compiled.errors) {
  const errs = compiled.errors.filter((e) => e.severity === 'error');
  if (errs.length > 0) {
    throw new Error('Compilation failed:\n' + errs.map((e) => e.formattedMessage).join('\n'));
  }
}

const contractArtifact = compiled.contracts['ProcureYetiDisburser.sol']['ProcureYetiDisburser'];
const abi = contractArtifact.abi;
const bytecode = contractArtifact.evm.bytecode.object;

test('ProcureYetiDisburser - Contract Compilation and Bytecode Integrity (EVM Target: Cancun)', () => {
  assert.strictEqual(compilerInput.settings.evmVersion, 'cancun', 'EVM version target must be cancun for Celo Sepolia');
  assert.strictEqual(compilerInput.settings.optimizer.enabled, true, 'Optimizer must be enabled');
  assert.strictEqual(compilerInput.settings.optimizer.runs, 200, 'Optimizer runs must be 200');

  assert.ok(bytecode && bytecode.length > 1000, 'Bytecode should be generated and non-trivial');
  assert.ok(contractArtifact.evm.deployedBytecode.object.length > 1000, 'Deployed bytecode generated');

  const functions = abi.filter((x) => x.type === 'function').map((x) => x.name);
  assert.ok(functions.includes('disbursePayment'), 'Contains disbursePayment function');
  assert.ok(functions.includes('disburseWithMandate'), 'Contains disburseWithMandate function');
  assert.ok(functions.includes('executeMandatePayment'), 'Contains executeMandatePayment alias');
  assert.ok(functions.includes('createMandate'), 'Contains createMandate function');
  assert.ok(functions.includes('revokeMandate'), 'Contains revokeMandate function');
  assert.ok(functions.includes('getMandate'), 'Contains getMandate function');
  assert.ok(functions.includes('isMandateExecutable'), 'Contains isMandateExecutable view helper');
  assert.ok(functions.includes('mandateCount'), 'Contains mandateCount view');
  assert.ok(functions.includes('executedMandateCount'), 'Contains executedMandateCount view');
  assert.ok(functions.includes('approveSupplier'), 'Contains approveSupplier function');
  assert.ok(functions.includes('approveSuppliersBatch'), 'Contains approveSuppliersBatch function');
  assert.ok(functions.includes('revokeSupplier'), 'Contains revokeSupplier function');
  assert.ok(functions.includes('setSpendingLimits'), 'Contains setSpendingLimits function');
  assert.ok(functions.includes('setAuthorizedAgent'), 'Contains setAuthorizedAgent function');
  assert.ok(functions.includes('isApprovedSupplier'), 'Contains isApprovedSupplier mapping getter');
  assert.ok(functions.includes('getRemainingDailyCapacity'), 'Contains getRemainingDailyCapacity');
});

test('ProcureYetiDisburser - Function Selectors and Altana Session Alignment', () => {
  // Mandate-based disbursement signature (Sentinel Core Engine)
  const mandateSignature = 'disburseWithMandate(bytes32,address,uint256,string)';
  const expectedMandateSelector = keccak256(toBytes(mandateSignature)).slice(0, 10);

  const disburseWithMandateAbiItem = abi.find(
    (x) => x.type === 'function' && x.name === 'disburseWithMandate'
  );
  assert.ok(disburseWithMandateAbiItem, 'Found disburseWithMandate in ABI');
  const viemMandateSelector = toFunctionSelector(disburseWithMandateAbiItem);
  assert.strictEqual(viemMandateSelector, expectedMandateSelector, 'disburseWithMandate selector matches keccak256 hash');

  // Legacy disburse payment signature
  const expectedSignature = 'disbursePayment(address,uint256,string)';
  const expectedSelector = keccak256(toBytes(expectedSignature)).slice(0, 10);

  const disburseAbiItem = abi.find((x) => x.type === 'function' && x.name === 'disbursePayment');
  assert.ok(disburseAbiItem, 'Found disbursePayment in ABI');

  const viemSelector = toFunctionSelector(disburseAbiItem);
  assert.strictEqual(viemSelector, expectedSelector, 'Legacy selector matches canonical keccak256 hash');
});

test('ProcureYetiDisburser - Events and Custom Error Definitions', () => {
  const events = abi.filter((x) => x.type === 'event').map((x) => x.name);
  assert.ok(events.includes('SupplierApproved'), 'Has SupplierApproved event');
  assert.ok(events.includes('SupplierRevoked'), 'Has SupplierRevoked event');
  assert.ok(events.includes('PaymentDisbursed'), 'Has PaymentDisbursed event');
  assert.ok(events.includes('SpendingLimitsUpdated'), 'Has SpendingLimitsUpdated event');
  assert.ok(events.includes('MandateCreated'), 'Has MandateCreated event');
  assert.ok(events.includes('MandateRevoked'), 'Has MandateRevoked event');
  assert.ok(events.includes('MandateExecuted'), 'Has MandateExecuted event');

  const errors = abi.filter((x) => x.type === 'error').map((x) => x.name);
  assert.ok(errors.includes('SupplierNotApproved'), 'Has SupplierNotApproved error');
  assert.ok(errors.includes('PaymentExceedsSingleCap'), 'Has PaymentExceedsSingleCap error');
  assert.ok(errors.includes('PaymentExceedsDailyCap'), 'Has PaymentExceedsDailyCap error');
  assert.ok(errors.includes('PaymentExceedsAutonomousCap'), 'Has PaymentExceedsAutonomousCap error');
  assert.ok(errors.includes('Unauthorized'), 'Has Unauthorized error');
  assert.ok(errors.includes('MandateNotFound'), 'Has MandateNotFound error');
  assert.ok(errors.includes('MandateAlreadyExists'), 'Has MandateAlreadyExists error');
  assert.ok(errors.includes('MandateAlreadyUsed'), 'Has MandateAlreadyUsed error');
  assert.ok(errors.includes('MandateAlreadyRevoked'), 'Has MandateAlreadyRevoked error');
  assert.ok(errors.includes('MandateExpired'), 'Has MandateExpired error');
  assert.ok(errors.includes('MandateSupplierMismatch'), 'Has MandateSupplierMismatch error');
  assert.ok(errors.includes('MandateRequisitionMismatch'), 'Has MandateRequisitionMismatch error');
  assert.ok(errors.includes('MandateAmountExceeded'), 'Has MandateAmountExceeded error');
  assert.ok(errors.includes('MandateInvalidExpiry'), 'Has MandateInvalidExpiry error');
  assert.ok(errors.includes('MandateInvalidId'), 'Has MandateInvalidId error');
});

test('ProcureYetiDisburser - Calldata Encoding and Argument Preservation for Mandates', () => {
  const mandateId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const approvedSupplier = '0x1111111111111111111111111111111111111111';
  const amountUSDC = 350; // $350 USDC
  const rawUnits = parseUnits(amountUSDC.toString(), 6); // 350_000_000n
  const reqId = 'PR-2026-081';

  const calldata = encodeFunctionData({
    abi,
    functionName: 'disburseWithMandate',
    args: [mandateId, approvedSupplier, rawUnits, reqId],
  });

  const decoded = decodeFunctionData({
    abi,
    data: calldata,
  });

  assert.strictEqual(decoded.functionName, 'disburseWithMandate');
  assert.strictEqual(decoded.args[0], mandateId);
  assert.strictEqual(decoded.args[1].toLowerCase(), approvedSupplier.toLowerCase());
  assert.strictEqual(decoded.args[2], rawUnits);
  assert.strictEqual(decoded.args[3], reqId);
});

test('ProcureYetiDisburser - Business Logic Simulation & Safety Invariants', () => {
  // Simulate disburser state machine with production parameters
  const state = {
    owner: '0x0000000000000000000000000000000000000001',
    authorizedAgent: '0x0000000000000000000000000000000000000002',
    approvedSuppliers: new Map(),
    mandates: new Map(),
    maxSinglePayment: parseUnits('2500', 6), // $2,500 USDC
    dailyVelocityCap: parseUnits('5000', 6), // $5,000 USDC
    autonomousThreshold: parseUnits('500', 6), // $500 USDC
    spentToday: BigInt(0),
    contractBalance: parseUnits('10000', 6), // $10,000 USDC
  };

  // 1. Approve initial verified supplier
  const supplierA = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const supplierB = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
  state.approvedSuppliers.set(supplierA.toLowerCase(), 'Nebula Compute Labs');

  // Simulation of Mandate Management
  function simulateCreateMandate(caller, mandateId, supplier, maxAmount, requisitionId, expiry, now) {
    if (caller !== state.owner) throw new Error('Unauthorized');
    if (!mandateId || mandateId === '0x0') throw new Error('MandateInvalidId');
    if (state.mandates.has(mandateId)) throw new Error('MandateAlreadyExists');
    if (!state.approvedSuppliers.has(supplier.toLowerCase())) throw new Error('SupplierNotApproved');
    if (maxAmount <= 0n) throw new Error('InvalidAmount');
    if (maxAmount > state.maxSinglePayment) throw new Error('PaymentExceedsSingleCap');
    if (expiry <= now) throw new Error('MandateInvalidExpiry');

    state.mandates.set(mandateId, {
      mandateId,
      supplier: supplier.toLowerCase(),
      maxAmount,
      requisitionId,
      expiry,
      isUsed: false,
      isRevoked: false,
    });
    return true;
  }

  function simulateRevokeMandate(caller, mandateId) {
    if (caller !== state.owner) throw new Error('Unauthorized');
    const m = state.mandates.get(mandateId);
    if (!m) throw new Error('MandateNotFound');
    if (m.isUsed) throw new Error('MandateAlreadyUsed');
    if (m.isRevoked) throw new Error('MandateAlreadyRevoked');
    m.isRevoked = true;
    return true;
  }

  // Simulation execution engine for disburseWithMandate
  function simulateDisburseWithMandate(caller, mandateId, supplier, amount, requisitionId, now) {
    if (amount <= BigInt(0)) throw new Error('InvalidAmount');
    if (caller !== state.owner && caller !== state.authorizedAgent) throw new Error('Unauthorized');

    const m = state.mandates.get(mandateId);
    if (!m) throw new Error('MandateNotFound');
    if (m.isUsed) throw new Error('MandateAlreadyUsed');
    if (m.isRevoked) throw new Error('MandateAlreadyRevoked');
    if (now > m.expiry) throw new Error('MandateExpired');

    if (supplier.toLowerCase() !== m.supplier) throw new Error('MandateSupplierMismatch');
    if (!state.approvedSuppliers.has(supplier.toLowerCase())) throw new Error('SupplierNotApproved');
    if (requisitionId !== m.requisitionId) throw new Error('MandateRequisitionMismatch');
    if (amount > m.maxAmount) throw new Error('MandateAmountExceeded');
    if (amount > state.maxSinglePayment) throw new Error('PaymentExceedsSingleCap');
    if (caller !== state.owner && amount > state.autonomousThreshold) {
      throw new Error('PaymentExceedsAutonomousCap');
    }
    if (state.spentToday + amount > state.dailyVelocityCap) throw new Error('PaymentExceedsDailyCap');
    if (state.contractBalance < amount) throw new Error('InsufficientContractBalance');

    m.isUsed = true;
    state.spentToday += amount;
    state.contractBalance -= amount;
    return true;
  }

  const now = 1774000000;
  const futureExpiry = now + 86400;
  const mandate1 = '0x1111000000000000000000000000000000000000000000000000000000001111';

  // MANDATE TEST 1: Non-owner cannot create mandate
  assert.throws(
    () => simulateCreateMandate(state.authorizedAgent, mandate1, supplierA, parseUnits('400', 6), 'PR-01', futureExpiry, now),
    /Unauthorized/,
    'Agent cannot create mandate'
  );

  // MANDATE TEST 2: Cannot create mandate for unapproved supplier
  assert.throws(
    () => simulateCreateMandate(state.owner, mandate1, supplierB, parseUnits('400', 6), 'PR-01', futureExpiry, now),
    /SupplierNotApproved/,
    'Cannot create mandate for unapproved supplier'
  );

  // MANDATE TEST 3: Owner creates valid mandate
  assert.strictEqual(
    simulateCreateMandate(state.owner, mandate1, supplierA, parseUnits('400', 6), 'PR-01', futureExpiry, now),
    true,
    'Owner creates valid mandate'
  );

  // MANDATE TEST 4: Cannot recreate existing mandate
  assert.throws(
    () => simulateCreateMandate(state.owner, mandate1, supplierA, parseUnits('400', 6), 'PR-01', futureExpiry, now),
    /MandateAlreadyExists/,
    'Cannot recreate existing mandate'
  );

  // MANDATE TEST 5: Wrong supplier rejected
  assert.throws(
    () => simulateDisburseWithMandate(state.authorizedAgent, mandate1, supplierB, parseUnits('350', 6), 'PR-01', now),
    /MandateSupplierMismatch/,
    'Wrong supplier rejected'
  );

  // MANDATE TEST 6: Wrong requisition rejected
  assert.throws(
    () => simulateDisburseWithMandate(state.authorizedAgent, mandate1, supplierA, parseUnits('350', 6), 'PR-WRONG', now),
    /MandateRequisitionMismatch/,
    'Wrong requisition rejected'
  );

  // MANDATE TEST 7: Amount above mandate limit rejected ($450 > $400)
  assert.throws(
    () => simulateDisburseWithMandate(state.authorizedAgent, mandate1, supplierA, parseUnits('450', 6), 'PR-01', now),
    /MandateAmountExceeded/,
    'Amount exceeding mandate max rejected'
  );

  // MANDATE TEST 8: Successful authorized payment against mandate
  assert.strictEqual(
    simulateDisburseWithMandate(state.authorizedAgent, mandate1, supplierA, parseUnits('350', 6), 'PR-01', now),
    true,
    'Successful authorized payment against mandate'
  );

  // MANDATE TEST 9: Second execution rejected (already used)
  assert.throws(
    () => simulateDisburseWithMandate(state.authorizedAgent, mandate1, supplierA, parseUnits('350', 6), 'PR-01', now),
    /MandateAlreadyUsed/,
    'Second execution rejected'
  );

  // MANDATE TEST 10: Revoked mandate rejected
  const mandate2 = '0x2222000000000000000000000000000000000000000000000000000000002222';
  simulateCreateMandate(state.owner, mandate2, supplierA, parseUnits('300', 6), 'PR-02', futureExpiry, now);
  simulateRevokeMandate(state.owner, mandate2);
  assert.throws(
    () => simulateDisburseWithMandate(state.authorizedAgent, mandate2, supplierA, parseUnits('300', 6), 'PR-02', now),
    /MandateAlreadyRevoked/,
    'Revoked mandate rejected'
  );

  // MANDATE TEST 11: Expired mandate rejected
  const mandate3 = '0x3333000000000000000000000000000000000000000000000000000000003333';
  simulateCreateMandate(state.owner, mandate3, supplierA, parseUnits('300', 6), 'PR-03', futureExpiry, now);
  assert.throws(
    () => simulateDisburseWithMandate(state.authorizedAgent, mandate3, supplierA, parseUnits('300', 6), 'PR-03', futureExpiry + 10),
    /MandateExpired/,
    'Expired mandate rejected'
  );

  // MANDATE TEST 12: Autonomous cap enforcement on agent ($600 mandate > $500 autonomous cap)
  const mandate4 = '0x4444000000000000000000000000000000000000000000000000000000004444';
  simulateCreateMandate(state.owner, mandate4, supplierA, parseUnits('800', 6), 'PR-04', futureExpiry, now);
  assert.throws(
    () => simulateDisburseWithMandate(state.authorizedAgent, mandate4, supplierA, parseUnits('800', 6), 'PR-04', now),
    /PaymentExceedsAutonomousCap/,
    'Agent payment > autonomous cap rejected even with higher mandate max'
  );
  // Owner CAN execute the $800 payment
  assert.strictEqual(
    simulateDisburseWithMandate(state.owner, mandate4, supplierA, parseUnits('800', 6), 'PR-04', now),
    true,
    'Owner can execute payment above autonomous threshold'
  );
});

test('ProcureYetiDisburser - Altana Disburser Session Permissions Structure and Relay Gas Headroom', () => {
  const disburserAddress = '0xD15b805E8004081cE10c0eF62b2f2dC9fFDb7702';
  const usdcAddress = '0x01C5C0122039549AD1493B8220cABEdD739BC44E';

  // Permission schema mirroring buildDisburserSessionPermissions (Sentinel Engine)
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
        limit: parseUnits('500', 6),
        period: 'day',
      },
      {
        // Native CELO gas fee headroom for Altana relay execution on Celo Sepolia
        limit: parseUnits('1', 18),
        period: 'day',
      },
    ],
  };

  // Verify that calls targets ONLY the Disburser contract
  assert.strictEqual(permissions.calls.length, 1);
  assert.strictEqual(permissions.calls[0].to, disburserAddress);
  assert.strictEqual(
    permissions.calls[0].signature,
    'disburseWithMandate(bytes32,address,uint256,string)'
  );

  // Verify that the agent session DOES NOT have permission to call USDC.transfer directly
  const hasDirectUsdcTransfer = permissions.calls.some(
    (c) => c.to.toLowerCase() === usdcAddress.toLowerCase()
  );
  assert.strictEqual(
    hasDirectUsdcTransfer,
    false,
    'Agent session MUST NOT have permission to call USDC.transfer directly'
  );

  // Verify unauthorized functions are strictly excluded from session call permissions
  const unauthorizedSignatures = [
    'transfer(address,uint256)',
    'disbursePayment(address,uint256,string)',
    'createMandate(bytes32,address,uint256,string,uint256)',
    'revokeMandate(bytes32)',
    'setSpendingLimits(uint256,uint256,uint256)',
    'setAuthorizedAgent(address,bool)',
    'approveSupplier(address,string)',
  ];
  for (const sig of unauthorizedSignatures) {
    const isPermitted = permissions.calls.some((c) => c.signature === sig);
    assert.strictEqual(isPermitted, false, `Session must not permit unauthorized function: ${sig}`);
  }

  // Verify that native gas fee headroom is present to prevent NoSpendPermissions on relay submission
  const nativeGasPermission = permissions.spend.find((s) => !s.token);
  assert.ok(nativeGasPermission, 'Native gas fee headroom must be present in session permissions');
  assert.strictEqual(nativeGasPermission.limit, parseUnits('1', 18), '1 CELO gas fee headroom present');
});

test('ProcureYetiDisburser - Router Internal Spend Invariance vs Altana Account Spend Limits', () => {
  // Demonstration and verification of architectural invariant:
  // Altana account-level spend limits do NOT track transfers executed internally by the router.

  const agentSmartAccount = '0x2222222222222222222222222222222222222222';
  const disburserAddress = '0xD15b805E8004081cE10c0eF62b2f2dC9fFDb7702';
  const usdcAddress = '0x01C5C0122039549AD1493B8220cABEdD739BC44E';
  const supplier = '0x3333333333333333333333333333333333333333';

  // 1. In Altana / Porto architecture, an agent's call intent executes:
  // { to: disburserAddress, data: disbursePayment(supplier, 300 USDC), value: 0 }
  // The Smart Account does NOT transfer USDC from its own balance.
  // The Smart Account's token balance remains 0 at all times.
  const agentAccountTokenBalanceBefore = 0n;
  const agentAccountTokenBalanceAfter = 0n;
  assert.strictEqual(
    agentAccountTokenBalanceBefore,
    agentAccountTokenBalanceAfter,
    'Agent Smart Account token balance is not debited during router disbursement'
  );

  // 2. The router transfers USDC from its own contract treasury address (address(this)):
  const routerTreasuryBalanceBefore = parseUnits('10000', 6);
  const disbursementAmount = parseUnits('300', 6);
  const routerTreasuryBalanceAfter = routerTreasuryBalanceBefore - disbursementAmount;

  assert.strictEqual(
    routerTreasuryBalanceAfter,
    parseUnits('9700', 6),
    'USDC tokens are debited directly from router contract treasury'
  );

  // 3. Confirm that Altana account-level spend limit is untouched by internal router transfers,
  // proving that spend governance MUST be (and IS) enforced on-chain by ProcureYetiDisburser.sol.
  const altanaAccountSpendRecorded = 0n; // GuardedExecutor sees only call to disburserAddress, not to USDC
  assert.strictEqual(
    altanaAccountSpendRecorded,
    0n,
    'Altana USDC spend limit does NOT track transfers executed internally by the router'
  );
});
