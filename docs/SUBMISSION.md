# ProcureYeti Sentinel: Hackathon Submission Package
## Agents Open for Business — Track 4: Agent Wallets (Altana)

**Project Name:** ProcureYeti Sentinel
**Tagline:** AI recommends. Owners authorize. Celo enforces.
**Repository:** [https://github.com/Alafedoyinsola/ProcureYeti-Celo](https://github.com/Alafedoyinsola/ProcureYeti-Celo)
**Track:** Track 4 · Altana Agent Wallets (`altana`)
**Target Bounties:**
- `8e75a6d8-8da4-483d-82bf-2274df0356f0` (Altana Agent Wallets · 1st Place: $750 + 25,000 Altana XP)
- `ab7df96f-e99d-45f7-ac41-fc9d7473af83` (Altana Agent Wallets · 2nd Place: $250 + 10,000 Altana XP)
- `d7be31a0-9388-48bc-9943-1d32c697cb69` (Altana Product Reviews: 5,000 Altana XP)

---

## 1. Submission Form Fields & Operational Status

> [!IMPORTANT]
> To maintain complete truthfulness for judges, this table distinguishes completed technical deliverables from pending live-chain operational requirements and illustrative demo mock data.

| Hackathon Field | Status | Submission Value / Reality | Details & Instructions |
| :--- | :---: | :--- | :--- |
| **Project Name** | **Complete** | `ProcureYeti Sentinel` | Autonomous Procurement Spend Governance Protocol |
| **Tagline** | **Complete** | `AI recommends. Owners authorize. Celo enforces.` | Bounded agent spend governed by owner mandates |
| **Repository URL** | **Complete** | `https://github.com/Alafedoyinsola/ProcureYeti-Celo` | Public, fully tested codebase with complete commit history |
| **Local Demo** | **Complete** | `http://localhost:3000` | Fully operational local Next.js 16 / React 19 web app |
| **Public Demo URL** | **Pending** | `[Pending Public Hosting Deployment]` | Local demo instructions provided; can be deployed to Vercel |
| **Demo Video URL** | **Pending** | `[Pending Video Recording]` | Complete 3-minute script & visual storyboard provided below |
| **Track Selection** | **Complete** | `Track 4 · Altana Agent Wallets` | Non-custodial agent wallets with on-chain spending bounds |
| **Attribution Tag** | **Unresolved** | `celo_43f4a9848a4b` *(Code Configured / Execution Gated)* | Tag defined in code; outer calldata verification is **unresolved** for EIP-7702 |
| **Named User** | **Illustrative** | *Elena Vance (Apex Silicon Global)* `[Demo Persona]` | Illustrative demo persona. Real business user to be designated for live launch |
| **Agent Wallet** | **Architecture Ready** | Altana SDK v1.1.0 EIP-7702 Integration | Verified on local Cancun EVM; live mainnet wallet creation pending builder setup |
| **ERC-8004 Agent ID** | **Pending** | `[Pending Mainnet Registration]` | Registry interface supported; live mainnet agent ID not yet registered |
| **Smart Contract** | **Tested (EVM)** | `ProcureYetiDisburser.sol` | 30/30 unit & in-memory Ganache EVM tests pass; deployment to Celo mainnet 42220 is pending |
| **Settlement Token** | **Verified** | Native Circle USDC (`0xcebA9300f2b948710d2653dD7B07f33A8B32118C`) | 6 decimals, verified against official Circle Celo documentation |

---

## 2. Three-Minute Demo Video Script

**Format:** 1080p Screen Recording with Clear Voiceover
**Target Duration:** 3:00 (180 seconds)
**Application Environment:** Local Next.js 16 Web Dashboard (`http://localhost:3000`) in Demo Mode
**Note on Data:** All requisitions, suppliers, and personnel names (*Elena Vance, Apex Silicon Global, David Kim*) are illustrative demo mock data for demonstration purposes.

### [0:00 - 0:35] Scene 1: The Problem & The Core Value Hook
* **Screen Display:** Dashboard Overview in Dark Mode (`http://localhost:3000`). Point to the top governance policy banner: *$500 Auto-Cap, $2,500 Single Requisition Limit, $5,000 UTC Daily Cap*.
* **Voiceover:**
  > "Autonomous AI procurement agents offer immense operational leverage to businesses by scouting competitive bids and negotiating volume discounts. But giving an AI agent unrestricted access to your corporate bank account or a raw private key is a financial disaster waiting to happen. A single prompt injection, model hallucination, or compromised session key could drain your company's entire treasury in seconds.
  >
  > Welcome to **ProcureYeti Sentinel** on Celo. Our operating philosophy is simple: **AI recommends. Owners authorize. Celo enforces.**
  >
  > AI agents never approve purchases or create payment authority. Instead, human business owners authorize cryptographically bounded Purchase Mandates, and agents execute strictly within those boundaries without ever holding direct custody of company funds."

### [0:35 - 1:15] Scene 2: Purchase Requisition & Autonomous Cap Interception
* **Screen Display:** Navigate to `Purchase Requests` tab. Click `New Purchase Request`. Enter title *"AI Training Cluster Reservation"*, Department *"Engineering"*, Estimated Budget *"$2,200 USDC"*, select *Apex Silicon Global*, and submit.
* **Voiceover:**
  > "Let's see this in action. A team lead submits an illustrative requisition for server compute with an estimated budget of $2,200.
  >
  > Notice what happens immediately: because this requisition exceeds our configured $500 autonomous threshold, Sentinel automatically intercepts it. It marks the requisition as 'Owner Mandate Required' and routes it directly to the executive Approval Centre. Routine micro-expenses under $500 can settle autonomously once a mandate exists, but high-value expenditures are strictly ring-fenced on-chain."

### [1:15 - 1:55] Scene 3: Quotation Analysis & Deterministic Sentinel Investigation
* **Screen Display:** Navigate to `Quotations` tab, then switch to `Approval Centre` and click `Review & Generate Mandate` on requisition `PR-2026-081`. Click the `Sentinel Risk Audit & Investigation` tab.
* **Voiceover:**
  > "Before signing off, the business owner reviews the Sentinel Investigation dossier.
  >
  > Sentinel evaluates five deterministic security rules:
  > - Rule 1 verifies the spending threshold.
  > - Rule 2 enforces the $2,500 contract single-payment ceiling.
  > - Rule 3 checks today's cumulative spend against the $5,000 UTC calendar-day cap.
  > - Rule 4 verifies that the vendor's wallet address is active on our verified allowlist.
  > - And our 30-day scanner confirms zero duplicate requisitions.
  >
  > Everything is deterministic, reproducible, and transparent—not an unpredictable black box."

### [1:55 - 2:30] Scene 4: Purchase Mandate Scoping & Auditable Decision Receipt
* **Screen Display:** Click `Mandate Parameters & Call Preview` tab. Highlight the prepared `disburseWithMandate` calldata. Select `7 Days` expiry. Click `Sign & Generate Purchase Mandate`. Show the generated `AuditableDecisionReceipt`.
* **Voiceover:**
  > "Now the owner authorizes the Purchase Mandate.
  >
  > Look at the prepared contract call: it binds the exact supplier address, the exact maximum dollar ceiling of $2,068 USDC, the exact requisition ID, and a 7-day expiration timestamp.
  >
  > When the owner confirms, Sentinel generates an auditable Decision Receipt with a cryptographic SHA-256 digest. Notice our commitment to transparency: this mandate is clearly marked 'Prepared Awaiting Broadcast'. In demo mode, we prepare real calldata without broadcasting fake transactions or generating fabricated transaction hashes."

### [2:30 - 3:00] Scene 5: Altana Agent Wallet & Smart Contract Security
* **Screen Display:** Navigate to `Agent Wallet` tab. Show the Altana Smart Account address, session call permissions, contract treasury balance, and toggle to Light Mode to show contrast.
* **Voiceover:**
  > "Under the hood, the agent operates via an Altana Agent Wallet using EIP-7702 architecture. The session key is strictly scoped to call `disburseWithMandate` on our disburser contract. It has zero permission to call ERC-20 `transfer`, and the agent smart account holds exactly zero tokens. All funds remain in the contract treasury until the disburser validates the owner mandate, burns it to prevent replay, and transfers tokens directly to the supplier via SafeERC20.
  >
  > With 30 out of 30 unit and in-memory Ganache EVM tests passing, both Dark and Light modes fully supported, and complete contract-level enforcement, ProcureYeti Sentinel delivers true enterprise governance for agentic procurement on Celo.
  >
  > Thank you!"

---

## 3. Video Storyboard

```
┌────────────────────────────────────────────────────────────────────────┐
│ SCENE 1: THE PROBLEM & CORE VALUE HOOK (0:00 - 0:35)                   │
│ View: Dashboard Overview in Dark Mode (http://localhost:3000)          │
│ Visual Cues: Policy Banner ($500 Auto-Cap, $2,500 Single Ceiling,      │
│              $5,000 UTC Daily Cap), Celo Network Badges                │
│ Message: "AI Recommends • Owners Authorize • Celo Enforces"            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ SCENE 2: REQUISITION CREATION & AUTONOMOUS GATE (0:35 - 1:15)          │
│ View: New Purchase Request Modal -> Submit $2,200 Compute Request      │
│ Visual Cues: Form submission, automatic status change to               │
│              'Owner Mandate Required', route to Approval Centre        │
│ Message: "Micro-spend bounded; large spend strictly gated"             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ SCENE 3: DETERMINISTIC SENTINEL INVESTIGATION (1:15 - 1:55)            │
│ View: Approval Centre -> Mandate Modal -> Sentinel Risk Audit Tab      │
│ Visual Cues: SENTINEL-R01 through R05 rule evaluations, allowlist check│
│              duplicate scanner (0 duplicates), category price spread   │
│ Message: "Deterministic audit trail before any payment authority"      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ SCENE 4: MANDATE PARAMETERS & DECISION RECEIPT (1:55 - 2:30)           │
│ View: Mandate Parameters Tab -> 7-Day Expiry -> Sign Mandate           │
│ Visual Cues: disburseWithMandate calldata, parameter binding,          │
│              cryptographic SHA-256 receipt, PREPARED status honesty    │
│ Message: "No fake transaction hashes; real prepared calldata"          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ SCENE 5: ALTANA WALLET & CONTRACT ENFORCEMENT (2:30 - 3:00)            │
│ View: Agent Wallet View & Light Mode Toggle                            │
│ Visual Cues: Altana session permissions, contract treasury ($0 in agent│
│              wallet), 30/30 passing local tests, Light mode contrast   │
│ Message: "Zero Direct Custody • EIP-7702 • Production Ready EVM Logic" │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Submission Checklist for Hackathon Judges

### A. Completed & Verified Components (Repository & Codebase)
- [x] **Public GitHub Repository:** [https://github.com/Alafedoyinsola/ProcureYeti-Celo](https://github.com/Alafedoyinsola/ProcureYeti-Celo)
- [x] **Local Reproduction Guide:** Complete steps in `README.md` (`npm install && npm run dev` on `http://localhost:3000`).
- [x] **Solidity Smart Contract:** `ProcureYetiDisburser.sol` compiled with `solc` v0.8.28 for Cancun EVM.
- [x] **Local Test Suite:** 30 passing local tests (7 unit tests + 23 in-memory Ganache EVM tests in `test/evm-disburser.test.js`).
- [x] **Sentinel Policy Engine:** 5 deterministic heuristic rules (`SENTINEL-R01` to `R05`), 30-day duplicate scanner, and price outlier spread heuristics.
- [x] **Altana Session Permission Builder:** `buildDisburserSessionPermissions` strictly scoping agent calls to `disburseWithMandate` on router contract with 1 CELO gas fee headroom.
- [x] **Honest Demo Guarantees:** Zero fake transaction hashes, zero fabricated block explorer links, and clear differentiation between prepared local actions and live on-chain execution.
- [x] **Responsive UI & Themes:** Dark Mode and high-contrast Light Mode verified across all views.
- [x] **6 Genuine High-Resolution Screenshots:** Stored in `docs/screenshots/` and referenced in `README.md`.

### B. Pending & Unresolved Mainnet Operational Items
- [ ] **ERC-8021 Mainnet Attribution:** **UNRESOLVED & EXECUTION GATED.** The tag `celo_43f4a9848a4b` is defined in code (`src/lib/altana/attribution.ts`), but because Altana SDK v1.1.0 bundles operations inside EIP-7702 relayer transactions, Celo's outermost calldata verifier (`verifyTx`) does not recognize inner calldata tags. The execution gate (`isExecutionGated: true`) is deliberately active to prevent uncredited transactions.
- [ ] **Live Mainnet Contract Deployment:** `ProcureYetiDisburser.sol` must be deployed to Celo Mainnet (`Chain ID 42220`) and funded with native Circle USDC (`0xcebA9300f2b948710d2653dD7B07f33A8B32118C`).
- [ ] **Mainnet Altana Agent Wallet:** Persistent Altana smart account must be created on Celo Mainnet with an authorized session key.
- [ ] **ERC-8004 Agent ID Registration:** On-chain agent registration on Celo Mainnet ERC-8004 registry.
- [ ] **Public Web Hosting:** Deploy local Next.js frontend to a public URL (e.g., Vercel / Netlify).
- [ ] **Video Walkthrough Recording:** Record 3-minute video submission using the provided script and storyboard.
- [ ] **Named User Formal Designation:** Replace illustrative demo persona (*Elena Vance / Apex Silicon Global*) with the builder's verified production entity.

---

## 5. Technical Truthfulness & Capability Matrix

| Protocol Layer | Implemented & Verified Locally | Simulated in Demo Mode | Uncompleted / Mainnet Blocker |
| :--- | :--- | :--- | :--- |
| **Smart Contract** (`ProcureYetiDisburser.sol`) | `createMandate`, `revokeMandate`, `disburseWithMandate`, allowlist, spending caps, CEI, SafeERC20, Reentrancy Guard. | None. Full Solidity contract compiled for Cancun EVM and verified on in-memory Ganache EVM. | Contract deployment on Celo Mainnet (`42220`) and treasury funding with live Circle USDC. |
| **Sentinel Policy Engine** | 5 deterministic heuristic rules (`SENTINEL-R01` to `R05`), duplicate requisition scanner, price spread outlier detection. | Illustrative mock requisitions, department budgets, and supplier catalog. | Live multi-agent negotiation over decentralized p2p network. |
| **Altana Agent Wallet SDK** | Bounded session permission generation (`buildDisburserSessionPermissions`), router call scoping, relay gas headroom. | Session status indicator in dashboard when live RPC credentials are not connected. | Production session signing with hardware-backed owner key on Celo Mainnet. |
| **Audit Receipts** | Cryptographic SHA-256 digest calculation, structured audit trail, mandate parameter binding. | Local persistent storage via localStorage. | On-chain IPFS / EAS attestation anchoring. |
| **Celo Attribution** (`celo_43f4a9848a4b`) | Tag constant definition, attribution helper functions, and protective safety gate. | None. Blocker is technically explained in UI and docs. | Outer-envelope relay support for EIP-7702 in `@celo/attribution-tags`. |
