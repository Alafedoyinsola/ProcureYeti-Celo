# ProcureYeti Celo

> **AI recommends. Owners authorize. Celo enforces.**

ProcureYeti Celo is a public prototype for procurement and corporate spend management designed for small businesses on the **Celo Sepolia Testnet** (Chain ID: `11142220`).

---

## The Small-Business Procurement Problem

Small businesses and growing organizations face operational challenges when managing corporate expenditures:

1. **Lack of Enterprise Spend Controls:** Small teams lack the dedicated procurement departments and multi-tier approval tools (such as Coupa or SAP Ariba) used by enterprise organizations. Requisitions are often managed informally across chat channels and spreadsheets, leading to untracked spending, duplicate invoices, and vendor sprawl.
2. **The Autonomous Agent Risk:** Giving autonomous AI agents or team members direct access to corporate credit cards or unrestricted private keys creates serious financial risk. Model hallucinations, prompt injections, or compromised agent credentials could result in unauthorized fund transfers or rapid treasury depletion.
3. **The Overhead of Manual Oversight:** Requiring business owners to manually approve every routine operational micro-purchase (e.g., API credits, server compute, office supplies) creates an administrative bottleneck that slows down business operations.

### How ProcureYeti Addresses It

ProcureYeti implements a hybrid workflow that combines application-level procurement tracking with on-chain smart contract controls on Celo:
* **Employees** create structured purchase requisitions with department tags, urgency levels, and estimated budgets.
* **Deterministic Recommendation Scoring** evaluates mock supplier proposals using predefined scoring heuristics (pricing delta, delivery turnaround, and supplier ratings) for demonstration purposes.
* **Routine Micro-Purchases ($\le \$500$ USDC)** are designed to be executed autonomously by an authorized Altana agent smart account within strict on-chain thresholds.
* **Major Expenditures ($> \$500$ USDC)** require an owner-authorized contract call. In the smart contract, authorized agents are prevented from disbursing amounts above $500 USDC; however, the complete live cryptographic owner approval workflow is not yet integrated into the frontend.
* **Smart Contract Payment Router (`ProcureYetiDisburser.sol`)** acts as a treasury vault that holds deposited USDC and programmatically restricts disbursements to owner-approved supplier addresses, capping single transactions and daily volume directly in Solidity.

---

## Core Features

* **Purchase Request Management:** Submit, view, and filter procurement requisitions across departments (Engineering, IT, Operations, Marketing) stored in browser local storage.
* **Supplier Management:** Maintain a centralized directory of supplier profiles with mock wallet addresses, business categories, rating history, and allowlist statuses.
* **Quote Comparison & Deterministic Recommendation Scoring:** Multi-vendor quotation review interface featuring deterministic recommendation scoring based on simulated price deltas, delivery turnaround, and mock vendor track records.
* **Human Approval Workflow:** Multi-tiered approval queue where requisitions exceeding the $500 autonomous threshold are held for owner review (simulated in UI; live cryptographic signing not yet integrated).
* **Altana Agent Wallet Integration Helpers:** Ready-to-wire TypeScript modules leveraging `@altananetwork/sdk` for session permission building, disburser call encoding, and ERC-8004 identity registration helpers.
* **Solidity-Based Allowlisting & Payment Limits:** Custom smart contract router holding deposited treasury USDC and enforcing recipient allowlists, per-transaction limits, and daily spending velocity caps on-chain.
* **Audit Activity History:** Chronological audit trail capturing requisitions, simulated approval events, and policy adjustments stored in browser local storage.
* **Dark & Light SaaS Themes:** Accessible dashboard UI styled with Tailwind CSS v4 supporting dark and light viewing modes.

---

## Architecture Overview

