import { createClient, CELO, CELO_SEPOLIA, type Client } from '@altananetwork/sdk';
import { wrapWithAttributionGate } from './attribution';

/**
 * Altana SDK Client Configuration for ProcureYeti Celo
 *
 * Supports both Celo Mainnet (42220) and Celo Sepolia (11142220) using official SDK constants.
 */

export const ALTANA_CELO_MAINNET_CONFIG = CELO;
export const ALTANA_CELO_SEPOLIA_CONFIG = CELO_SEPOLIA;

const activeChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 11142220);

export const ALTANA_CELO_CONFIG = activeChainId === 42220 ? CELO : CELO_SEPOLIA;

let clientInstance: Client | null = null;

/**
 * Returns a singleton Altana client configured with the active Celo network.
 * Systematically guarded by the Attribution & Relay Safety Gate:
 * 1. Sets `agentIdentity: false` to block automatic un-attributed ERC-8004 registration transactions.
 * 2. Wraps the client in an Attribution Gate Proxy to intercept all live broadcast methods.
 * 3. Preserves read queries, quotes, and offline preparation.
 * Safe to call on both client and server.
 */
export function getAltanaClient(): Client {
  if (!clientInstance) {
    const rawClient = createClient({
      chains: [ALTANA_CELO_CONFIG],
      // Explicitly disable automatic ERC-8004 background registration
      agentIdentity: false,
    });

    clientInstance = wrapWithAttributionGate(rawClient, ALTANA_CELO_CONFIG.chainId);
  }
  return clientInstance;
}

export type AltanaConnectionStatus = 'disconnected' | 'connected' | 'demo';

export interface AltanaConnectionState {
  status: AltanaConnectionStatus;
  chainId: number;
  networkName: string;
  smartAccountAddress: string | null;
  ownerAddress: string | null;
  keyStoreAddress: string;
  relayUrl: string;
  hasActiveSession: boolean;
}

export const INITIAL_ALTANA_CONNECTION: AltanaConnectionState = {
  status: 'demo',
  chainId: ALTANA_CELO_CONFIG.chainId,
  networkName: ALTANA_CELO_CONFIG.chainId === 42220 ? 'Celo Mainnet' : 'Celo Sepolia Testnet',
  smartAccountAddress: null,
  ownerAddress: null,
  keyStoreAddress: ALTANA_CELO_CONFIG.keyStore,
  relayUrl: ALTANA_CELO_CONFIG.relayUrl || 'https://relay.altana.network',
  hasActiveSession: false,
};
