
import { createClient, CELO, CELO_SEPOLIA, type Client } from '@altananetwork/sdk';
import { wrapWithAttributionGate } from './attribution';

/**
 * Altana SDK Client Configuration for ProcureYeti Celo
 *
 * Supports:
 * - Celo Mainnet: 42220
 * - Celo Sepolia: 11142220
 *
 * Mainnet is the default. Unsupported chain IDs fail closed.
 */

export const ALTANA_CELO_MAINNET_CONFIG = CELO;
export const ALTANA_CELO_SEPOLIA_CONFIG = CELO_SEPOLIA;

export const ALTANA_APP_CODE = 'celo_43f4a9848a4b';

const configuredChainId = process.env.NEXT_PUBLIC_CHAIN_ID?.trim();

const activeChainId =
  configuredChainId ? Number(configuredChainId) : 42220;

if (!Number.isSafeInteger(activeChainId)) {
  throw new Error(
    `Invalid NEXT_PUBLIC_CHAIN_ID: ${configuredChainId}`
  );
}

function getActiveChainConfig() {
  switch (activeChainId) {
    case 42220:
      return CELO;
    case 11142220:
      return CELO_SEPOLIA;
    default:
      throw new Error(
        `Unsupported Celo chain ID: ${activeChainId}. Expected 42220 (Mainnet) or 11142220 (Sepolia).`
      );
  }
}

export const ALTANA_CELO_CONFIG = getActiveChainConfig();

let clientInstance: Client | null = null;

/**
 * Returns a singleton Altana client configured for the selected Celo network.
 *
 * Safety controls:
 * 1. Automatic ERC-8004 registration is disabled.
 * 2. The official hackathon attribution app code is configured.
 * 3. All live broadcast methods remain protected by the attribution gate.
 * 4. Read queries, quotes, and offline preparation remain available.
 */
export function getAltanaClient(): Client {
  if (!clientInstance) {
    const rawClient = createClient({
      chains: [ALTANA_CELO_CONFIG],
      agentIdentity: false,
      appCode: 'celo_43f4a9848a4b',
    });

    clientInstance = wrapWithAttributionGate(
      rawClient,
      ALTANA_CELO_CONFIG.chainId
    );
  }

  return clientInstance;
}

export type AltanaConnectionStatus =
  | 'disconnected'
  | 'connected'
  | 'demo';

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
  networkName:
    ALTANA_CELO_CONFIG.chainId === 42220
      ? 'Celo Mainnet'
      : 'Celo Sepolia Testnet',
  smartAccountAddress: null,
  ownerAddress: null,
  keyStoreAddress: ALTANA_CELO_CONFIG.keyStore,
  relayUrl:
    ALTANA_CELO_CONFIG.relayUrl || 'https://relay.altana.network',
  hasActiveSession: false,
};