> **Proposed Celo Sepolia deployment architecture — not yet deployed.**

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js 16 Web Dashboard                       │
│      React 19 • Tailwind CSS v4 • Lucide Icons • LocalStorage State     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      ProcureYeti Client Library                        │
│                           (src/lib/altana/)                            │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │   Altana SDK Client     │  │     ERC-8004 Identity Helpers       │  │
│  │  - Official CELO_SEPOLIA│  │  - Registration metadata builder    │  │
│  │  - Session builder      │  │  - Phase 1 & 2 call encoders        │  │
│  │  - Call calldata encoder│  │  - Registry: 0x8004A818BFB912233... │  │
│  └─────────────────────────┘  └─────────────────────────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
             (Planned path when connected with owner/agent signers)
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│         Proposed Celo Sepolia Testnet Architecture (Not Yet Deployed)  │
│                             (Chain ID 11142220)                        │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                 ProcureYetiDisburser.sol                       │   │
│   │                 (Holds Treasury USDC Vault)                    │   │
│   │                                                                │   │
│   │  On-Chain Security Checks:                                     │   │
│   │  1. onlyAuthorized: Caller is owner OR authorized Altana agent │   │
│   │  2. isApprovedSupplier: Recipient MUST be in allowlist mapping │   │
│   │  3. maxSinglePayment: Amount <= $2,500 USDC                   │   │
│   │  4. autonomousThreshold: If agent, amount <= $500 USDC        │   │
│   │  5. dailyVelocityCap: Spent today <= $5,000 USDC (UTC day)     │   │
│   │  6. safeTransfer: Circle USDC transfer from vault to supplier  │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│                                   ▼                                    │
│       ┌────────────────────────────────────────────────────────┐       │
│       │               Native Circle USDC Token                 │       │
│       │      0x01C5C0122039549AD1493B8220cABEdD739BC44E       │       │
│       └────────────────────────────────────────────────────────┘       │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Frontend Layer (Next.js 16 App Router):** Single-page dashboard running React 19. Manages UI state, quotation evaluation views, and modal dialogs with persistent `localStorage` hydration for offline evaluation.
2. **Altana SDK Integration (`src/lib/altana/client.ts`, `session.ts`, `execution.ts`):** Initializes an Altana SDK client configured for `CELO_SEPOLIA`. Provides helper functions to build session permissions strictly scoped to `disbursePayment(address,uint256,string)` on the disburser contract.
3. **ERC-8004 Helper Code (`src/lib/altana/erc8004.ts`):** Prepares metadata and calldata for the two-phase ERC-8004 agent registration standard (Phase 1 minting of agent NFT ID, Phase 2 URI update) targeting Celo Sepolia's official registry.
4. **ProcureYetiDisburser Smart Contract (`contracts/ProcureYetiDisburser.sol`):** Owner-governed Solidity 0.8.28 payment router compiled for the Cancun EVM target on Celo Sepolia. Holds deposited treasury USDC and disburses funds to approved suppliers upon valid caller invocation.

---

## Security Model

The security model of ProcureYeti relies on deterministic smart contract rules rather than client-side checks or unverified agent outputs:

| Rule | Enforcement | Value / Limit | Enforced Behavior & Revert Errors |
| :--- | :--- | :--- | :--- |
| **Supplier Allowlist** | Smart Contract | `isApprovedSupplier[supplier] == true` | Reverts with `SupplierNotApproved(supplier)`. Only addresses approved by the owner can receive disbursements. |
| **Autonomous Agent Cap** | Smart Contract | $\le \$500$ USDC (`500000000` units) | Reverts with `PaymentExceedsAutonomousCap(amount, threshold)` if caller is an authorized agent attempting disbursements above $500. |
| **Max Single Payment** | Smart Contract | $\le \$2,500$ USDC (`2500000000` units) | Reverts with `PaymentExceedsSingleCap(amount, cap)` for all callers (including owner), restricting maximum single-transaction exposure. |
| **Daily Spending Velocity Cap** | Smart Contract | $\le \$5,000$ USDC (`5000000000` units) | Tracks cumulative disbursements per **UTC calendar day** (`block.timestamp / 1 days`). Reverts with `PaymentExceedsDailyCap(amount, remaining)`. |
| **Owner Authority** | Smart Contract | `onlyOwner` modifier | Only the owner can approve or revoke suppliers, update spending parameters, and authorize agent addresses. Unauthorized callers revert with `Unauthorized()`. |

### Important Security Controls and Limitations

