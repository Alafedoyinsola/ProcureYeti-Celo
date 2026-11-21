import { type Address } from 'viem';
import { getAltanaClient, ALTANA_CELO_CONFIG } from './client';

export type WalletMode = 'demo' | 'live';
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
export type WalletProviderType = 'altana_passkey' | 'injected_eoa' | 'demo' | null;

export interface LiveWalletSession {
  mode: WalletMode;
  state: ConnectionState;
  providerType: WalletProviderType;
  address: Address | null;
  ownerAddress: Address | null;
  error: string | null;
  chainId: number;
  relayUrl: string;
  isPasskeySupported: boolean;
}

export const INITIAL_LIVE_WALLET_SESSION: LiveWalletSession = {
  mode: 'demo',
  state: 'disconnected',
  providerType: 'demo',
  address: null,
  ownerAddress: null,
  error: null,
  chainId: ALTANA_CELO_CONFIG.chainId,
  relayUrl: ALTANA_CELO_CONFIG.relayUrl || 'https://testnet-relay.altana.network',
  isPasskeySupported: typeof window !== 'undefined' && Boolean(window.PublicKeyCredential),
};

/**
 * Checks whether WebAuthn/Passkey is supported by the current browser environment.
 */
export function checkPasskeySupport(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.PublicKeyCredential);
}

/**
 * Creates or connects an official Altana Passkey Smart Account on Celo Sepolia.
 * Uses `client.createPasskeyWallet` or `client.recoverFromPasskey`.
 * Safe and user-invoked only: Never triggers without explicit user interaction.
 */
export async function connectAltanaPasskeyWallet(
  action: 'create' | 'recover' = 'create'
): Promise<{ address: Address; type: 'altana_passkey' }> {
  if (!checkPasskeySupport()) {
    throw new Error('WebAuthn / Passkeys are not supported or disabled in this browser.');
  }

  const client = getAltanaClient();

  if (action === 'recover') {
    const result = await client.recoverFromPasskey({});
    return {
      address: result.address as Address,
      type: 'altana_passkey',
    };
  }

  const result = await client.createPasskeyWallet({
    name: 'ProcureYeti Celo Owner Wallet',
  });

  return {
    address: result.address as Address,
    type: 'altana_passkey',
  };
}

/**
 * Connects an injected browser wallet (e.g. MetaMask, Rabby) to serve as owner signer.
 * Safe and user-invoked only: Prompts `eth_requestAccounts`.
 */
export async function connectInjectedEoaWallet(): Promise<{ address: Address; type: 'injected_eoa' }> {
  if (typeof window === 'undefined' || !(window as unknown as { ethereum?: unknown }).ethereum) {
    throw new Error('No injected Ethereum/Celo wallet detected in browser (e.g. MetaMask).');
  }

  const ethereum = (window as unknown as { ethereum: { request: (args: { method: string }) => Promise<string[]> } }).ethereum;
  const accounts = await ethereum.request({ method: 'eth_requestAccounts' });

  if (!accounts || accounts.length === 0) {
    throw new Error('No account authorized in wallet.');
  }

  return {
    address: accounts[0] as Address,
    type: 'injected_eoa',
  };
}
