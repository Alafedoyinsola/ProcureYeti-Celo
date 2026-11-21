# ProcureYeti Sentinel (Celo)

> **AI recommends. Owners authorize. Celo enforces.**
> Built for *Agents Open for Business* — Track 4: Agent Wallets | Altana

ProcureYeti Sentinel is an autonomous procurement and corporate spend governance protocol on **Celo** (Mainnet Chain ID: `42220`, Sepolia Testnet Chain ID: `11142220`), powered by **Altana Agent Wallets** (`@altananetwork/sdk`) and an on-chain **Purchase Mandate Engine** (`ProcureYetiDisburser.sol`).

---

## The Autonomous Procurement Problem

Autonomous AI procurement agents offer immense operational leverage to small businesses by gathering competitive RFQs, negotiating volume discounts, and managing inventory replenishments. However, giving an AI agent unrestricted access to corporate treasury funds creates unacceptable financial risk:

1. **Broad Agent Payment Authority is Dangerous:** Granting an agent a general-purpose token transfer session allows it to pay any address up to a rolling balance. A single prompt injection, model hallucination, or session key compromise could drain treasury reserves.
2. **Off-Chain Promises Provide Zero Guarantees:** Client-side policy checks can be bypassed if the underlying smart contract accepts direct transfer calls.
3. **The Manual Bottleneck:** Requiring human business owners to manually input recipient addresses, calldata, and payment amounts for every micro-transaction slows operations to a crawl.

---

## The Solution: ProcureYeti Sentinel & The Purchase Mandate Engine

ProcureYeti Sentinel replaces broad agent payment authority with **owner-created, purchase-specific on-chain mandates**:

