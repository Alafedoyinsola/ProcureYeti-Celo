# ProcureYetiDisburser - Celo Sepolia Deployment & Integration Guide

## 1. Overview & Architecture

`ProcureYetiDisburser` is an owner-governed, non-custodial payment router smart contract deployed on **Celo Sepolia Testnet** (Chain ID: `11142220`). It implements on-chain cryptographic guardrails for autonomous Altana AI procurement agents:

```
[ Altana AI Agent ]
       │ (Session Key signed by Owner)
       ▼
[ ProcureYetiDisburser ] ──► [ Check 1: msg.sender is Owner or Authorized Agent ]
       │                ──► [ Check 2: Recipient is in Approved Supplier Mapping ]
       │                ──► [ Check 3: Amount <= $500 USDC autonomous threshold ]
       │                ──► [ Check 4: Cumulative <= $5,000 USDC 24h velocity cap ]
       ▼
[ Circle USDC on Celo ] ──► transfer(supplier, amount)
```

### Safety Guarantees
1. **Zero Raw Token Transfer Access:** The Altana agent session key never holds direct permission to call `USDC.transfer(address,uint256)`. It can only invoke `ProcureYetiDisburser.disbursePayment(address,uint256,string)`.
2. **On-Chain Supplier Allowlisting:** Payments to any unapproved address revert on-chain (`SupplierNotApproved(address)`), preventing unauthorized fund diversion even if agent prompt injection occurs.
3. **Dual-Tier Thresholds:**
   - $\le \$500$ USDC: Executable autonomously by authorized Altana agent smart account.
   - $> \$500$ USDC and $\le \$2,500$ USDC: Requires direct human owner multi-sig / wallet execution.
   - $> \$2,500$ USDC: Reverts on-chain (`PaymentExceedsSingleCap`).
4. **24-Hour Velocity Cap:** Cumulative daily disbursements are capped at $\$5,000$ USDC across a rolling day index.
5. **Reentrancy Protection & SafeERC20:** Built with checks-effects-interactions and SafeERC20 token transfer verification.

---

## 2. Network Constants & Verified Tokens