* **Treasury Custody:** The disburser contract holds deposited USDC in escrow. It does not pull tokens from external accounts on demand; disbursements require that the contract has sufficient treasury liquidity deposited beforehand.
* **Owner Key Security:** The contract relies strictly on the owner's private key remaining secure. An owner key compromise would allow modifying allowlists, altering spending limits, or withdrawing contract treasury funds via emergency withdrawal.
* **Off-Chain Supplier Validation:** The smart contract verifies that a recipient address matches the owner-approved allowlist, but cannot detect off-chain vendor fraud or evaluate the physical delivery of goods.
* **UTC Calendar-Day Boundary:** The daily velocity cap resets at 00:00 UTC based on `block.timestamp / 1 days`. It is not a rolling 24-hour window, meaning disbursements made late in a UTC day can be followed by new disbursements immediately after UTC midnight without violating the contract's daily cap check.
* **Router Enforcement vs. Altana Spend Limits:** In Altana / Porto smart accounts, `SpendPermission` monitors tokens transferred directly out of the smart account. Because `ProcureYetiDisburser` holds treasury funds in the contract itself and executes `usdc.safeTransfer(supplier, amount)` internally, Altana's account-level `SpendPermission` does not observe or decrement against internal router disbursements. The router's own Solidity code is the authoritative enforcement point for payment thresholds, velocity caps, and supplier allowlisting.

---

## Current Implementation Status

> [!IMPORTANT]
> **ProcureYeti Celo is currently a prototype under active development and is NOT production-ready.**
> It has been prepared and evaluated in a local test environment for hackathon demonstration.

| Category | Component | Current Reality |
| :--- | :--- | :--- |
| **Working Locally** | Web Dashboard | Full Next.js 16 UI with all 8 navigation views, modal dialogs, and dark/light modes. |
| **Working Locally** | Offline State Storage | `src/lib/storage.ts` provides persistent `localStorage` management and demo resets. |
| **Local Contract Tests** | Unit & EVM Tests | **18/18 tests pass** using Node.js native test runner. Static artifact tests verify Cancun compilation; integration tests execute on local Paris/Shanghai-compatible Ganache. |
| **Local Contract Tests** | Static Verification | Calldata encoding, ABI signatures, and bytecode integrity verified against Solidity 0.8.28. |
| **SDK Helpers (Not Live)** | Altana SDK Helpers | Helper functions in `src/lib/altana/` are fully written and unit-tested, but **not yet exercised with a live browser wallet or passkey signer**. |
| **SDK Helpers (Not Live)** | ERC-8004 Registration | Metadata generator and calldata encoders are implemented in code, but **no agent ID has been minted on Celo Sepolia**. |
| **Not Yet Deployed** | `ProcureYetiDisburser.sol` | **Not yet broadcasted to Celo Sepolia testnet**. The address in `src/lib/altana/disburser.ts` is a development placeholder. |
| **Simulated in UI** | Approval Centre Actions | Authorizing a requisition in the UI simulates approval by recording a mock reference (`DEMO-AUTH-xxxx`) and updating local state. **It does not generate a cryptographic signature or broadcast a blockchain transaction.** |
| **Simulated in UI** | Balances & Quotations | Displayed wallet balances ($14,250 cUSD, 25 CELO, $5,000 USDC) and quotation match scores are demo seed data, not live RPC queries or real-time LLM inference. |

---

## Technology Stack

* **Frontend Framework:** Next.js `16.4.6` (App Router, Turbopack enabled)
* **UI Library:** React `19.3.0`, React DOM `19.3.0`
* **Styling & Icons:** Tailwind CSS `4.3.3`, `@tailwindcss/turbopack` `4.3.3`, Lucide React `1.77.0`
* **Web3 & Blockchain Tooling:**
  * `@altananetwork/sdk` `1.1.0` — Altana Smart Account & KeyStore SDK
  * `viem` `2.58.2` — EVM client, ABI encoding, and contract utilities
  * `solc` `0.8.28` — Solidity compiler (compilation artifact targets Cancun EVM for Celo Sepolia deployment, 200 optimizer runs)
  * `ganache` `7.9.2` — Local in-memory EVM test environment (Paris/Shanghai-compatible execution)
* **Language & Quality:** TypeScript `5.9.3`, ESLint `9.39.5`, `eslint-config-next` `16.4.6`

---

