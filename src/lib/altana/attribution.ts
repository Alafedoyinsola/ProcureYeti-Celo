/**
 * Celo ERC-8021 Hackathon Attribution & Relay Safety Gate
 *
 * Hackathon Bounty: Agents Open for Business — Track 4: Agent Wallets | Altana
 * Attribution Tag:  celo_43f4a9848a4b
 * Target Chains:    Celo Mainnet (42220) / Celo Sepolia (11142220)
 *
 * TECHNICAL INVESTIGATION FINDINGS:
 * --------------------------------
 * 1. Celo's official attribution verification library (@celo/attribution-tags / ERC-8021)
 *    inspects the calldata of the outermost transaction envelope submitted to Celo.
 * 2. Altana SDK v1.1.0 bundles agent calls (`client.execute({ session, calls })`) into
 *    an Ithaca Porto / EIP-7702 delegated relay UserOp format.
 * 3. In this architecture, appending the attribution suffix `celo_43f4a9848a4b` to an inner
 *    call's calldata (e.g. inside `disburseWithMandate`) does NOT place the suffix at the end
 *    of the outermost transaction envelope submitted by the Altana relayer.
 * 4. Consequently, Celo's official `verifyTx` fails to detect attribution on Porto/7702 relay transactions.
 *
 * SAFETY INVARIANT:
 * ----------------
 * To prevent broadcasting uncredited mainnet transactions or spending funds without valid hackathon
 * attribution, live transaction broadcast is systematically gated until either:
 * - Altana SDK supports outer-envelope relay attribution tagging, OR
 * - Celo's attribution verifier adds support for EIP-7702 inner execution tracing.
 */

export const HACKATHON_ATTRIBUTION_TAG = 'celo_43f4a9848a4b';
export const CELO_MAINNET_CHAIN_ID = 42220;
export const CELO_SEPOLIA_CHAIN_ID = 11142220;

export type AttributionGateStatus =
  | 'gated_relay_incompatible'
  | 'verified_outer_envelope'
  | 'demo_simulation';

export interface AttributionInvestigationReport {
  tag: string;
  targetChainId: number;
  relayType: 'Ithaca Porto / EIP-7702 Relayer';
  verifierMethod: 'ERC-8021 Outermost Calldata Inspection';
  status: AttributionGateStatus;
  isExecutionGated: boolean;
  blockerReason: string;
  safestAction: string;
}

export function getAttributionReport(chainId: number = 42220): AttributionInvestigationReport {
  return {
    tag: HACKATHON_ATTRIBUTION_TAG,
    targetChainId: chainId,
    relayType: 'Ithaca Porto / EIP-7702 Relayer',
    verifierMethod: 'ERC-8021 Outermost Calldata Inspection',
    status: 'gated_relay_incompatible',
    isExecutionGated: true,
    blockerReason:
      'Altana SDK v1.1.0 bundles calls through Ithaca Porto EIP-7702 relay. The Celo ERC-8021 verifyTx parses outer transaction envelope calldata only, failing to detect inner call attribution suffixes.',
    safestAction:
      'Execution gate is actively engaged. No live funds are spent without verified hackathon attribution. Prepared execution plans and signed mandates are saved with complete cryptographic audit receipts.',
  };
}
