import type { Address } from 'viem';

/**
 * Verified Stable Token Configurations for Celo Sepolia (Chain ID: 11142220)
 *
 * SAFETY & VERIFICATION AUDIT:
 * 1. CELO_SEPOLIA_USDC (Primary):
 *    - Address: 0x01C5C0122039549AD1493B8220cABEdD739BC44E
 *    - Type: Native Circle ERC-20 Token
 *    - Verified on-chain via RPC: name="USDC", symbol="USDC", decimals=6, bytecode length=3598 bytes.
 *
 * 2. WARNING on 0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B:
 *    - Published in Celo documentation as a "USDC Fee Adapter" (for gas fee currency abstraction).
 *    - Verified on Celo Sepolia RPC: bytecode length is 0 (no code at address on Sepolia).
 *    - MUST NOT be used as the ERC-20 transfer token contract!
 *
 * 3. CELO_SEPOLIA_CUSD (Alternative Mento Stablecoin):
 *    - Address: 0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80
 *    - Type: Mento StableToken
 *    - Verified on-chain via RPC: name="Celo Dollar", symbol="cUSD", decimals=18, bytecode length=3532 bytes.
 *
 * 4. REMOVED 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1:
 *    - Old legacy Alfajores testnet address (Alfajores is retired). Completely removed.
 */

export interface TokenConfig {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  isNativeGasToken?: boolean;
}

/** Verified Native Circle USDC on Celo Sepolia (6 decimals) */
export const CELO_SEPOLIA_USDC_ADDRESS: Address = '0x01C5C0122039549AD1493B8220cABEdD739BC44E';

export const CELO_SEPOLIA_USDC: TokenConfig = {
  address: CELO_SEPOLIA_USDC_ADDRESS,
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
};

/** Verified Mento cUSD StableToken on Celo Sepolia (18 decimals) */
export const CELO_SEPOLIA_CUSD_ADDRESS: Address = '0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80';

export const CELO_SEPOLIA_CUSD: TokenConfig = {
  address: CELO_SEPOLIA_CUSD_ADDRESS,
  symbol: 'cUSD',
  name: 'Celo Dollar',
  decimals: 18,
};

/**
 * Default token used for ProcureYeti procurement settlements
 */
export const DEFAULT_PROCUREMENT_TOKEN = CELO_SEPOLIA_USDC;

/**
 * Registry of verified tokens supported on Celo Sepolia
 */
export const VERIFIED_CELO_SEPOLIA_TOKENS: Record<'USDC' | 'cUSD', TokenConfig> = {
  USDC: CELO_SEPOLIA_USDC,
  cUSD: CELO_SEPOLIA_CUSD,
};
