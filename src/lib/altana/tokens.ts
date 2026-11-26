
import type { Address } from 'viem';

/**
 * Stable token configurations for Celo Mainnet (42220)
 * and Celo Sepolia (11142220).
 *
 * Mainnet USDC address is verified against Circle's official documentation.
 * Do not use the USDC fee adapter as an ERC-20 token contract.
 */

export interface TokenConfig {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  chainId?: number;
  isNativeGasToken?: boolean;
}

/** Native Circle USDC on Celo Mainnet */
export const CELO_MAINNET_USDC_ADDRESS: Address =
  '0xcebA9300f2b948710d2653dD7B07f33A8B32118C';

export const CELO_MAINNET_USDC: TokenConfig = {
  address: CELO_MAINNET_USDC_ADDRESS,
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  chainId: 42220,
};

/** Mento cUSD on Celo Mainnet */
export const CELO_MAINNET_CUSD_ADDRESS: Address =
  '0x765DE816845861e75A25fCA122bb6898B8B1282a';

export const CELO_MAINNET_CUSD: TokenConfig = {
  address: CELO_MAINNET_CUSD_ADDRESS,
  symbol: 'cUSD',
  name: 'Celo Dollar',
  decimals: 18,
  chainId: 42220,
};

/** Native Circle USDC on Celo Sepolia */
export const CELO_SEPOLIA_USDC_ADDRESS: Address =
  '0x01C5C0122039549AD1493B8220cABEdD739BC44E';

export const CELO_SEPOLIA_USDC: TokenConfig = {
  address: CELO_SEPOLIA_USDC_ADDRESS,
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  chainId: 11142220,
};

/** Mento cUSD on Celo Sepolia */
export const CELO_SEPOLIA_CUSD_ADDRESS: Address =
  '0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80';

export const CELO_SEPOLIA_CUSD: TokenConfig = {
  address: CELO_SEPOLIA_CUSD_ADDRESS,
  symbol: 'cUSD',
  name: 'Celo Dollar',
  decimals: 18,
  chainId: 11142220,
};

/**
 * Returns the USDC token configuration for a supported Celo network.
 * Unsupported chain IDs are rejected instead of silently selecting Sepolia.
 */
export function getUsdcTokenConfig(chainId: number): TokenConfig {
  switch (chainId) {
    case 42220:
      return CELO_MAINNET_USDC;

    case 11142220:
      return CELO_SEPOLIA_USDC;

    default:
      throw new Error(`Unsupported Celo chain ID for USDC: ${chainId}`);
  }
}

/** Default procurement settlement token: Celo Mainnet USDC */
export const DEFAULT_PROCUREMENT_TOKEN = CELO_MAINNET_USDC;

/** Registry of supported Celo stablecoins */
export const VERIFIED_CELO_TOKENS: Record<
  number,
  Record<'USDC' | 'cUSD', TokenConfig>
> = {
  42220: {
    USDC: CELO_MAINNET_USDC,
    cUSD: CELO_MAINNET_CUSD,
  },
  11142220: {
    USDC: CELO_SEPOLIA_USDC,
    cUSD: CELO_SEPOLIA_CUSD,
  },
};

export const VERIFIED_CELO_SEPOLIA_TOKENS =
  VERIFIED_CELO_TOKENS[11142220];
