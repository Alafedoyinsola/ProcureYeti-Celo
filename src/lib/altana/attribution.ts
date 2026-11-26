/**
 * Celo ERC-8021 Hackathon Attribution & Relay Safety Gate
 *
 * Track: Agents Open for Business — Track 4: Agent Wallets | Altana
 * Attribution code: celo_43f4a9848a4b
 * Chains: Celo Mainnet (42220) / Celo Sepolia (11142220)
 *
 * VERIFIER FINDINGS:
 * - @celo/attribution-tags supports receipt-aware Orchestrator intent
 *   verification through verifyIntents() and verifyTx().
 * - It checks successful transaction receipts and matching IntentExecuted
 *   events, including sender and nonce.
 * - It also supports receipt-aware ERC-4337 UserOperation verification.
 * - Therefore, inner intent calldata attribution is not inherently invisible
 *   to the Celo verifier.
 *
 * REMAINING BLOCKER:
 * Altana SDK 1.2.0's prepareTaggedIntent() catches tagged preparation errors
 * and retries with untagged calls when untaggedCalls is supplied.
 * No supported fail-closed option has been established.
 *
 * SAFETY INVARIANT:
 * Live execution remains blocked until attribution fallback is controlled
 * and a real qualifying transaction is independently verified.
 */

export const HACKATHON_ATTRIBUTION_TAG = 'celo_43f4a9848a4b';
export const CELO_MAINNET_CHAIN_ID = 42220;
export const CELO_SEPOLIA_CHAIN_ID = 11142220;

export type AttributionGateStatus =
  | 'gated_attribution_not_guaranteed'
  | 'demo_simulation';

export class AttributionGateError extends Error {
  readonly status: AttributionGateStatus;
  readonly targetChainId: number;

  constructor(
    message: string,
    status: AttributionGateStatus = 'gated_attribution_not_guaranteed',
    targetChainId: number = CELO_MAINNET_CHAIN_ID
  ) {
    super(message);
    this.name = 'AttributionGateError';
    this.status = status;
    this.targetChainId = targetChainId;
    Object.setPrototypeOf(this, AttributionGateError.prototype);
  }
}

export interface AttributionInvestigationReport {
  tag: string;
  targetChainId: number;
  relayType: 'Ithaca Porto / EIP-7702 Relayer';
  verifierMethod: 'Receipt-aware Orchestrator and ERC-4337 execution verification';
  status: AttributionGateStatus;
  isExecutionGated: boolean;
  isLiveExecutionBlocked: boolean;
  blockerReason: string;
  safestAction: string;
}

export function getAttributionReport(
  chainId: number = CELO_MAINNET_CHAIN_ID
): AttributionInvestigationReport {
  return {
    tag: HACKATHON_ATTRIBUTION_TAG,
    targetChainId: chainId,
    relayType: 'Ithaca Porto / EIP-7702 Relayer',
    verifierMethod:
      'Receipt-aware Orchestrator and ERC-4337 execution verification',
    status: 'gated_attribution_not_guaranteed',
    isExecutionGated: true,
    isLiveExecutionBlocked: true,
    blockerReason:
      'The Celo verifier supports receipt-aware verification of ERC-8021 attribution in Altana Orchestrator intents. However, Altana SDK 1.2.0 uses the Ithaca Porto / EIP-7702 relay path and retries tagged intent preparation with untagged calls after preparation errors. Until that fallback can be controlled and a real qualifying transaction is independently verified, attribution cannot be guaranteed.',
    safestAction:
      'No live funds are spent while this gate is active. Keep live execution blocked. Use mocked RPC tests for verifier integration, retain audit evidence, and do not treat a configured tag or simulated receipt as proof of a qualifying on-chain transaction.',
  };
}

export function isLiveExecutionAllowed(
  chainId: number = CELO_MAINNET_CHAIN_ID
): boolean {
  void chainId;
  return false;
}

export function assertExecutionAllowed(
  chainId: number = CELO_MAINNET_CHAIN_ID
): void {
  const report = getAttributionReport(chainId);

  throw new AttributionGateError(
    `Live execution blocked by attribution safety gate: ${report.blockerReason} Status: ${report.status}.`,
    report.status,
    chainId
  );
}

/** A configured tag alone is never proof of a qualifying transaction. */
export function isTagProofOfQualifyingTransaction(tag?: string): boolean {
  void tag;
  return false;
}

/** Inner calldata alone can never override the application execution gate. */
export function canInnerCalldataTagOverrideGate(
  innerCalldata?: string
): boolean {
  void innerCalldata;
  return false;
}

export const GUARDED_BROADCAST_METHODS = [
  'execute',
  'grantSession',
  'revokeSession',
  'registerAgentIdentity',
  'registerSessionKey',
  'syncSessionToCache',
  'approveSignatureChecker',
  'revokeSignatureChecker',
  'approveTokenForPermit2',
] as const;

export type GuardedBroadcastMethod =
  (typeof GUARDED_BROADCAST_METHODS)[number];

export function wrapWithAttributionGate<T extends object>(
  client: T,
  chainId: number = CELO_MAINNET_CHAIN_ID
): T {
  const guardedSet = new Set<string>(GUARDED_BROADCAST_METHODS);

  return new Proxy(client, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && guardedSet.has(prop)) {
        return function guardedBroadcastMethod(...args: unknown[]) {
          void args;
          assertExecutionAllowed(chainId);

          const method =
            (target as Record<string, (...a: unknown[]) => unknown>)[prop];

          if (typeof method === 'function') {
            return method.apply(target, args);
          }

          throw new AttributionGateError(
            `Broadcast method ${prop} is blocked by attribution safety gate.`,
            'gated_attribution_not_guaranteed',
            chainId
          );
        };
      }

      return Reflect.get(target, prop, receiver);
    },
  });
}

export interface ExecutionSafetyEvaluation {
  allowed: boolean;
  status: AttributionGateStatus;
  isExecutionGated: boolean;
  isLiveExecutionBlocked: boolean;
  isQualifyingProof: boolean;
  innerCalldataOverridesGate: boolean;
  tag: string;
  targetChainId: number;
  blockerReason: string;
  safestAction: string;
}

export function validateExecutionSafety(params?: {
  innerCalldata?: string;
  chainId?: number;
}): ExecutionSafetyEvaluation {
  const chainId = params?.chainId ?? CELO_MAINNET_CHAIN_ID;
  const report = getAttributionReport(chainId);

  return {
    allowed: false,
    status: report.status,
    isExecutionGated: true,
    isLiveExecutionBlocked: true,
    isQualifyingProof: isTagProofOfQualifyingTransaction(report.tag),
    innerCalldataOverridesGate: canInnerCalldataTagOverrideGate(
      params?.innerCalldata
    ),
    tag: report.tag,
    targetChainId: chainId,
    blockerReason: report.blockerReason,
    safestAction: report.safestAction,
  };
}