* **AI Recommends:** Autonomous agents analyze vendor proposals, detect price outliers, scan for duplicate purchases, and evaluate fulfillment turnaround using deterministic Sentinel investigation rules.
* **Owners Authorize:** Business owners review purchase justification, budget impact, supplier allowlist status, and Sentinel risk scores. With one click, owners sign and provision an immutable **Purchase Mandate** targeting `ProcureYetiDisburser.sol`.
* **Celo Enforces:** The disburser contract locks funds in escrow. An agent smart account can execute disbursements **only** if the recipient, amount, requisition ID, and expiry exactly match an active, unrevoked, unexpired owner mandate. The mandate is burned on execution, preventing any replay.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js 16 Web Dashboard                       │
│    React 19 • Tailwind CSS v4 • Lucide Icons • Sentinel Modals & Tabs │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      ProcureYeti Sentinel Core                         │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │   Altana SDK Client     │  │   Sentinel Investigation Engine     │  │
│  │  - Official CELO (42220)│  │  - Deterministic Risk Scoring (0-100│  │
│  │  - CELO_SEPOLIA (1114222│  │  - Duplicate Purchase Scanner       │  │
│  │  - Mandate session scope│  │  - Price Outlier Detection          │  │
│  │  - Attribution Gate     │  │  - Auditable Decision Receipts      │  │
│  └─────────────────────────┘  └─────────────────────────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                ProcureYetiDisburser.sol (Cancun EVM)                   │
│                                                                        │
│   Purchase Mandate Engine (All payment entry points strictly enforce): │
│   1. Purchase Mandate: Exists, unexpired, unrevoked, unused           │
│   2. Exact Binding: Supplier & Requisition ID match mandate exactly   │
│   3. Mandate Limit: Payment amount <= mandate maxAmount               │
│   4. Supplier Allowlist: Recipient MUST be in isApprovedSupplier      │
│   5. Autonomous Agent Cap: If caller is agent, amount <= $500 USDC     │
│   6. Single Payment Cap: Amount <= $2,500 USDC (Contract ceiling)     │
│   7. Daily Velocity Cap: Cumulative volume today <= $5,000 USDC (UTC calendar day) │
│   8. Reentrancy Guard: nonReentrant locks execution before safeTransfer│
│   9. Replay Burn: Mandate marked isUsed = true BEFORE token transfer   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Verified Native Circle USDC on Celo                      │
│     Mainnet (42220):  0xcebA9300f2b948710d2653dD7B07f33A8B32118C      │
│     Sepolia (11142220): 0x01C5C0122039549AD1493B8220cABEdD739BC44E    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Contract Operations & Functions

| Function | Access | Description |
| :--- | :--- | :--- |
| `createMandate(bytes32 mandateId, address supplier, uint256 maxAmount, string requisitionId, uint256 expiry)` | `onlyOwner` | Creates an immutable Purchase Mandate. Validates allowlist, caps maxAmount at $2,500, verifies future expiry. |
| `revokeMandate(bytes32 mandateId)` | `onlyOwner` | Revokes an active mandate before execution. |
| `disburseWithMandate(bytes32 mandateId, address supplier, uint256 amount, string requisitionId)` | `onlyAuthorized` | Disburses USDC governed by the mandate. Enforces caps, marks mandate used before transfer. |
| `executeMandatePayment(...)` | `onlyAuthorized` | Alias for `disburseWithMandate`. |
| `disbursePayment(address supplier, uint256 amount, string requisitionId)` | `onlyAuthorized` | Derives mandate ID from `(requisitionId, supplier)` and delegates to `_executeMandatePayment`. Prevents mandate bypass. |
| `getMandate(bytes32 mandateId)` | `view` | Returns full `PurchaseMandate` record. |
| `isMandateExecutable(bytes32 mandateId)` | `view` | Returns whether mandate is active, unused, unrevoked, unexpired, and supplier is approved. |
| `isMandateExecutable(bytes32 mandateId, uint256 amount)` | `view` | Evaluates whether a specific amount complies with mandate max, single cap, daily cap, and treasury balance. |

---

## Altana Agent Wallet & Session Permission Alignment

The Altana Agent session permissions generated by `buildDisburserSessionPermissions` are strictly scoped to the mandate disbursement function:

```typescript
{
  to: disburserAddress,
  signature: 'disburseWithMandate(bytes32,address,uint256,string)',
}
```

* **Zero Direct Token Permissions:** The agent session key has no permission to call `usdc.transfer` directly.
* **Internal Spend Invariance:** In Altana / Porto architecture, the smart account holds 0 USDC and executes no direct balance transfers. All funds are disbursed internally from `address(this)` on `ProcureYetiDisburser.sol`.
* **Gas Sponsorship Headroom:** 1 CELO native gas fee headroom is provisioned in the session to ensure seamless relay execution on Celo without out-of-gas reverts.

---

## Critical Hackathon Attribution Analysis (`celo_43f4a9848a4b`)

### The Architectural Incompatibility
* **Hackathon Tag:** `celo_43f4a9848a4b`
* **Target Network:** Celo Mainnet (`42220`) / Celo Sepolia (`11142220`)
* **Verification Standard:** Celo ERC-8021 (`@celo/attribution-tags` / `verifyTx`) parses the suffix of the **outermost transaction calldata envelope**.
* **Altana Relay Mechanism:** The Altana SDK v1.1.0 bundles calls through an **Ithaca Porto / EIP-7702 relay envelope**.
* **Finding:** Appending the attribution suffix to an inner call's calldata (inside `calls: [{ to, data }]`) **does not** place the suffix at the end of the outer relay transaction submitted to Celo. Celo's attribution verifier fails to recognize inner calldata suffixes.

### The Protective Sentinel Policy
To prevent broadcasting uncredited mainnet transactions or spending corporate treasury funds without confirmed hackathon recognition:
1. An **Execution Gate** (`src/lib/altana/attribution.ts`) is actively engaged.
2. The UI displays the full technical analysis and attribution blocker explanation.
3. Transactions and mandates are fully prepared, validated, and recorded with auditable decision receipts without risking uncredited mainnet broadcasts.

---

## Verification & Test Results

The protocol has been evaluated with 100% test passage:

```
> node --test test/disburser.test.js test/evm-disburser.test.js

✔ ProcureYetiDisburser - Contract Compilation and Bytecode Integrity (EVM Target: Cancun)
✔ ProcureYetiDisburser - Function Selectors and Altana Session Alignment
✔ ProcureYetiDisburser - Events and Custom Error Definitions
✔ ProcureYetiDisburser - Calldata Encoding and Argument Preservation for Mandates
✔ ProcureYetiDisburser - Business Logic Simulation & Safety Invariants
✔ ProcureYetiDisburser - Altana Disburser Session Permissions Structure and Relay Gas Headroom
✔ ProcureYetiDisburser - Router Internal Spend Invariance vs Altana Account Spend Limits
✔ Setup 1: Deploy MockUSDC (6 decimals) and mint initial supply
✔ Setup 2: Deploy ProcureYetiDisburser with production parameters
✔ Setup 3: Setup Supplier Allowlist and Authorized Agent on EVM
✔ 1. Valid Purchase Mandate Creation by Owner and View Functions
✔ 2. Rejection of Mandate Creation by Non-Owner (Agent and Stranger)
✔ 3. Rejection of Mandate Creation for Unapproved Supplier
✔ 4. Successful Authorized Payment Against Mandate by Agent
✔ 5. Rejection of Payment when Supplier does not match Mandate
✔ 6. Rejection of Payment when Requisition ID does not match Mandate
✔ 7. Rejection of Payment when Amount exceeds Mandate Authorized Limit
✔ 8. Rejection of Payment when Amount is Zero
✔ 9. Rejection of Payment Against Expired Mandate & Past Expiry Creation
✔ 10. Rejection of Payment Against Revoked Mandate & Revocation Rules
✔ 11. Rejection of Second Execution on Used Mandate (Replay Protection)
✔ 12. Existing Autonomous Cap Enforcement ($500 limit for agent)
✔ 13. Existing Single-Payment Cap Enforcement ($2,500 limit)
✔ 14. Existing Daily Spending Cap Enforcement ($5,000 UTC calendar-day cap)
✔ 15. Reentrancy Protection Enforcement (ReentrancyGuardReentrantCall)
✔ 16. Failed Token Transfer Behaviour (SafeERC20FailedOperation)
✔ 17. Verify disbursePayment strictly enforces Purchase Mandate governance
✔ 18. Verify Altana Agent wallet USDC balance is untouched & router tracks all volume

ℹ tests 29 | pass 29 | fail 0 (100% Pass)
```

---

## Getting Started

### Prerequisites
* Node.js v20+ or v24
* npm

### Installation
```bash
git clone https://github.com/your-org/procureyeti-celo.git
cd procureyeti-celo
npm install
```

### Running Test Suites
```bash
npm test
```

### Type Checking & Linting
```bash
npx tsc --noEmit
npm run lint
```

### Building for Production
```bash
npm run build
```

---

## License
MIT