| Parameter | Value | Details |
| :--- | :--- | :--- |
| **Network** | Celo Sepolia Testnet | OP-Stack L2 Testnet |
| **Chain ID** | `11142220` (`0xa9feac`) | Official Celo Sepolia |
| **RPC Endpoint** | `https://forno.celo-sepolia.celo-testnet.org` | Public Celo Sepolia RPC |
| **Block Explorer** | [sepolia.celoscan.io](https://sepolia.celoscan.io) / [celo-sepolia.blockscout.com](https://celo-sepolia.blockscout.com) | CeloScan & Blockscout |
| **Testnet Faucet** | [faucet.celo.org](https://faucet.celo.org) | Fund deployer with testnet CELO |
| **Verified USDC** | `0x01C5C0122039549AD1493B8220cABEdD739BC44E` | Native Circle USDC (6 decimals) |
| **Legacy Note** | `0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B` | USDC Fee Adapter (Do NOT use for transfers) |

---

## 3. Compiler Configuration & EVM Version

- **Solidity Version:** `0.8.28`
- **EVM Target:** `cancun` (Celo Sepolia natively supports Cancun opcodes including `PUSH0`, `MCOPY`, `TLOAD`, `TSTORE`)
- **Optimizer:** Enabled (`runs = 200`)
- **Artifact:** Compiled ABI and bytecode are exported to `contracts/ProcureYetiDisburser.json`

---

## 4. Constructor Arguments

| Parameter | Type | Human Value | Raw Value (6 decimals) | Description |
| :--- | :--- | :--- | :--- | :--- |
| `_usdc` | `address` | `0x01C5C0122039549AD1493B8220cABEdD739BC44E` | `0x01C5C0122039549AD1493B8220cABEdD739BC44E` | Verified Circle USDC contract |
| `_maxSinglePayment` | `uint256` | $\$2,500$ USDC | `2500000000` | Max single transaction limit |
| `_dailyVelocityCap` | `uint256` | $\$5,000$ USDC | `5000000000` | 24-hour spending velocity cap |
| `_autonomousThreshold` | `uint256` | $\$500$ USDC | `500000000` | Autonomous agent execution cap |

### Pre-computed ABI-Encoded Constructor Calldata (Hex)
```hex
00000000000000000000000001c5c0122039549ad1493b8220cabedd739bc44e000000000000000000000000000000000000000000000000000000009502f900000000000000000000000000000000000000000000000000000000012a05f200000000000000000000000000000000000000000000000000000000001dcd6500
```

---

## 5. Deployment Methods

### Option A: Viem Script (Recommended)

1. Dry run compilation and parameter verification (no private key needed):
   ```bash
   node scripts/deploy-disburser.js
   ```

2. When ready to broadcast with owner wallet:
   ```bash
   # In PowerShell:
   $env:DEPLOYER_PRIVATE_KEY="0x<your_celo_sepolia_private_key>"
   node scripts/deploy-disburser.js --broadcast

   # In Bash:
   export DEPLOYER_PRIVATE_KEY="0x<your_celo_sepolia_private_key>"
   node scripts/deploy-disburser.js --broadcast
   ```

### Option B: Foundry (`forge create`)

```bash
forge create contracts/ProcureYetiDisburser.sol:ProcureYetiDisburser \
  --rpc-url https://forno.celo-sepolia.celo-testnet.org \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --constructor-args 0x01C5C0122039549AD1493B8220cABEdD739BC44E 2500000000 5000000000 500000000 \
  --evm-version cancun \
  --optimize \
  --optimizer-runs 200
```

### Option C: Remix IDE or CeloScan Blockscout Deployer
1. Import `contracts/ProcureYetiDisburser.sol`.
2. Select compiler `0.8.28`, EVM version `cancun`, optimizer `200` runs.
3. In Deploy tab, select Environment: *Injected Provider* (MetaMask connected to Celo Sepolia).
4. Enter constructor arguments:
   - `_usdc`: `0x01C5C0122039549AD1493B8220cABEdD739BC44E`
   - `_maxSinglePayment`: `2500000000`
   - `_dailyVelocityCap`: `5000000000`
   - `_autonomousThreshold`: `500000000`
5. Click **Deploy** and confirm transaction in wallet.

---

## 6. Post-Deployment Configuration Workflow

### Step 1: Update Frontend Environment
Add the deployed contract address to your local environment file (`.env.local`):
```bash
NEXT_PUBLIC_DISBURSER_ADDRESS=0x<deployed_contract_address>
```
The Next.js frontend automatically picks up this address in `src/lib/altana/disburser.ts` and updates all session permission builders and the Agent Wallet view.

### Step 2: Batch Approve Verified Suppliers
Call `approveSuppliersBatch` from the owner wallet to initialize the supplier allowlist:
```solidity
address[] memory suppliers = new address[](3);
suppliers[0] = 0x8849F1312389d419Fe5EbF74fC6d93424681E738; // Apex Silicon Global
suppliers[1] = 0x5C808dE52B6B9229Eb925E4D89C4081c7B567824; // Nebula Compute Labs
suppliers[2] = 0x3213a5D25492d52A98011fe80682B4F817B576a9; // RoastCraft Direct

string[] memory names = new string[](3);
names[0] = "Apex Silicon Global";
names[1] = "Nebula Compute Labs";
names[2] = "RoastCraft Direct";

disburser.approveSuppliersBatch(suppliers, names);
```

### Step 3: Authorize Altana Smart Account
Authorize the Altana Smart Account / Agent Wallet address to call `disbursePayment`:
```solidity
disburser.setAuthorizedAgent(altanaSmartAccountAddress, true);
```

### Step 4: Fund Disburser Treasury with USDC
1. Call `approve(disburserAddress, 5000000000)` on the USDC contract (`0x01C5C0122039549AD1493B8220cABEdD739BC44E`).
2. Call `disburser.depositTreasury(5000000000)` ($5,000 USDC) to provide operational liquidity.

---

## 7. Altana Session Permission Descriptor & Internal Spend Tracking

When granting an Altana session key to the AI agent, scope the session strictly to:
```typescript
import { buildDisburserSessionPermissions } from '@/lib/altana';

const { permissions, expiry } = buildDisburserSessionPermissions({
  disburserAddress: '0x<deployed_disburser_address>',
  dailySpendingLimitUSDC: 500, // $500 USDC
  nativeGasLimitCELO: 1, // 1 CELO gas fee headroom for Altana relay execution
  expirySeconds: 7 * 24 * 60 * 60, // 7 days
});

// Resulting Altana Session Permissions:
// permissions.calls: [{ to: disburserAddress, signature: 'disbursePayment(address,uint256,string)' }]
// permissions.spend: [
//   { token: '0x01C5C0122039549AD1493B8220cABEdD739BC44E', limit: 500000000n, period: 'day' },
//   { limit: 1000000000000000000n, period: 'day' } // Native CELO gas headroom for relay fee submission
// ]
```

### Architectural Finding: Internal Router Spend Tracking
- **Altana Account Spend Limits:** In Altana / Porto accounts, `SpendPermission` tracks direct ERC-20 calls (`transfer` / `transferFrom`) or native ETH/CELO transfers originating from the smart account.
- **Router Internal Disbursements:** `ProcureYetiDisburser` holds treasury USDC in its own contract address and executes `usdc.safeTransfer(supplier, amount)` internally.
- **Tracking Invariance:** Altana's account-level USDC spend limits **do NOT track transfers executed internally by the router**. The agent smart account's own USDC balance is never debited during disbursements.
- **Authoritative Enforcement:** All spending guardrails ($500 autonomous threshold for agents, $2,500 max single payment, $5,000 rolling 24h velocity cap, and supplier whitelist verification) are enforced **internally and directly on-chain by `ProcureYetiDisburser.sol`**.