## Prerequisites & Installation

### Prerequisites
* **Node.js:** `>= 20.18.0` (LTS recommended)
* **npm:** `>= 10.0.0`
* **Git:** Installed on system

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Alafedoyinsola/ProcureYeti-Celo.git
cd ProcureYeti-Celo

# 2. Install dependencies
npm install
```

---

## Commands & Verification

### Run Automated Tests
Executes static compilation verification for the Cancun deployment target, calldata checks, and local EVM integration tests on Ganache (using Paris/Shanghai-compatible execution):
```bash
npm test
```
*Verified result:* 18 tests passing across `test/disburser.test.js` and `test/evm-disburser.test.js`, testing scenarios including unauthorized callers, unapproved suppliers, agent autonomous cap exceedance ($500), supplier revocation, and daily velocity tracking.

### Run Linter
Verifies ESLint formatting and rules:
```bash
npm run lint
```
*Verified result:* Clean run with 0 errors and 0 warnings.

### Prepare Disburser (Dry-Run Compilation)
Compiles `ProcureYetiDisburser.sol` with the Cancun EVM target and outputs constructor calldata and artifact metadata:
```bash
npm run prepare:disburser
```
*Verified result:* Generates `contracts/ProcureYetiDisburser.json` and outputs ABI-encoded constructor parameters for Celo Sepolia. Detailed deployment options are documented in [`contracts/DEPLOYMENT.md`](contracts/DEPLOYMENT.md).

### Build Production Bundle
Runs Next.js production compilation with Turbopack and TypeScript verification:
```bash
npm run build
```
*Verified result:* Successful build with prerendered static routes (`/` and `/_not-found`).

### Start Development Server
Starts local development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

Refer to [`.env.example`](.env.example) for environment configuration:

```bash
# Copy template to .env.local for local development
cp .env.example .env.local
```

| Variable | Description | Value |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_DISBURSER_ADDRESS` | Deployed contract address of `ProcureYetiDisburser.sol` on Celo Sepolia | *(Empty by default; populate only after deploying to Celo Sepolia and verifying on-chain)* |
| `NEXT_PUBLIC_CELO_SEPOLIA_RPC` | RPC endpoint for Celo Sepolia testnet | `https://forno.celo-sepolia.celo-testnet.org` |
| `NEXT_PUBLIC_CHAIN_ID` | Network Chain ID | `11142220` |
| `DEPLOYER_PRIVATE_KEY` | Deployer private key (funded with testnet CELO) | **Optional.** Only needed if running `node scripts/deploy-disburser.js --broadcast`. Never commit private keys. |

> [!NOTE]
> The application runs out-of-the-box in local development mode without requiring any environment variables.

---

## Project Roadmap

The following steps outline the path toward a complete, on-chain hackathon demonstration:

- [x] **Architecture Design & Local Implementation:** Next.js dashboard, Altana SDK integration scaffolding, and local state management.
- [x] **Smart Contract Engineering:** Treasury vault payment router `ProcureYetiDisburser.sol` with allowlists, caps, and test suite.
- [x] **Local EVM Verification:** Automated test suite verifying tested scenarios: unauthorized callers, unapproved suppliers, agent autonomous cap exceedance ($500), supplier revocation, and daily velocity tracking.
- [ ] **Phase 1: Contract Deployment:** Broadcast `ProcureYetiDisburser.sol` to Celo Sepolia and verify on CeloScan / Blockscout.
- [ ] **Phase 2: Contract Configuration:** Call `approveSuppliersBatch` and `setAuthorizedAgent` with initial testnet addresses.
- [ ] **Phase 3: Live Wallet Connection:** Integrate an interactive wallet connection (Web3 wallet or Altana passkey client) into the frontend.
- [ ] **Phase 4: Live Altana Session Testing:** Grant a live Altana session key, submit an autonomous test disbursement through the relay, and verify receipt on CeloScan.
- [ ] **Phase 5: ERC-8004 Agent Registration:** Mint the agent's on-chain identity NFT on Celo Sepolia's official registry and update the metadata URI.
- [ ] **Phase 6: End-to-End Hackathon Demonstration:** Record end-to-end flow from employee requisition to on-chain settlement.
