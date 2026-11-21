import type { Address } from 'viem';

/**
 * Verified Stable Token Configurations for Celo Mainnet (42220) & Celo Sepolia (11142220)
 *
 * SAFETY & VERIFICATION AUDIT:
 * 1. CELO MAINNET (Chain ID: 42220):
 *    - Native Circle USDC: 0xcebA9300f2b948710d2653dD7B07f33A8B32118C (6 decimals)
 *      Source: Circle official documentation (https://www.circle.com/en/multi-chain-usdc/celo)
 *              CeloScan (https://celoscan.io/address/0xcebA9300f2b948710d2653dD7B07f33A8B32118C)
 *    - Mento cUSD:        0x765DE816845861e75A25fCA122bb6898B8B1282a (18 decimals)
 *    - Native CELO:       0x471EcE3750Da237f93B8E339c536989b8978a438 (18 decimals)
 *
 * 2. CELO SEPOLIA TESTNET (Chain ID: 11142220):
 *    - Native Circle USDC: 0x01C5C0122039549AD1493B8220cABEdD739BC44E (6 decimals)
 *      Source: Celo Sepolia Blockscout (https://celo-sepolia.blockscout.com/address/0x01C5C0122039549AD1493B8220cABEdD739BC44E)
 *              Verified official testnet token on Celo Sepolia Layer 2 testnet.
 *    - Mento cUSD:        0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80 (18 decimals)
 *
 * 3. WARNING on 0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B:
 *    - USDC Fee Adapter address published in Celo docs for gas currency abstraction.
 *    - MUST NOT be used as the ERC-20 token transfer contract!
 */

export interface TokenConfig {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  chainId?: number;
  isNativeGasToken?: boolean;
}

/** Verified Native Circle USDC on Celo Mainnet (Chain ID 42220, 6 decimals) */
export const CELO_MAINNET_USDC_ADDRESS: Address = '0xcebA9300f2b948710d2653dD7B07f33A8B32118C';
export const CELO_MAINNET_USDC: TokenConfig = {
  address: CELO_MAINNET_USDC_ADDRESS,
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  chainId: 42220,
};

/** Verified Mento cUSD on Celo Mainnet (Chain ID 42220, 18 decimals) */
export const CELO_MAINNET_CUSD_ADDRESS: Address = '0x765DE816845861e75A25fCA122bb6898B8B1282a';
export const CELO_MAINNET_CUSD: TokenConfig = {
  address: CELO_MAINNET_CUSD_ADDRESS,
  symbol: 'cUSD',
  name: 'Celo Dollar',
  decimals: 18,
  chainId: 42220,
};

/** Verified Native Circle USDC on Celo Sepolia (Chain ID 11142220, 6 decimals) */
export const CELO_SEPOLIA_USDC_ADDRESS: Address = '0x01C5C0122039549AD1493B8220cABEdD739BC44E';
export const CELO_SEPOLIA_USDC: TokenConfig = {
  address: CELO_SEPOLIA_USDC_ADDRESS,
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  chainId: 11142220,
};

/** Verified Mento cUSD StableToken on Celo Sepolia (Chain ID 11142220, 18 decimals) */
export const CELO_SEPOLIA_CUSD_ADDRESS: Address = '0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80';
export const CELO_SEPOLIA_CUSD: TokenConfig = {
  address: CELO_SEPOLIA_CUSD_ADDRESS,
  symbol: 'cUSD',
  name: 'Celo Dollar',
  decimals: 18,
  chainId: 11142220,
};

/**
 * Returns verified USDC token configuration for the specified chain.
 */
export function getUsdcTokenConfig(chainId: number): TokenConfig {
  if (chainId === 42220) return CELO_MAINNET_USDC;
  return CELO_SEPOLIA_USDC;
}

/**
 * Default token used for ProcureYeti procurement settlements
 */
export const DEFAULT_PROCUREMENT_TOKEN = CELO_SEPOLIA_USDC;

/**
 * Registry of verified tokens supported on Celo
 */
export const VERIFIED_CELO_TOKENS: Record<number, Record<'USDC' | 'cUSD', TokenConfig>> = {
  42220: {
    USDC: CELO_MAINNET_USDC,
    cUSD: CELO_MAINNET_CUSD,
  },
  11142220: {
    USDC: CELO_SEPOLIA_USDC,
    cUSD: CELO_SEPOLIA_CUSD,
  },
};

export const VERIFIED_CELO_SEPOLIA_TOKENS = VERIFIED_CELO_TOKENS[11142220];
