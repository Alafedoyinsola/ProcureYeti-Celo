import {
  erc8004Registry,
  buildErc8004RegisterCall,
  buildErc8004SetAgentUriCall,
  erc8004RegisterPermissions,
  encodeErc8004AgentUri,
  withErc8004Registration,
  type Erc8004RegistrationFile,
  type Erc8004MetadataEntry,
  type Call,
  type CallPermission,
} from '@altananetwork/sdk';
import { type Address } from 'viem';
import { ALTANA_CELO_CONFIG } from './client';
import { assertExecutionAllowed } from './attribution';

/**
 * Verified Official ERC-8004 Identity Registry Address on Celo Sepolia (Chain ID 11142220)
 * Sourced directly from @altananetwork/sdk ERC8004_ADDRESSES[11142220]
 * Target Contract: 0x8004A818BFB912233c491871b3d84c89A494BD9e
 */
export const CELO_SEPOLIA_ERC8004_REGISTRY: Address = erc8004Registry(ALTANA_CELO_CONFIG.chainId);

/**
 * Returns the canonical ERC-8004 registry address for the specified chain.
 * Defaults to the active Celo configuration.
 */
export function getErc8004RegistryAddress(chainId: number = ALTANA_CELO_CONFIG.chainId): Address {
  return erc8004Registry(chainId);
}

/**
 * Generates standard ERC-8004 registration metadata JSON for the ProcureYeti agent.
 *
 * SAFETY & SCHEMA INVARIANTS:
 * 1. Initial registration leaves `registrations: []` empty: an un-minted token cannot claim an Agent ID.
 * 2. Unverified or non-functional placeholder domain endpoints and images are strictly omitted.
 * 3. Preserves official agent name and accurate project description.
 */
export function buildProcureYetiAgentMetadata(params?: {
  agentName?: string;
  agentDescription?: string;
  smartAccountAddress?: Address;
}): Erc8004RegistrationFile {
  const {
    agentName = 'ProcureYeti Autonomous Procurement Agent',
    agentDescription = 'Autonomous AI procurement agent governed by Altana Agent Wallets on Celo.',
  } = params || {};

  return {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: agentName,
    description: agentDescription,
    services: [],
    registrations: [],
  };
}

/**
 * Patches the minted on-chain Agent ID into the registration metadata using SDK's `withErc8004Registration`.
 * Used in Phase 2 to prepare the URI update after the ERC-721 token has minted.
 */
export function patchProcureYetiAgentId(
  file: Erc8004RegistrationFile,
  agentId: number | bigint,
  chainId: number = ALTANA_CELO_CONFIG.chainId
): Erc8004RegistrationFile {
  return withErc8004Registration(file, BigInt(agentId), chainId);
}

/**
 * Encodes an ERC-8004 registration metadata object to a Base64 data URI using the SDK encoder.
 */
export function encodeProcureYetiAgentUri(file: Erc8004RegistrationFile): string {
  return encodeErc8004AgentUri(file);
}

export { encodeErc8004AgentUri, withErc8004Registration };

/**
 * Prepares the ERC-8004 Phase 1 registration call without broadcasting.
 *
 * 2-Phase Registration Workflow:
 * 1. Phase 1 (Mint): Call `buildErc8004RegisterCall` with empty registrations (`registrations: []`).
 *    The contract mints an ERC-721 token and emits a Registered(agentId, owner) event.
 * 2. Phase 2 (URI Patch): The minted agentId is retrieved from logs and patched into the
 *    registration file via `buildErc8004SetAgentUriCall(chainId, agentId, completedURI)`.
 */
export function prepareErc8004RegistrationCall(params: {
  agentUri: string;
  metadata?: readonly Erc8004MetadataEntry[];
  chainId?: number;
}): {
  registryAddress: Address;
  call: Call;
  twoPhaseWorkflowDescription: string;
} {
  const chainId = params.chainId ?? ALTANA_CELO_CONFIG.chainId;
  const registryAddress = erc8004Registry(chainId);
  const call = buildErc8004RegisterCall(
    chainId,
    params.agentUri,
    params.metadata
  );

  return {
    registryAddress,
    call,
    twoPhaseWorkflowDescription:
      'Phase 1: Mints ERC-721 token to smart account with registrations: []. Phase 2: Patches agentId into URI via setAgentURI.',
  };
}

/**
 * Prepares the ERC-8004 Phase 2 URI update call without broadcasting.
 */
export function prepareErc8004SetAgentUriCall(params: {
  agentId: number | bigint;
  agentUri: string;
  chainId?: number;
}): {
  registryAddress: Address;
  call: Call;
} {
  const chainId = params.chainId ?? ALTANA_CELO_CONFIG.chainId;
  const registryAddress = erc8004Registry(chainId);
  const call = buildErc8004SetAgentUriCall(
    chainId,
    BigInt(params.agentId),
    params.agentUri
  );

  return {
    registryAddress,
    call,
  };
}

/**
 * Returns the exact bounded permissions needed if delegating ERC-8004 maintenance to a session key.
 * Strictly scopes permissions to `register(string,(string,bytes)[])` and `setAgentURI(uint256,string)` selectors,
 * preventing any unauthorized NFT transfers or permission escalation.
 */
export function getErc8004SessionPermissions(
  chainId: number = ALTANA_CELO_CONFIG.chainId
): readonly CallPermission[] {
  return erc8004RegisterPermissions(chainId);
}

/**
 * Guarded ERC-8004 identity registration broadcast entry point.
 * Enforces the Attribution & Relay Safety Gate:
 * Immediately calls `assertExecutionAllowed()` before touching the relay or signer.
 * Always throws AttributionGateError while outer-envelope attribution is unresolved.
 */
export async function broadcastGuardedErc8004Registration(): Promise<never> {
  assertExecutionAllowed(ALTANA_CELO_CONFIG.chainId);
  throw new Error('Unreachable: assertExecutionAllowed must block execution.');
}
