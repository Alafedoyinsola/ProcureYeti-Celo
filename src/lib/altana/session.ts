import { parseUnits, type Address } from 'viem';
import type {
  CallPermission,
  SpendPermission,
  SessionPermissions,
  Session,
} from '@altananetwork/sdk';
import { ALTANA_CELO_CONFIG } from './client';
import {
  CELO_SEPOLIA_USDC,
  CELO_SEPOLIA_USDC_ADDRESS,
  CELO_SEPOLIA_CUSD,
  CELO_SEPOLIA_CUSD_ADDRESS,
  DEFAULT_PROCUREMENT_TOKEN,
  type TokenConfig,
} from './tokens';

export {
  CELO_SEPOLIA_USDC,
  CELO_SEPOLIA_USDC_ADDRESS,
  CELO_SEPOLIA_CUSD,
  CELO_SEPOLIA_CUSD_ADDRESS,
  DEFAULT_PROCUREMENT_TOKEN,
};

export interface ProcurementSessionParams {
  /**
   * Approved vendor addresses.
   * NOTE: Enforced at the application / agent execution plan level during calldata preparation.
   * Vendor addresses are recipients in the ERC-20 `transfer(recipient, amount)` function,
   * NOT the contract receiving the message call!
   */
  allowedVendorAddresses: Address[];
  /** Spending limit over the rolling period (e.g. 500 for $500 limit) */
  dailySpendingLimit?: number;
  /** Backwards compatibility alias for dailySpendingLimit */
  dailySpendingLimitCUSD?: number;
  /** Token configuration object (contains address and verified decimals) */
  token?: TokenConfig;
  /** Optional token address override (if token object not provided) */
  tokenAddress?: Address;
  /** Session expiry duration in seconds (default: 7 days) */
  expirySeconds?: number;
}

/**
 * Resolves token configuration from parameters, ensuring verified address and decimals.
 */
export function resolveTokenConfig(token?: TokenConfig, tokenAddress?: Address): TokenConfig {
  if (token) return token;
  if (tokenAddress) {
    if (tokenAddress.toLowerCase() === CELO_SEPOLIA_CUSD_ADDRESS.toLowerCase()) {
      return CELO_SEPOLIA_CUSD;
    }
    if (tokenAddress.toLowerCase() === CELO_SEPOLIA_USDC_ADDRESS.toLowerCase()) {
      return CELO_SEPOLIA_USDC;
    }
    // Custom token fallback, defaulting to 18 decimals if unknown
    return {
      address: tokenAddress,
      symbol: 'TOKEN',
      name: 'Custom ERC-20 Token',
      decimals: 18,
    };
  }
  return DEFAULT_PROCUREMENT_TOKEN;
}

/**
 * Builds verified Altana SDK session permissions without signing or broadcasting.
 *
 * SAFETY ARCHITECTURE:
 * 1. Contract Call Allowlisting:
 *    - In an ERC-20 payment, the contract receiving the EVM call (`to`) is the ERC-20 TOKEN CONTRACT,
 *      NOT the vendor! The vendor is the parameter to `transfer(address to, uint256 amount)`.
 *    - The session call rule therefore targets `to: token.address` with `signature: 'transfer(address,uint256)'`.
 *    - Vendor destinations are enforced before execution by ProcureYeti policy verification.
 *
 * 2. Rolling Spend Limits:
 *    - Velocity cap specified in smallest raw integer units (`bigint`) using verified decimals
 *      (e.g., 6 decimals for USDC: $500 -> 500,000,000 raw units).
 *
 * 3. Expiry:
 *    - UNIX timestamp boundary enforced on-chain by Altana KeyStore.
 */
export function buildProcurementSessionPermissions(
  params: ProcurementSessionParams
): { permissions: SessionPermissions; expiry: number } {
  const token = resolveTokenConfig(params.token, params.tokenAddress);
  const dailyLimit = params.dailySpendingLimit ?? params.dailySpendingLimitCUSD ?? 500;
  const expirySeconds = params.expirySeconds ?? 7 * 24 * 60 * 60; // 7 days default

  // 1. Contract Call Allowlisting:
  // Strictly authorizes the token contract for ERC-20 transfer calls.
  // The vendor wallet is the recipient argument in the transfer calldata.
  const calls: CallPermission[] = [
    {
      to: token.address,
      signature: 'transfer(address,uint256)',
    },
  ];

  // 2. Rolling Spend Limits:
  // Exact raw integer calculation matching token decimals.
  const rawLimit = parseUnits(dailyLimit.toString(), token.decimals);
  const spend: SpendPermission[] = [
    {
      token: token.address,
      limit: rawLimit,
      period: 'day',
    },
  ];

  // 3. Expiry timestamp
  const expiry = Math.floor(Date.now() / 1000) + expirySeconds;

  return {
    permissions: {
      calls,
      spend,
    },
    expiry,
  };
}

export interface PreparedSessionDraft {
  network: typeof ALTANA_CELO_CONFIG.chain.name;
  chainId: number;
  allowedVendorsCount: number;
  allowedVendorAddresses: Address[];
  dailySpendLimit: string;
  rawSpendLimit: string;
  tokenAddress: Address;
  tokenSymbol: string;
  tokenDecimals: number;
  expiryDate: string;
  permissions: SessionPermissions;
  requiresOwnerSignature: boolean;
}

/**
 * Prepares a human-readable session summary for the owner before authorization.
 */
export function prepareSessionDraft(params: ProcurementSessionParams): PreparedSessionDraft {
  const token = resolveTokenConfig(params.token, params.tokenAddress);
  const dailyLimit = params.dailySpendingLimit ?? params.dailySpendingLimitCUSD ?? 500;
  const { permissions, expiry } = buildProcurementSessionPermissions(params);
  const rawLimit = parseUnits(dailyLimit.toString(), token.decimals);

  return {
    network: ALTANA_CELO_CONFIG.chain.name,
    chainId: ALTANA_CELO_CONFIG.chainId,
    allowedVendorsCount: params.allowedVendorAddresses.length,
    allowedVendorAddresses: params.allowedVendorAddresses,
    dailySpendLimit: `$${dailyLimit.toLocaleString()} ${token.symbol}`,
    rawSpendLimit: rawLimit.toString(),
    tokenAddress: token.address,
    tokenSymbol: token.symbol,
    tokenDecimals: token.decimals,
    expiryDate: new Date(expiry * 1000).toISOString(),
    permissions,
    requiresOwnerSignature: true,
  };
}

/**
 * Type-safe interface representing an active Altana session descriptor.
 */
export type ActiveAltanaSession = Session;
