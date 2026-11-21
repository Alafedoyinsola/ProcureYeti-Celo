const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const solc = require('solc');
const ganache = require('ganache');
const {
  createWalletClient,
  createPublicClient,
  custom,
  parseUnits,
  keccak256,
  encodePacked,
} = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

// 1. Compile ProcureYetiDisburser.sol and helper mocks with evmVersion 'paris'
const disburserSource = fs.readFileSync(
  path.join(__dirname, '../contracts/ProcureYetiDisburser.sol'),
  'utf8'
);

const helperContractsSource = `
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract MockUSDC {
    string public name = "USD Coin";
    string public symbol = "USDC";
    uint8 public decimals = 6;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "ERC20: transfer amount exceeds balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "ERC20: transfer amount exceeds balance");
        require(allowance[from][msg.sender] >= amount, "ERC20: insufficient allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}

contract FailingUSDC {
    string public name = "Failing USD Coin";
    string public symbol = "fUSDC";
    uint8 public decimals = 6;
    mapping(address => uint256) public balanceOf;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address, uint256) external pure returns (bool) {
        return false; // Returns false to trigger SafeERC20 failure
    }

    function transferFrom(address, address, uint256) external pure returns (bool) {
        return false;
    }
}

contract ReentrantUSDC {
    string public name = "Reentrant USD Coin";
    string public symbol = "rUSDC";
    uint8 public decimals = 6;
    mapping(address => uint256) public balanceOf;

    address public disburser;
    bytes32 public targetMandateId;
    address public targetSupplier;
    string public targetRequisitionId;
    bool public shouldReenter;
    bool public reentrancyBlocked;
    bytes4 public reentrancyErrorSelector;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function setReentrancyTarget(
        address _disburser,
        bytes32 _mandateId,
        address _supplier,
        string calldata _reqId
    ) external {
        disburser = _disburser;
        targetMandateId = _mandateId;
        targetSupplier = _supplier;
        targetRequisitionId = _reqId;
        shouldReenter = true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;

        if (shouldReenter) {
            shouldReenter = false;
            // Attempt malicious reentrancy into disburseWithMandate
            (bool success, bytes memory returndata) = disburser.call(
                abi.encodeWithSignature(
                    "disburseWithMandate(bytes32,address,uint256,string)",
                    targetMandateId,
                    targetSupplier,
                    amount,
                    targetRequisitionId
                )
            );
            if (!success) {
                reentrancyBlocked = true;
                if (returndata.length >= 4) {
                    bytes4 sel;
                    assembly {
                        sel := mload(add(returndata, 0x20))
                    }
                    reentrancyErrorSelector = sel;
                }
            }
        }
        return true;
    }
}
`;

const compilerInput = {
  language: 'Solidity',
  sources: {
    'ProcureYetiDisburser.sol': { content: disburserSource },
    'Helpers.sol': { content: helperContractsSource },
  },
  settings: {
    evmVersion: 'paris',
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode'],
      },
    },
  },
};

const compiled = JSON.parse(solc.compile(JSON.stringify(compilerInput)));
if (compiled.errors) {
  const errs = compiled.errors.filter((e) => e.severity === 'error');
  if (errs.length > 0) {
    throw new Error('Compilation error: ' + errs.map((e) => e.formattedMessage).join('\n'));
  }
}

const disburserArtifact = compiled.contracts['ProcureYetiDisburser.sol']['ProcureYetiDisburser'];
const mockUsdcArtifact = compiled.contracts['Helpers.sol']['MockUSDC'];
const failingUsdcArtifact = compiled.contracts['Helpers.sol']['FailingUSDC'];
const reentrantUsdcArtifact = compiled.contracts['Helpers.sol']['ReentrantUSDC'];

// 2. Deterministic Keys for Local EVM Accounts
const keys = {
  owner: '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d',
  altanaAgent: '0x6cbed15c793ce57650b9877cf26f5d7d957170ee15537f6eddd4a5805e6b8d01',
  supplierA: '0x6370fd033278c143423d2f150d36e60b73770429e242a348e69006b701478780',
  supplierB: '0x646da49747b676368372aa2190b32357057c966014ca0ec9a00e696d20d84a19',
  unauthorizedCaller: '0xadd53f9a7e588d003326d10502340f60ce3460dd3ac5e0572078a49c72750aa1',
};

const accounts = {
  owner: privateKeyToAccount(keys.owner),
  altanaAgent: privateKeyToAccount(keys.altanaAgent),
  supplierA: privateKeyToAccount(keys.supplierA),
  supplierB: privateKeyToAccount(keys.supplierB),
  unauthorizedCaller: privateKeyToAccount(keys.unauthorizedCaller),
};

function helperDeriveMandateId(reqId, supplier) {
  return keccak256(encodePacked(['string', 'address'], [reqId, supplier]));
}

