import { createClient, CELO_SEPOLIA, type Client } from '@altananetwork/sdk';

/**
 * Altana SDK Client Configuration for ProcureYeti Celo
 *
 * Uses the official CELO_SEPOLIA configuration exported directly from @altananetwork/sdk.
 * - Chain ID: 11142220
 * - KeyStore Registry: 0xCC3df52B6aD826781AAD86EcEB1459ed0b1Ae3F6
 * - KeyStore Controller: 0x54eAb49d805336DB8591BAAF9ac630D0A58Ad2cD
 * - Testnet Relay: https://testnet-relay.altana.network
 * - Public RPC: https://forno.celo-sepolia.celo-testnet.org
 * - Explorer: https://sepolia.celoscan.io
 */

export const ALTANA_CELO_CONFIG = CELO_SEPOLIA;

let clientInstance: Client | null = null;

/**
 * Returns a singleton Altana client configured strictly with official CELO_SEPOLIA.
 * Safe to call on both client and server (never loads private keys or executes automatically).
 */
export function getAltanaClient(): Client {
  if (!clientInstance) {
    clientInstance = createClient({
      chains: [CELO_SEPOLIA],
    });
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

/**
 * Initial safe connection state.
 * By default, starts in 'demo' mode until the owner initiates a connection.
 */
export const INITIAL_ALTANA_CONNECTION: AltanaConnectionState = {
  status: 'demo',
  chainId: CELO_SEPOLIA.chainId,
  networkName: 'Celo Sepolia Testnet',
  smartAccountAddress: null,
  ownerAddress: null,
  keyStoreAddress: CELO_SEPOLIA.keyStore,
  relayUrl: CELO_SEPOLIA.relayUrl || 'https://testnet-relay.altana.network',
  hasActiveSession: false,
};
