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

export class AttributionGateError extends Error {
  readonly status: AttributionGateStatus;
  readonly targetChainId: number;

  constructor(
    message: string,
    status: AttributionGateStatus = 'gated_relay_incompatible',
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
  verifierMethod: 'ERC-8021 Outermost Calldata Inspection';
  status: AttributionGateStatus;
  isExecutionGated: boolean;
  isLiveExecutionBlocked: boolean;
  blockerReason: string;
  safestAction: string;
}

/**
 * Returns the current ERC-8021 attribution and relay safety report.
 * Guaranteed to return `status: 'gated_relay_incompatible'` and `isExecutionGated: true`
 * while Altana SDK v1.1.0 lacks outer-envelope calldata tagging support.
 */
export function getAttributionReport(
  chainId: number = CELO_MAINNET_CHAIN_ID
): AttributionInvestigationReport {
  return {
    tag: HACKATHON_ATTRIBUTION_TAG,
    targetChainId: chainId,
    relayType: 'Ithaca Porto / EIP-7702 Relayer',
    verifierMethod: 'ERC-8021 Outermost Calldata Inspection',
    status: 'gated_relay_incompatible',
    isExecutionGated: true,
    isLiveExecutionBlocked: true,
    blockerReason:
      'Altana SDK v1.1.0 bundles calls through Ithaca Porto EIP-7702 relay. The Celo ERC-8021 verifyTx parses outer transaction envelope calldata only, failing to detect inner call attribution suffixes.',
    safestAction:
      'Execution gate is actively engaged. No live funds are spent without verified hackathon attribution. Prepared execution plans and signed mandates are saved with complete cryptographic audit receipts.',
  };
}

/**
 * Checks whether live transaction broadcast is permitted.
 * Always returns `false` while the execution gate is engaged.
 */
export function isLiveExecutionAllowed(chainId: number = CELO_MAINNET_CHAIN_ID): boolean {
  const report = getAttributionReport(chainId);
  return !report.isExecutionGated && report.status === 'verified_outer_envelope';
}

/**
 * Asserts that live execution is allowed before initiating any relay broadcast.
 * Throws `AttributionGateError` whenever attribution cannot be verified on the outer envelope.
 */
export function assertExecutionAllowed(chainId: number = CELO_MAINNET_CHAIN_ID): void {
  if (!isLiveExecutionAllowed(chainId)) {
    const report = getAttributionReport(chainId);
    throw new AttributionGateError(
      `Live execution blocked by attribution safety gate: ${report.blockerReason} Status: ${report.status}.`,
      report.status,
      chainId
    );
  }
}

/**
 * Invariant: The configured attribution tag string is NEVER proof of a qualifying transaction.
 * A qualifying transaction requires confirmed on-chain outer-envelope calldata verified by @celo/attribution-tags.
 * A static configuration string or metadata label does NOT constitute proof.
 */
export function isTagProofOfQualifyingTransaction(tag?: string): boolean {
  void tag;
  return false;
}

/**
 * Invariant: Inner calldata tagging cannot override the execution gate.
 * Even if an inner call payload appends the attribution tag or suffix, the outer relayer envelope
 * will bury the suffix inside ABI-encoded UserOp payload, causing outer verification to fail.
 */
export function canInnerCalldataTagOverrideGate(innerCalldata?: string): boolean {
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

export type GuardedBroadcastMethod = (typeof GUARDED_BROADCAST_METHODS)[number];

/**
 * Wraps any client object (e.g. Altana SDK client) with an active Attribution & Relay Safety Gate proxy.
 * Any invocation of a live transaction broadcast method is intercepted and blocked by `assertExecutionAllowed`.
 * Safe read queries, gas quotes, and offline preparation pass through unhindered.
 */
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
          const method = (target as Record<string, (...a: unknown[]) => unknown>)[prop];
          if (typeof method === 'function') {
            return method.apply(target, args);
          }
          throw new AttributionGateError(
            `Broadcast method ${prop} is blocked by attribution safety gate.`,
            'gated_relay_incompatible',
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

/**
 * Validates the full execution safety posture before preparing or handling transactions.
 */
export function validateExecutionSafety(params?: {
  innerCalldata?: string;
  chainId?: number;
}): ExecutionSafetyEvaluation {
  const chainId = params?.chainId ?? CELO_MAINNET_CHAIN_ID;
  const report = getAttributionReport(chainId);
  const allowed = isLiveExecutionAllowed(chainId);
  const innerOverrides = canInnerCalldataTagOverrideGate(params?.innerCalldata);
  const qualifyingProof = isTagProofOfQualifyingTransaction(report.tag);

  return {
    allowed,
    status: report.status,
    isExecutionGated: report.isExecutionGated,
    isLiveExecutionBlocked: report.isLiveExecutionBlocked,
    isQualifyingProof: qualifyingProof,
    innerCalldataOverridesGate: innerOverrides,
    tag: report.tag,
    targetChainId: chainId,
    blockerReason: report.blockerReason,
    safestAction: report.safestAction,
  };
}