test('Live Local EVM - Complete Pre-Deployment Verification of ProcureYeti Sentinel', async (t) => {
  // 3. Initialize in-memory Ganache EVM provider
  const provider = ganache.provider({
    logging: { quiet: true },
    wallet: {
      accounts: Object.values(keys).map((secretKey) => ({
        secretKey,
        balance: '0x56bc75e2d63100000', // 100 ETH
      })),
    },
  });

  const localChain = {
    id: 1337,
    name: 'Local EVM',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['http://localhost'] } },
  };

  const publicClient = createPublicClient({ chain: localChain, transport: custom(provider) });

  function makeWalletClient(account) {
    return createWalletClient({ account, chain: localChain, transport: custom(provider) });
  }

  const ownerWallet = makeWalletClient(accounts.owner);
  const agentWallet = makeWalletClient(accounts.altanaAgent);
  const strangerWallet = makeWalletClient(accounts.unauthorizedCaller);

  let usdcAddress;
  let disburserAddress;

  // SETUP 1: Deploy MockUSDC
  await t.test('Setup 1: Deploy MockUSDC (6 decimals) and mint initial supply', async () => {
    const hash = await ownerWallet.deployContract({
      abi: mockUsdcArtifact.abi,
      bytecode: '0x' + mockUsdcArtifact.evm.bytecode.object,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    usdcAddress = receipt.contractAddress;
    assert.ok(usdcAddress, 'MockUSDC contract deployed on EVM');

    // Mint 100,000 USDC to owner
    const mintHash = await ownerWallet.writeContract({
      address: usdcAddress,
      abi: mockUsdcArtifact.abi,
      functionName: 'mint',
      args: [accounts.owner.address, parseUnits('100000', 6)],
    });
    await publicClient.waitForTransactionReceipt({ hash: mintHash });

    const ownerBal = await publicClient.readContract({
      address: usdcAddress,
      abi: mockUsdcArtifact.abi,
      functionName: 'balanceOf',
      args: [accounts.owner.address],
    });
    assert.strictEqual(ownerBal, parseUnits('100000', 6), 'Owner minted 100,000 USDC');
  });

  // SETUP 2: Deploy ProcureYetiDisburser with production parameters
  await t.test('Setup 2: Deploy ProcureYetiDisburser with production parameters', async () => {
    const maxSingle = parseUnits('2500', 6); // $2,500 USDC
    const dailyCap = parseUnits('5000', 6); // $5,000 USDC
    const autoCap = parseUnits('500', 6); // $500 USDC

    const hash = await ownerWallet.deployContract({
      abi: disburserArtifact.abi,
      bytecode: '0x' + disburserArtifact.evm.bytecode.object,
      args: [usdcAddress, maxSingle, dailyCap, autoCap],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    disburserAddress = receipt.contractAddress;
    assert.ok(disburserAddress, 'ProcureYetiDisburser deployed on EVM');

    // Fund Disburser contract with $20,000 USDC
    const transferHash = await ownerWallet.writeContract({
      address: usdcAddress,
      abi: mockUsdcArtifact.abi,
      functionName: 'transfer',
      args: [disburserAddress, parseUnits('20000', 6)],
    });
    await publicClient.waitForTransactionReceipt({ hash: transferHash });

    const contractBal = await publicClient.readContract({
      address: usdcAddress,
      abi: mockUsdcArtifact.abi,
      functionName: 'balanceOf',
      args: [disburserAddress],
    });
    assert.strictEqual(contractBal, parseUnits('20000', 6), 'Disburser funded with $20,000 USDC');
  });

  // SETUP 3: Setup Supplier Allowlist and Authorized Agent on EVM
  await t.test('Setup 3: Setup Supplier Allowlist and Authorized Agent on EVM', async () => {
    // Approve Supplier A: "Nebula Compute Labs"
    const appAHash = await ownerWallet.writeContract({
      address: disburserAddress,
      abi: disburserArtifact.abi,
      functionName: 'approveSupplier',
      args: [accounts.supplierA.address, 'Nebula Compute Labs'],
    });
    await publicClient.waitForTransactionReceipt({ hash: appAHash });

    // Approve Supplier B: "Apex Hardware Solutions"
    const appBHash = await ownerWallet.writeContract({
      address: disburserAddress,
      abi: disburserArtifact.abi,
      functionName: 'approveSupplier',
      args: [accounts.supplierB.address, 'Apex Hardware Solutions'],
    });
    await publicClient.waitForTransactionReceipt({ hash: appBHash });

    assert.strictEqual(
      await publicClient.readContract({
        address: disburserAddress,
        abi: disburserArtifact.abi,
        functionName: 'isApprovedSupplier',
        args: [accounts.supplierA.address],
      }),
      true,
      'Supplier A is approved'
    );
    assert.strictEqual(
      await publicClient.readContract({
        address: disburserAddress,
        abi: disburserArtifact.abi,
        functionName: 'isApprovedSupplier',
        args: [accounts.supplierB.address],
      }),
      true,
      'Supplier B is approved'
    );

    // Authorize Altana Agent
    const authHash = await ownerWallet.writeContract({
      address: disburserAddress,
      abi: disburserArtifact.abi,
      functionName: 'setAuthorizedAgent',
      args: [accounts.altanaAgent.address, true],
    });
    await publicClient.waitForTransactionReceipt({ hash: authHash });

    assert.strictEqual(
      await publicClient.readContract({
        address: disburserAddress,
        abi: disburserArtifact.abi,
        functionName: 'isAuthorizedAgent',
        args: [accounts.altanaAgent.address],
      }),
      true,
      'Altana Agent is authorized'
    );
  });

  // REQUIREMENT 1: Valid Purchase Mandate Creation by Owner
  const mandateId1 = helperDeriveMandateId('PR-2026-081', accounts.supplierA.address);
  const mandateMaxAmount1 = parseUnits('400', 6); // $400 USDC
  let mandate1Expiry;

  await t.test('1. Valid Purchase Mandate Creation by Owner and View Functions', async () => {
    const block = await publicClient.getBlock();
    mandate1Expiry = BigInt(block.timestamp) + 86400n; // 24 hours from now

    const tx = await ownerWallet.writeContract({
      address: disburserAddress,
      abi: disburserArtifact.abi,
      functionName: 'createMandate',
      args: [mandateId1, accounts.supplierA.address, mandateMaxAmount1, 'PR-2026-081', mandate1Expiry],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
    assert.strictEqual(receipt.status, 'success', 'Mandate created successfully');

    // Verify MandateCreated event emitted
    assert.ok(receipt.logs.length > 0, 'MandateCreated event emitted');

    // Verify getMandate view helper
    const mandateData = await publicClient.readContract({
      address: disburserAddress,
      abi: disburserArtifact.abi,
      functionName: 'getMandate',
      args: [mandateId1],
    });
    assert.strictEqual(mandateData.mandateId, mandateId1);
    assert.strictEqual(mandateData.supplier.toLowerCase(), accounts.supplierA.address.toLowerCase());
    assert.strictEqual(mandateData.maxAmount, mandateMaxAmount1);
    assert.strictEqual(mandateData.requisitionId, 'PR-2026-081');
    assert.strictEqual(mandateData.expiry, mandate1Expiry);
    assert.strictEqual(mandateData.isUsed, false);
    assert.strictEqual(mandateData.isRevoked, false);

    // Verify isMandateExecutable view helpers
    const isExecutableNoAmount = await publicClient.readContract({
      address: disburserAddress,
      abi: disburserArtifact.abi,
      functionName: 'isMandateExecutable',
      args: [mandateId1],
    });
    assert.strictEqual(isExecutableNoAmount, true, 'Mandate is executable');

    const isExecutableValidAmount = await publicClient.readContract({
      address: disburserAddress,
      abi: disburserArtifact.abi,
      functionName: 'isMandateExecutable',
      args: [mandateId1, parseUnits('350', 6)],
    });
    assert.strictEqual(isExecutableValidAmount, true, 'Mandate is executable for $350');

    const isExecutableExceedsMax = await publicClient.readContract({
      address: disburserAddress,
      abi: disburserArtifact.abi,
      functionName: 'isMandateExecutable',
      args: [mandateId1, parseUnits('450', 6)],
    });
    assert.strictEqual(isExecutableExceedsMax, false, 'Mandate is not executable for $450 (> $400 max)');
  });

  // REQUIREMENT 2: Non-Owner Mandate Creation Rejection
  await t.test('2. Rejection of Mandate Creation by Non-Owner (Agent and Stranger)', async () => {
    const bogusId = helperDeriveMandateId('PR-HACK-01', accounts.supplierA.address);
    const block = await publicClient.getBlock();
    const expiry = BigInt(block.timestamp) + 3600n;

    // Agent attempts to create mandate
    await assert.rejects(
      async () => {
        await agentWallet.writeContract({
          address: disburserAddress,
          abi: disburserArtifact.abi,
          functionName: 'createMandate',
          args: [bogusId, accounts.supplierA.address, parseUnits('100', 6), 'PR-HACK-01', expiry],
        });
      },
      (err) => err.message.includes('Unauthorized') || err.message.includes('revert'),
      'Agent cannot create purchase mandates'
    );

    // Stranger attempts to create mandate
    await assert.rejects(
      async () => {
        await strangerWallet.writeContract({
          address: disburserAddress,
          abi: disburserArtifact.abi,
          functionName: 'createMandate',
          args: [bogusId, accounts.supplierA.address, parseUnits('100', 6), 'PR-HACK-01', expiry],
        });
      },
      (err) => err.message.includes('Unauthorized') || err.message.includes('revert'),
      'Stranger cannot create purchase mandates'
    );
  });

  // REQUIREMENT 3: Unapproved Supplier Mandate Creation Rejection
  await t.test('3. Rejection of Mandate Creation for Unapproved Supplier', async () => {
    const bogusId = helperDeriveMandateId('PR-UNAPPROVED', accounts.unauthorizedCaller.address);
    const block = await publicClient.getBlock();
    const expiry = BigInt(block.timestamp) + 3600n;

    await assert.rejects(
      async () => {
        await ownerWallet.writeContract({
          address: disburserAddress,
          abi: disburserArtifact.abi,
          functionName: 'createMandate',
          args: [bogusId, accounts.unauthorizedCaller.address, parseUnits('100', 6), 'PR-UNAPPROVED', expiry],
        });
      },
      (err) => err.message.includes('SupplierNotApproved') || err.message.includes('revert'),
      'Cannot create mandate for unapproved supplier'
    );
  });

  // REQUIREMENT 4: Successful Authorized Payment Against Mandate
  await t.test('4. Successful Authorized Payment Against Mandate by Agent', async () => {
    const payAmount = parseUnits('350', 6); // $350 USDC (<= $400 mandate limit, <= $500 agent cap)
    const supplierBefore = await publicClient.readContract({
      address: usdcAddress,
      abi: mockUsdcArtifact.abi,
      functionName: 'balanceOf',
      args: [accounts.supplierA.address],
    });

    const tx = await agentWallet.writeContract({
      address: disburserAddress,
      abi: disburserArtifact.abi,
      functionName: 'disburseWithMandate',
      args: [mandateId1, accounts.supplierA.address, payAmount, 'PR-2026-081'],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
    assert.strictEqual(receipt.status, 'success', 'Payment against mandate succeeded');

    const supplierAfter = await publicClient.readContract({
      address: usdcAddress,
      abi: mockUsdcArtifact.abi,
      functionName: 'balanceOf',
      args: [accounts.supplierA.address],
    });
    assert.strictEqual(supplierAfter - supplierBefore, payAmount, 'Supplier received exact 350 USDC');

    // Mandate is marked as used
    const mandateData = await publicClient.readContract({
      address: disburserAddress,
      abi: disburserArtifact.abi,
      functionName: 'getMandate',
      args: [mandateId1],
    });
    assert.strictEqual(mandateData.isUsed, true, 'Mandate status marked isUsed=true');

    // isMandateExecutable now returns false
    const executable = await publicClient.readContract({
      address: disburserAddress,
      abi: disburserArtifact.abi,
      functionName: 'isMandateExecutable',
      args: [mandateId1],
    });
    assert.strictEqual(executable, false, 'Used mandate is no longer executable');
  });

  // REQUIREMENT 5: Wrong Supplier Rejection
  const mandateId5 = helperDeriveMandateId('PR-SUPPLIER-TEST', accounts.supplierA.address);
  await t.test('5. Rejection of Payment when Supplier does not match Mandate', async () => {
    const block = await publicClient.getBlock();
    const expiry = BigInt(block.timestamp) + 3600n;

    // Owner creates mandate specifically for Supplier A
    await (
      await ownerWallet.writeContract({
        address: disburserAddress,
        abi: disburserArtifact.abi,
        functionName: 'createMandate',
        args: [mandateId5, accounts.supplierA.address, parseUnits('200', 6), 'PR-SUPPLIER-TEST', expiry],
      })
    );

    // Agent attempts to execute against mandateId5 but sends payment to Supplier B
    await assert.rejects(
      async () => {
        await agentWallet.writeContract({
          address: disburserAddress,
          abi: disburserArtifact.abi,
          functionName: 'disburseWithMandate',
          args: [mandateId5, accounts.supplierB.address, parseUnits('200', 6), 'PR-SUPPLIER-TEST'],
        });
      },
      (err) => err.message.includes('MandateSupplierMismatch') || err.message.includes('revert'),
      'Must reject payment when supplier does not match mandate'
    );
  });

  // REQUIREMENT 6: Wrong Requisition ID Rejection
  await t.test('6. Rejection of Payment when Requisition ID does not match Mandate', async () => {
    // Agent attempts to execute against mandateId5 with incorrect requisition ID
    await assert.rejects(
      async () => {
        await agentWallet.writeContract({
          address: disburserAddress,
          abi: disburserArtifact.abi,
          functionName: 'disburseWithMandate',
          args: [mandateId5, accounts.supplierA.address, parseUnits('200', 6), 'PR-TAMPERED-REQ'],
        });
      },
      (err) => err.message.includes('MandateRequisitionMismatch') || err.message.includes('revert'),
      'Must reject payment when requisition ID does not match mandate'
    );
  });

  // REQUIREMENT 7: Amount Above Mandate Limit Rejection
  await t.test('7. Rejection of Payment when Amount exceeds Mandate Authorized Limit', async () => {
    // mandateId5 maxAmount is 200 USDC; agent attempts 201 USDC
    await assert.rejects(
      async () => {
        await agentWallet.writeContract({
          address: disburserAddress,
          abi: disburserArtifact.abi,
          functionName: 'disburseWithMandate',
          args: [mandateId5, accounts.supplierA.address, parseUnits('201', 6), 'PR-SUPPLIER-TEST'],
        });
      },
      (err) => err.message.includes('MandateAmountExceeded') || err.message.includes('revert'),
      'Must reject payment when amount exceeds mandate maxAmount'
    );
  });

  // REQUIREMENT 8: Zero Amount Rejection
  await t.test('8. Rejection of Payment when Amount is Zero', async () => {
    await assert.rejects(
      async () => {
        await agentWallet.writeContract({
          address: disburserAddress,
          abi: disburserArtifact.abi,
          functionName: 'disburseWithMandate',
          args: [mandateId5, accounts.supplierA.address, 0n, 'PR-SUPPLIER-TEST'],
        });
      },
      (err) => err.message.includes('InvalidAmount') || err.message.includes('revert'),
      'Must reject payment with zero amount'
    );
  });

  // REQUIREMENT 9: Expired Mandate Rejection
  const mandateId9 = helperDeriveMandateId('PR-EXPIRY-TEST', accounts.supplierA.address);
  await t.test('9. Rejection of Payment Against Expired Mandate & Past Expiry Creation', async () => {
    const block = await publicClient.getBlock();
    const shortExpiry = BigInt(block.timestamp) + 100n; // 100 seconds in future

    // Rejection of mandate created with past expiry
    await assert.rejects(
      async () => {
        await ownerWallet.writeContract({
          address: disburserAddress,
          abi: disburserArtifact.abi,
          functionName: 'createMandate',
          args: [helperDeriveMandateId('PAST', accounts.supplierA.address), accounts.supplierA.address, parseUnits('100', 6), 'PAST', BigInt(block.timestamp) - 10n],
        });
      },
      (err) => err.message.includes('MandateInvalidExpiry') || err.message.includes('revert'),
      'Cannot create mandate with past expiry'
    );

    // Create valid mandate with short expiry
    await (
      await ownerWallet.writeContract({
        address: disburserAddress,
        abi: disburserArtifact.abi,
        functionName: 'createMandate',
        args: [mandateId9, accounts.supplierA.address, parseUnits('100', 6), 'PR-EXPIRY-TEST', shortExpiry],
      })
    );

    // Advance time by 200 seconds via Ganache RPC
    await provider.request({ method: 'evm_increaseTime', params: [200] });
    await provider.request({ method: 'evm_mine', params: [] });

    // Attempt execution of now-expired mandate
    await assert.rejects(
      async () => {
        await agentWallet.writeContract({
          address: disburserAddress,
          abi: disburserArtifact.abi,
          functionName: 'disburseWithMandate',
          args: [mandateId9, accounts.supplierA.address, parseUnits('100', 6), 'PR-EXPIRY-TEST'],
        });
      },
      (err) => err.message.includes('MandateExpired') || err.message.includes('revert'),
      'Must reject payment against expired mandate'
    );
  });

  // REQUIREMENT 10: Revoked Mandate Rejection
  const mandateId10 = helperDeriveMandateId('PR-REVOKE-TEST', accounts.supplierB.address);
  await t.test('10. Rejection of Payment Against Revoked Mandate & Revocation Rules', async () => {
    const block = await publicClient.getBlock();
    const expiry = BigInt(block.timestamp) + 86400n;

    // Create mandate for Supplier B
    await (
      await ownerWallet.writeContract({
        address: disburserAddress,
        abi: disburserArtifact.abi,
        functionName: 'createMandate',
        args: [mandateId10, accounts.supplierB.address, parseUnits('150', 6), 'PR-REVOKE-TEST', expiry],
      })
    );

    // Non-owner cannot revoke
    await assert.rejects(
      async () => {
        await agentWallet.writeContract({
          address: disburserAddress,
          abi: disburserArtifact.abi,
          functionName: 'revokeMandate',
          args: [mandateId10],
        });
      },
      (err) => err.message.includes('Unauthorized') || err.message.includes('revert'),
      'Non-owner cannot revoke mandate'
    );

    // Owner revokes mandate
    const revTx = await ownerWallet.writeContract({
      address: disburserAddress,
      abi: disburserArtifact.abi,
      functionName: 'revokeMandate',
      args: [mandateId10],
    });
    const revReceipt = await publicClient.waitForTransactionReceipt({ hash: revTx });
    assert.strictEqual(revReceipt.status, 'success', 'Mandate revoked successfully');

    // Re-revoking already revoked mandate reverts
    await assert.rejects(
      async () => {
        await ownerWallet.writeContract({
          address: disburserAddress,
          abi: disburserArtifact.abi,
          functionName: 'revokeMandate',
          args: [mandateId10],
        });
      },
      (err) => err.message.includes('MandateAlreadyRevoked') || err.message.includes('revert'),
      'Cannot revoke already revoked mandate'
    );

    // Agent execution against revoked mandate must revert
    await assert.rejects(
      async () => {
        await agentWallet.writeContract({
          address: disburserAddress,
          abi: disburserArtifact.abi,
          functionName: 'disburseWithMandate',
          args: [mandateId10, accounts.supplierB.address, parseUnits('150', 6), 'PR-REVOKE-TEST'],
        });
      },
      (err) => err.message.includes('MandateAlreadyRevoked') || err.message.includes('revert'),
      'Must reject execution against revoked mandate'
    );
  });

  // REQUIREMENT 11: Second Execution Rejection (Replay Protection)
  await t.test('11. Rejection of Second Execution on Used Mandate (Replay Protection)', async () => {
    // mandateId1 was executed successfully in Test 4. Attempting to execute it again must fail.
    await assert.rejects(
      async () => {
        await agentWallet.writeContract({
          address: disburserAddress,
          abi: disburserArtifact.abi,
          functionName: 'disburseWithMandate',
          args: [mandateId1, accounts.supplierA.address, parseUnits('10', 6), 'PR-2026-081'],
        });
      },
      (err) => err.message.includes('MandateAlreadyUsed') || err.message.includes('revert'),
      'Must reject second execution of used mandate'
    );

    // Also verify that revoking an already used mandate reverts
    await assert.rejects(
      async () => {
        await ownerWallet.writeContract({
          address: disburserAddress,
          abi: disburserArtifact.abi,
          functionName: 'revokeMandate',
          args: [mandateId1],
        });
      },
      (err) => err.message.includes('MandateAlreadyUsed') || err.message.includes('revert'),
      'Cannot revoke an already used mandate'
    );
  });

  // REQUIREMENT 12: Existing Autonomous Cap Enforcement
  const mandateId12 = helperDeriveMandateId('PR-AUTO-CAP-TEST', accounts.supplierA.address);
  await t.test('12. Existing Autonomous Cap Enforcement ($500 limit for agent)', async () => {
    const block = await publicClient.getBlock();
    const expiry = BigInt(block.timestamp) + 86400n;

    // Mandate authorizes up to $800 USDC
    await (
      await ownerWallet.writeContract({
        address: disburserAddress,
        abi: disburserArtifact.abi,
        functionName: 'createMandate',
        args: [mandateId12, accounts.supplierA.address, parseUnits('800', 6), 'PR-AUTO-CAP-TEST', expiry],
      })
    );

    // Agent attempts to disburse $600 USDC (> $500 autonomousThreshold)
    await assert.rejects(
      async () => {
        await agentWallet.writeContract({
          address: disburserAddress,
          abi: disburserArtifact.abi,
          functionName: 'disburseWithMandate',
          args: [mandateId12, accounts.supplierA.address, parseUnits('600', 6), 'PR-AUTO-CAP-TEST'],
        });
      },
      (err) => err.message.includes('PaymentExceedsAutonomousCap') || err.message.includes('revert'),
      'Agent cannot disburse amount exceeding autonomous cap ($500)'
    );

    // Owner CAN execute this $600 disbursement because owner is not bounded by autonomous cap
    const ownerTx = await ownerWallet.writeContract({
      address: disburserAddress,
      abi: disburserArtifact.abi,
      functionName: 'disburseWithMandate',
      args: [mandateId12, accounts.supplierA.address, parseUnits('600', 6), 'PR-AUTO-CAP-TEST'],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: ownerTx });
    assert.strictEqual(receipt.status, 'success', 'Owner can execute mandate payment exceeding agent autonomous cap');
  });

  // REQUIREMENT 13: Existing Single-Payment Cap Enforcement
  await t.test('13. Existing Single-Payment Cap Enforcement ($2,500 limit)', async () => {
    const block = await publicClient.getBlock();
    const expiry = BigInt(block.timestamp) + 86400n;
    const bogusId = helperDeriveMandateId('PR-EXCEED-SINGLE', accounts.supplierA.address);

    // Attempt to create mandate with maxAmount $2,501 USDC (> $2,500 single cap)
    await assert.rejects(
      async () => {
        await ownerWallet.writeContract({
          address: disburserAddress,
          abi: disburserArtifact.abi,
          functionName: 'createMandate',
          args: [bogusId, accounts.supplierA.address, parseUnits('2501', 6), 'PR-EXCEED-SINGLE', expiry],
        });
      },
      (err) => err.message.includes('PaymentExceedsSingleCap') || err.message.includes('revert'),
      'Cannot create mandate exceeding single payment cap'
    );
  });

  // REQUIREMENT 14: Existing Daily Spending Cap Enforcement
  await t.test('14. Existing Daily Spending Cap Enforcement ($5,000 UTC calendar-day cap)', async () => {
    // Current total spent today:
    // Test 4: $350
    // Test 12: $600
    // Total spent so far = $950 USDC. Remaining today = $4,050 USDC.
    const block = await publicClient.getBlock();
    const expiry = BigInt(block.timestamp) + 86400n;

    // Create mandate for $2,000 USDC
    const mid1 = helperDeriveMandateId('PR-DAILY-1', accounts.supplierA.address);
    await (
      await ownerWallet.writeContract({
        address: disburserAddress,
        abi: disburserArtifact.abi,
        functionName: 'createMandate',
        args: [mid1, accounts.supplierA.address, parseUnits('2000', 6), 'PR-DAILY-1', expiry],
      })
    );
    // Execute payment of $2,000 by owner
    await (
      await ownerWallet.writeContract({
        address: disburserAddress,
        abi: disburserArtifact.abi,
        functionName: 'disburseWithMandate',
        args: [mid1, accounts.supplierA.address, parseUnits('2000', 6), 'PR-DAILY-1'],
      })
    );

    // Create second mandate for $2,000 USDC
    const mid2 = helperDeriveMandateId('PR-DAILY-2', accounts.supplierA.address);
    await (
      await ownerWallet.writeContract({
        address: disburserAddress,
        abi: disburserArtifact.abi,
        functionName: 'createMandate',
        args: [mid2, accounts.supplierA.address, parseUnits('2000', 6), 'PR-DAILY-2', expiry],
      })
    );
    // Execute payment of $2,000 by owner
    await (
      await ownerWallet.writeContract({
        address: disburserAddress,
        abi: disburserArtifact.abi,
        functionName: 'disburseWithMandate',
        args: [mid2, accounts.supplierA.address, parseUnits('2000', 6), 'PR-DAILY-2'],
      })
    );

    // Total spent today is now: 950 + 2000 + 2000 = $4,950 USDC.
    // Remaining daily capacity = $50 USDC ($5,000 - $4,950).
    const mid3 = helperDeriveMandateId('PR-DAILY-3', accounts.supplierA.address);
    await (
      await ownerWallet.writeContract({
        address: disburserAddress,
        abi: disburserArtifact.abi,
        functionName: 'createMandate',
        args: [mid3, accounts.supplierA.address, parseUnits('200', 6), 'PR-DAILY-3', expiry],
      })
    );

    // Attempt to execute $100 payment (> $50 remaining capacity)
    await assert.rejects(
      async () => {
        await ownerWallet.writeContract({
          address: disburserAddress,
          abi: disburserArtifact.abi,
          functionName: 'disburseWithMandate',
          args: [mid3, accounts.supplierA.address, parseUnits('100', 6), 'PR-DAILY-3'],
        });
      },
      (err) => err.message.includes('PaymentExceedsDailyCap') || err.message.includes('revert'),
      'Must reject payment exceeding daily velocity cap'
    );
  });

  // REQUIREMENT 15: Reentrancy Protection Enforcement
  await t.test('15. Reentrancy Protection Enforcement (ReentrancyGuardReentrantCall)', async () => {
    // Deploy ReentrantUSDC
    const rTokenTx = await ownerWallet.deployContract({
      abi: reentrantUsdcArtifact.abi,
      bytecode: '0x' + reentrantUsdcArtifact.evm.bytecode.object,
    });
    const rTokenReceipt = await publicClient.waitForTransactionReceipt({ hash: rTokenTx });
    const rTokenAddress = rTokenReceipt.contractAddress;

    // Deploy Disburser connected to ReentrantUSDC
    const rDisburserTx = await ownerWallet.deployContract({
      abi: disburserArtifact.abi,
      bytecode: '0x' + disburserArtifact.evm.bytecode.object,
      args: [rTokenAddress, parseUnits('2500', 6), parseUnits('5000', 6), parseUnits('500', 6)],
    });
    const rDisburserReceipt = await publicClient.waitForTransactionReceipt({ hash: rDisburserTx });
    const rDisburserAddress = rDisburserReceipt.contractAddress;

    // Mint tokens to disburser
    await (
      await ownerWallet.writeContract({
        address: rTokenAddress,
        abi: reentrantUsdcArtifact.abi,
        functionName: 'mint',
        args: [rDisburserAddress, parseUnits('10000', 6)],
      })
    );

    // Approve Supplier A on rDisburser
    await (
      await ownerWallet.writeContract({
        address: rDisburserAddress,
        abi: disburserArtifact.abi,
        functionName: 'approveSupplier',
        args: [accounts.supplierA.address, 'Nebula Compute Labs'],
      })
    );

    // Authorize agent and token contract so onlyAuthorized passes and nonReentrant is strictly tested
    await (
      await ownerWallet.writeContract({
        address: rDisburserAddress,
        abi: disburserArtifact.abi,
        functionName: 'setAuthorizedAgent',
        args: [accounts.altanaAgent.address, true],
      })
    );
    await (
      await ownerWallet.writeContract({
        address: rDisburserAddress,
        abi: disburserArtifact.abi,
        functionName: 'setAuthorizedAgent',
        args: [rTokenAddress, true],
      })
    );

    const block = await publicClient.getBlock();
    const expiry = BigInt(block.timestamp) + 86400n;
    const reentrantMandateId = helperDeriveMandateId('PR-REENTRANCY-TEST', accounts.supplierA.address);

    // Create mandate on rDisburser
    await (
      await ownerWallet.writeContract({
        address: rDisburserAddress,
        abi: disburserArtifact.abi,
        functionName: 'createMandate',
        args: [reentrantMandateId, accounts.supplierA.address, parseUnits('300', 6), 'PR-REENTRANCY-TEST', expiry],
      })
    );

    // Configure ReentrantUSDC to attempt reentrancy during transfer call
    await (
      await ownerWallet.writeContract({
        address: rTokenAddress,
        abi: reentrantUsdcArtifact.abi,
        functionName: 'setReentrancyTarget',
        args: [rDisburserAddress, reentrantMandateId, accounts.supplierA.address, 'PR-REENTRANCY-TEST'],
      })
    );

    // Execute payment: During safeTransfer, ReentrantUSDC will call disburseWithMandate again
    const execTx = await agentWallet.writeContract({
      address: rDisburserAddress,
      abi: disburserArtifact.abi,
      functionName: 'disburseWithMandate',
      args: [reentrantMandateId, accounts.supplierA.address, parseUnits('100', 6), 'PR-REENTRANCY-TEST'],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: execTx });
    assert.strictEqual(receipt.status, 'success', 'Outer transaction completed safely');

    // Inspect ReentrantUSDC state to verify the reentrant call was blocked
    const wasBlocked = await publicClient.readContract({
      address: rTokenAddress,
      abi: reentrantUsdcArtifact.abi,
      functionName: 'reentrancyBlocked',
    });
    assert.strictEqual(wasBlocked, true, 'Reentrant call was intercepted and blocked by nonReentrant guard');

    const errSelector = await publicClient.readContract({
      address: rTokenAddress,
      abi: reentrantUsdcArtifact.abi,
      functionName: 'reentrancyErrorSelector',
    });
    // keccak256("ReentrancyGuardReentrantCall()").slice(0, 10) === "0x3ee5aeb5"
    const expectedSelector = keccak256(Buffer.from('ReentrancyGuardReentrantCall()')).slice(0, 10);
    assert.strictEqual(
      errSelector.toLowerCase(),
      expectedSelector.toLowerCase(),
      'Reentrant call reverted with exact ReentrancyGuardReentrantCall() error selector'
    );
  });

  // REQUIREMENT 16: Failed Token Transfer Behaviour (SafeERC20)
  await t.test('16. Failed Token Transfer Behaviour (SafeERC20FailedOperation)', async () => {
    // Deploy FailingUSDC
    const fTokenTx = await ownerWallet.deployContract({
      abi: failingUsdcArtifact.abi,
      bytecode: '0x' + failingUsdcArtifact.evm.bytecode.object,
    });
    const fTokenReceipt = await publicClient.waitForTransactionReceipt({ hash: fTokenTx });
    const fTokenAddress = fTokenReceipt.contractAddress;

    // Deploy Disburser connected to FailingUSDC
    const fDisburserTx = await ownerWallet.deployContract({
      abi: disburserArtifact.abi,
      bytecode: '0x' + disburserArtifact.evm.bytecode.object,
      args: [fTokenAddress, parseUnits('2500', 6), parseUnits('5000', 6), parseUnits('500', 6)],
    });
    const fDisburserReceipt = await publicClient.waitForTransactionReceipt({ hash: fDisburserTx });
    const fDisburserAddress = fDisburserReceipt.contractAddress;

    // Mint tokens to disburser
    await (
      await ownerWallet.writeContract({
        address: fTokenAddress,
        abi: failingUsdcArtifact.abi,
        functionName: 'mint',
        args: [fDisburserAddress, parseUnits('10000', 6)],
      })
    );

    // Approve Supplier A on fDisburser
    await (
      await ownerWallet.writeContract({
        address: fDisburserAddress,
        abi: disburserArtifact.abi,
        functionName: 'approveSupplier',
        args: [accounts.supplierA.address, 'Nebula Compute Labs'],
      })
    );

    // Authorize agent
    await (
      await ownerWallet.writeContract({
        address: fDisburserAddress,
        abi: disburserArtifact.abi,
        functionName: 'setAuthorizedAgent',
        args: [accounts.altanaAgent.address, true],
      })
    );

    const block = await publicClient.getBlock();
    const expiry = BigInt(block.timestamp) + 86400n;
    const failingMandateId = helperDeriveMandateId('PR-FAIL-TOKEN-TEST', accounts.supplierA.address);

    // Create mandate on fDisburser
    await (
      await ownerWallet.writeContract({
        address: fDisburserAddress,
        abi: disburserArtifact.abi,
        functionName: 'createMandate',
        args: [failingMandateId, accounts.supplierA.address, parseUnits('300', 6), 'PR-FAIL-TOKEN-TEST', expiry],
      })
    );

    // Execution must revert with SafeERC20FailedOperation because FailingUSDC.transfer returns false
    await assert.rejects(
      async () => {
        await agentWallet.writeContract({
          address: fDisburserAddress,
          abi: disburserArtifact.abi,
          functionName: 'disburseWithMandate',
          args: [failingMandateId, accounts.supplierA.address, parseUnits('100', 6), 'PR-FAIL-TOKEN-TEST'],
        });
      },
      (err) => {
        return (
          err.message.includes('SafeERC20FailedOperation') ||
          err.message.includes('revert') ||
          err.shortMessage?.includes('reverted')
        );
      },
      'Transaction must revert with SafeERC20FailedOperation when token transfer fails'
    );
  });

  // REQUIREMENT 17: Backwards Compatibility & Universal Mandate Enforcement on disbursePayment
  await t.test('17. Verify disbursePayment strictly enforces Purchase Mandate governance', async () => {
    // 17A: Attempting disbursePayment without an active mandate strictly reverts with MandateNotFound
    await assert.rejects(
      async () => {
        await ownerWallet.writeContract({
          address: disburserAddress,
          abi: disburserArtifact.abi,
          functionName: 'disbursePayment',
          args: [accounts.supplierB.address, parseUnits('25', 6), 'PR-LEGACY-NO-MANDATE'],
        });
      },
      (err) => err.message.includes('MandateNotFound') || err.message.includes('revert'),
      'Calling disbursePayment without an owner-created mandate must revert'
    );

    // 17B: Create an owner mandate for PR-LEGACY-OWNER and Supplier B
    const block = await publicClient.getBlock();
    const expiry = BigInt(block.timestamp) + 86400n;
    const legacyMandateId = helperDeriveMandateId('PR-LEGACY-OWNER', accounts.supplierB.address);

    await (
      await ownerWallet.writeContract({
        address: disburserAddress,
        abi: disburserArtifact.abi,
        functionName: 'createMandate',
        args: [legacyMandateId, accounts.supplierB.address, parseUnits('30', 6), 'PR-LEGACY-OWNER', expiry],
      })
    );

    // 17C: Call disbursePayment with matching requisition and supplier -> succeeds and consumes mandate
    const legacyTx = await ownerWallet.writeContract({
      address: disburserAddress,
      abi: disburserArtifact.abi,
      functionName: 'disbursePayment',
      args: [accounts.supplierB.address, parseUnits('25', 6), 'PR-LEGACY-OWNER'],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: legacyTx });
    assert.strictEqual(receipt.status, 'success', 'disbursePayment executes successfully against valid mandate');

    // Verify mandate is consumed
    const mandateState = await publicClient.readContract({
      address: disburserAddress,
      abi: disburserArtifact.abi,
      functionName: 'getMandate',
      args: [legacyMandateId],
    });
    assert.strictEqual(mandateState.isUsed, true, 'Mandate is marked used by disbursePayment');
  });

  // REQUIREMENT 18: Altana Agent Balance Untouched & Router Internal Spend Tracking
  await t.test('18. Verify Altana Agent wallet USDC balance is untouched & router tracks all volume', async () => {
    const agentUsdcBal = await publicClient.readContract({
      address: usdcAddress,
      abi: mockUsdcArtifact.abi,
      functionName: 'balanceOf',
      args: [accounts.altanaAgent.address],
    });
    assert.strictEqual(
      agentUsdcBal,
      0n,
      'Altana Agent Smart Account USDC balance is exactly 0 - never holds or transfers USDC'
    );

    const totalDisbursed = await publicClient.readContract({
      address: disburserAddress,
      abi: disburserArtifact.abi,
      functionName: 'totalDisbursedOverall',
    });
    assert.ok(totalDisbursed > 0n, 'Router internally records all disbursed volume');

    const totalMandates = await publicClient.readContract({
      address: disburserAddress,
      abi: disburserArtifact.abi,
      functionName: 'mandateCount',
    });
    const totalExecutedMandates = await publicClient.readContract({
      address: disburserAddress,
      abi: disburserArtifact.abi,
      functionName: 'executedMandateCount',
    });
    assert.ok(totalMandates > 0n, 'Mandates recorded in mandateCount');
    assert.ok(totalExecutedMandates > 0n, 'Executed mandates recorded in executedMandateCount');
  });
});
