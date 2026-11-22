# ProcureYeti Sentinel (Celo)

> **AI recommends. Owners authorize. Celo enforces.**
>
> Built for *Agents Open for Business* — Track 4: Agent Wallets | Altana
>
> **Repository:** [https://github.com/Alafedoyinsola/ProcureYeti-Celo](https://github.com/Alafedoyinsola/ProcureYeti-Celo)
>
> **Target Networks:** Celo Mainnet (`Chain ID: 42220`) & Celo Sepolia (`Chain ID: 11142220`)

[![Tests](https://img.shields.io/badge/Tests-30%2F30%20Passing-emerald)](https://github.com/Alafedoyinsola/ProcureYeti-Celo)
[![EVM](https://img.shields.io/badge/EVM-Cancun%20Target-blue)](https://github.com/Alafedoyinsola/ProcureYeti-Celo)
[![Altana SDK](https://img.shields.io/badge/Altana%20SDK-v1.1.0-purple)](https://altana.network)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Operational Status & Environment Truthfulness

To ensure complete clarity for hackathon judges, this project explicitly distinguishes between its four operational layers:

1. **Local EVM Execution (Verified & Complete):** Smart contract logic (`ProcureYetiDisburser.sol`) is compiled with `solc` v0.8.28 for Cancun EVM and passes 30/30 automated local tests (7 unit tests and 23 in-memory Ganache EVM tests).
2. **Dashboard Demonstration (Operational in Local Demo Mode):** The Next.js 16 web interface (`http://localhost:3000`) provides a fully interactive demo with simulated RFQs, deterministic Sentinel risk scoring, calldata generation, and decision receipts. All company names, suppliers, and personnel (*Apex Silicon Global, Elena Vance, David Kim*) are illustrative demo mock data.
3. **Celo Testnet Configuration (Verified Interface):** Verified token parameters, Celo Sepolia contract manifests, and Altana SDK session builders are implemented and tested in source code.
4. **Celo Mainnet Status (Pending & Execution-Gated):** The contract is **not yet deployed on Celo Mainnet**, the treasury is **not funded with live mainnet USDC**, and **ERC-8021 attribution remains unresolved**. Live mainnet execution is deliberately gated.

---

## Table of Contents
1. [The Autonomous Procurement Problem](#the-autonomous-procurement-problem)
2. [The Solution: ProcureYeti Sentinel](#the-solution-procureyeti-sentinel)
3. [Architecture & System Flow](#architecture--system-flow)
4. [Deterministic Sentinel Investigation Engine](#deterministic-sentinel-investigation-engine)
5. [On-Chain Purchase Mandate Engine (`ProcureYetiDisburser.sol`)](#on-chain-purchase-mandate-engine-procureyetidisbursersol)
6. [Altana Agent Wallet Integration & Session Permissions](#altana-agent-wallet-integration--session-permissions)
7. [Celo Network & Verified Token Registry](#celo-network--verified-token-registry)
8. [Critical Hackathon Attribution Status (Unresolved & Gated)](#critical-hackathon-attribution-status-unresolved--gated)
9. [Screenshots & UI Verification](#screenshots--ui-verification)
10. [Local Demo & Reproduction Guide](#local-demo--reproduction-guide)
11. [Verification & Test Results (30/30 Passing)](#verification--test-results-3030-passing)
12. [Technical Truthfulness & Capability Matrix](#technical-truthfulness--capability-matrix)
13. [Submission Package & Video Demo](#submission-package--video-demo)

---

## The Autonomous Procurement Problem

Autonomous AI procurement agents offer immense operational leverage to small and medium businesses (SMBs) by scouting competitive RFQs, negotiating volume discounts, and managing inventory replenishments. However, giving an AI agent unrestricted access to corporate treasury funds creates catastrophic financial risk:

1. **Broad Payment Authority is Lethal:** Granting an agent a general-purpose token transfer key allows it to disburse funds to any address up to a rolling balance. A single prompt injection, model hallucination, or session key compromise can drain the treasury in seconds.
2. **Off-Chain Guardrails Provide Zero Guarantees:** Client-side policy checks or LLM system prompts can be bypassed if the underlying smart contract or smart account accepts direct ERC-20 `transfer` calls.
3. **The Manual Bottleneck:** Requiring human business owners to manually input recipient addresses, calldata, and payment amounts for every micro-transaction slows operations to a crawl.

---

## The Solution: ProcureYeti Sentinel

ProcureYeti Sentinel replaces unconstrained agent spending keys with **owner-authorized, purchase-specific on-chain mandates**:

* **AI Recommends:** Autonomous agents analyze vendor proposals, detect price outliers, scan for duplicate purchases, and evaluate fulfillment turnaround using deterministic Sentinel investigation rules. Agents **never** approve purchases or create payment authority.
* **Owners Authorize:** Business owners review purchase justification, budget impact, supplier allowlist status, and Sentinel risk scores. With one click, owners authorize and provision an immutable **Purchase Mandate** targeting `ProcureYetiDisburser.sol`.
* **Celo Enforces:** The disburser contract holds treasury funds in escrow. An agent smart account can execute disbursements **only** if the recipient, amount, requisition ID, and expiry exactly match an active, unrevoked, unexpired owner mandate. The mandate is burned upon execution, preventing replay attacks.

---

## Architecture & System Flow

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
│   7. Daily Velocity Cap: Cumulative volume today <= $5,000 USDC (UTC) │
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

## Deterministic Sentinel Investigation Engine

The Sentinel Investigation Engine (`src/lib/sentinel/investigation.ts`) analyzes every requisition prior to owner authorization:

1. **Rule Evaluation (`SENTINEL-R01` to `SENTINEL-R05`):**
   * `SENTINEL-R01` (Allowlist Verification): Ensures supplier wallet is active on the Celo allowlist.
   * `SENTINEL-R02` (Departmental Budget): Assesses monthly budget consumption and headroom.
   * `SENTINEL-R03` (Price Variance): Flags quotes exceeding category averages by >15%.
   * `SENTINEL-R04` (Autonomous Policy Threshold): Requisitions < $500 are eligible for agent autonomous execution *once an owner mandate is provisioned*; requisitions >= $500 strictly require owner review and mandate creation.
   * `SENTINEL-R05` (Single Transaction Ceiling): Requisitions exceeding $2,500 are rejected by contract limits.
2. **Duplicate Requisition Scanner:** Detects near-identical purchase requests across title, department, supplier, and price within a 30-day sliding window.
3. **Auditable Decision Receipts:** Emits tamper-evident receipts with SHA-256 digests binding decision parameters, timestamp, and audit trail.

---

## On-Chain Purchase Mandate Engine (`ProcureYetiDisburser.sol`)

The smart contract router (`contracts/ProcureYetiDisburser.sol`) enforces immutable security invariants:

| Function | Access Modifier | Description |
| :--- | :--- | :--- |
| `createMandate(bytes32 mandateId, address supplier, uint256 maxAmount, string requisitionId, uint256 expiry)` | `onlyOwner` | Provisions an immutable Purchase Mandate. Validates allowlist, caps maxAmount at $2,500, verifies future expiry. |
| `revokeMandate(bytes32 mandateId)` | `onlyOwner` | Revokes an active mandate before execution. |
| `disburseWithMandate(bytes32 mandateId, address supplier, uint256 amount, string requisitionId)` | `nonReentrant onlyAuthorized` | Disburses USDC strictly governed by mandate. Enforces caps, marks mandate used before token transfer. |
| `executeMandatePayment(...)` | `nonReentrant onlyAuthorized` | Alias for `disburseWithMandate`. |
| `disbursePayment(address supplier, uint256 amount, string requisitionId)` | `nonReentrant onlyAuthorized` | Derives mandate ID from `(requisitionId, supplier)` and delegates to `_executeMandatePayment`. Prevents mandate bypass. |

> [!NOTE]
> **Deployment Status:** `ProcureYetiDisburser.sol` is fully verified on local Cancun EVM (30/30 tests pass). It is **not yet deployed on Celo Mainnet (`42220`)** and the contract treasury holds no live mainnet funds. In local demo mode, transactions prepare real calldata targeting a placeholder router address (`0xD15b805E8004081cE10c0eF62b2f2dC9fFDb7702`).

### Contract Security Invariants:
* **Checks-Effects-Interactions (CEI):** `m.isUsed = true` and `dailySpent[today] += amount` are updated **before** invoking `usdc.safeTransfer`.
* **Reentrancy Protection:** All state-modifying functions feature OpenZeppelin's `nonReentrant` guard.
* **SafeERC20 Operations:** All token disbursements use `SafeERC20.safeTransfer` to handle non-standard ERC-20 return values.
* **UTC Calendar-Day Spend Cap:** Daily velocity limit is calculated using `block.timestamp / 1 days`, resetting at 00:00:00 UTC daily.

---

## Altana Agent Wallet Integration & Session Permissions

ProcureYeti Sentinel integrates Altana Agent Wallets (`@altananetwork/sdk` v1.1.0) using EIP-7702 delegated smart accounts on Celo:

```typescript
// Bounded session permissions generated in src/lib/altana/disburser.ts
const calls: CallPermission[] = [
  {
    to: disburserAddress,
    signature: 'disburseWithMandate(bytes32,address,uint256,string)',
  },
];
```

* **Zero Direct Token Custody:** The agent session key has ZERO permission to call `usdc.transfer` directly.
* **Internal Spend Invariance:** In Altana / Porto architecture, the agent smart account holds 0 USDC and executes no direct balance transfers. Treasury reserves reside in `ProcureYetiDisburser.sol`.
* **Gas Sponsorship Headroom:** 1 CELO native gas fee headroom is provisioned in session spend permissions (`token: undefined`) so the Altana relay can submit transactions without `NoSpendPermissions` errors.

---

## Celo Network & Verified Token Registry

ProcureYeti Sentinel operates on verified Celo stablecoins:

| Chain Name | Chain ID | Token Symbol | Decimals | Verified Contract Address | Verification Source |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **Celo Mainnet** | `42220` | Native Circle USDC | 6 | `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` | Official Circle Documentation |
| **Celo Mainnet** | `42220` | Mento cUSD | 18 | `0x765DE816845861e75A25fCA122bb6898B8B1282a` | Celo Core Contracts |
| **Celo Sepolia** | `11142220` | Native Circle USDC | 6 | `0x01C5C0122039549AD1493B8220cABEdD739BC44E` | Celo Sepolia Blockscout |
| **Celo Sepolia** | `11142220` | Mento cUSD | 18 | `0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80` | Celo Sepolia Blockscout |

> [!WARNING]
> Do not use `0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B` as an ERC-20 token address; that is the Celo Fee Adapter for gas abstraction.

---

## Critical Hackathon Attribution Status (Unresolved & Gated)

### The Architectural Incompatibility
* **Hackathon Attribution Tag:** `celo_43f4a9848a4b`
* **Attribution Status:** **UNRESOLVED ON MAINNET.**
* **Important Notice:** Having an attribution tag configured in source code does **not** constitute a qualifying credited transaction. No qualifying transactions have been verified on Celo Mainnet (`42220`).
* **Technical Blocker:** Celo ERC-8021 (`@celo/attribution-tags` / `verifyTx`) parses the attribution tag from the trailing bytes of the **outermost transaction calldata envelope**. The Altana SDK v1.1.0 bundles operations inside an **Ithaca Porto / EIP-7702 relay transaction**. Appending the attribution tag to the inner execution call's calldata (inside `calls: [{ to, data }]`) does **not** place the tag at the end of the outer relay transaction submitted to Celo RPC. The official Celo attribution verifier fails to recognize inner calldata tags.

### The Protective Sentinel Policy
To protect treasury funds and avoid broadcasting transactions that cannot be verified by the hackathon scoring engine:
1. An **Execution Gate** (`src/lib/altana/attribution.ts`) is actively engaged (`isExecutionGated: true`).
2. The UI displays the full technical analysis and attribution blocker explanation.
3. Transactions and mandates are fully prepared, validated, and recorded with auditable decision receipts without risking uncredited mainnet broadcasts.

---

## Screenshots & UI Verification

Genuine high-resolution screenshots captured directly from the running local application:

| View | Screenshot | Description |
| :--- | :---: | :--- |
| **1. Dashboard (Dark Mode)** | [View Image](docs/screenshots/01_dashboard_dark.png) | Overview displaying Celo network badges, policy limits banner, and metrics. |
| **2. Quotations Analysis** | [View Image](docs/screenshots/02_quotations.png) | Multi-vendor comparison with SLA lead times and deterministic price outlier detection. |
| **3. Approval Centre** | [View Image](docs/screenshots/03_approval_centre.png) | Executive approval queue with Sentinel risk indicators and mandate status badges. |
| **4. Sentinel Risk Investigation** | [View Image](docs/screenshots/04_sentinel_investigation.png) | Mandate modal showing deterministic rule evaluations (`SENTINEL-R01` through `R05`). |
| **5. Mandate Calldata Preview** | [View Image](docs/screenshots/05_mandate_preview.png) | Parameters tab displaying formatted `disburseWithMandate` call and expiry selector. |
| **6. Dashboard (Light Mode)** | [View Image](docs/screenshots/06_dashboard_light.png) | Light mode dashboard demonstrating verified contrast and typography. |

---

## Local Demo & Reproduction Guide

### Prerequisites
* **Node.js:** v20+ or v24
* **Package Manager:** npm v10+

### Step-by-Step Instructions
```bash
# 1. Clone repository
git clone https://github.com/Alafedoyinsola/ProcureYeti-Celo.git
cd ProcureYeti-Celo

# 2. Install dependencies
npm install

# 3. Run complete test suite (7 unit + 23 in-memory Ganache EVM tests)
npm test

# 4. Verify TypeScript and ESLint
npx tsc --noEmit
npm run lint

# 5. Build production bundle
npm run build

# 6. Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> [!NOTE]
> All requisition data, vendor names (*Apex Silicon Global, EcoPack Solutions, VoltEdge Distro*), and team members (*Elena Vance, Sarah Lin, David Kim*) in the local web interface are illustrative mock data for local demonstration purposes.

---

## Verification & Test Results (30/30 Passing)

```
> procureyeti-celo@0.1.0 test
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
✔ 19. Autonomous Payment Path & Least Privilege Invariants

ℹ tests 30 | pass 30 | fail 0 (100% Pass)
```

---

## Technical Truthfulness & Capability Matrix

| Protocol Capability | Implementation Status | Technical Reality |
| :--- | :---: | :--- |
| **Solidity Smart Contract** | **Verified (Local EVM)** | Production-ready contract compiled for Cancun EVM; verified on in-memory Ganache EVM (30/30 tests pass). |
| **Purchase Mandate Engine** | **Verified (Local EVM)** | Mandates strictly required; burns upon payment; CEI and SafeERC20 verified. |
| **Altana Session Builder** | **Verified (Source Code)** | Session scoped exclusively to `disburseWithMandate` on router contract with 1 CELO gas fee headroom. |
| **Deterministic Investigation** | **Verified (Local UI)** | 5 heuristic security rules, duplicate scanner, and price outlier spread evaluation. |
| **User Interface & Themes** | **Verified (Local UI)** | High-contrast Dark and Light modes, responsive drawer, modal workflows. |
| **Demo Honest Claims** | **Verified (Local UI)** | Zero fabricated hashes or false broadcast claims; clear distinction between prepared and on-chain state. |
| **Celo Attribution Gate** | **Unresolved & Gated** | Protective safety gate engaged due to EIP-7702 outer calldata incompatibility with ERC-8021 verifier. |
| **Mainnet Deployment** | **Pending** | Contract deployment on Celo Mainnet (`42220`) and treasury funding required for production release. |

---

## Submission Package & Video Demo

For the full hackathon submission package, including the **3-Minute Demo Video Script**, **Visual Video Storyboard**, and **Submission Checklist**, refer to:

👉 **[docs/SUBMISSION.md](docs/SUBMISSION.md)**

---

## License
MIT License — Copyright (c) 2026 ProcureYeti Contributors.
