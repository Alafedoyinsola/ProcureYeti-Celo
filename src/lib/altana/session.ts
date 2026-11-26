import { parseUnits, type Address } from 'viem';
import type {
  CallPermission,
  SpendPermission,
  SessionPermissions,
  Session,
} from '@altananetwork/sdk';
import { ALTANA_CELO_CONFIG } from './client';
import {
  CELO_MAINNET_USDC,
  CELO_MAINNET_CUSD,
  CELO_MAINNET_CUSD_ADDRESS,
  CELO_SEPOLIA_USDC,
  CELO_SEPOLIA_USDC_ADDRESS,
  CELO_SEPOLIA_CUSD,
  CELO_SEPOLIA_CUSD_ADDRESS,
  DEFAULT_PROCUREMENT_TOKEN,
  getUsdcTokenConfig,
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
  /** Spending limit over the daily period (e.g. 500 for $500 limit) */
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

  const activeUsdc = getUsdcTokenConfig(ALTANA_CELO_CONFIG.chainId);

  if (tokenAddress) {
    const normalized = tokenAddress.toLowerCase();
    const knownTokens = [
      CELO_MAINNET_USDC,
      CELO_MAINNET_CUSD,
      CELO_SEPOLIA_USDC,
      CELO_SEPOLIA_CUSD,
    ];

    const knownToken = knownTokens.find(
      (candidate) => candidate.address.toLowerCase() === normalized
    );

    if (knownToken) return knownToken;

    return {
      address: tokenAddress,
      symbol: 'TOKEN',
      name: 'Custom ERC-20 Token',
      decimals: 18,
    };
  }

  return activeUsdc;
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
 * 2. Daily Spend Limits:
 *    - Velocity cap specified in smallest raw integer units (`bigint`) using verified decimals
 *      (e.g., 6 decimals for USDC: $500 -> 500,000,000 raw units).
 *
 * 3. Expiry:
 *    - UNIX timestamp boundary enforced on-chain by Altana KeyStore.
 */
import {
  buildDisburserSessionPermissions,
  isDisburserConfigured,
  getDisburserAddressOrThrow,
  PROCURE_YETI_DISBURSER_ADDRESS,
} from './disburser';

export {
  buildDisburserSessionPermissions,
  isDisburserConfigured,
  getDisburserAddressOrThrow,
  PROCURE_YETI_DISBURSER_ADDRESS,
};

/**
 * @deprecated OBSOLETE DIRECT ERC-20 TRANSFER BUILDER.
 * In the ProcureYeti Celo disburser architecture, the agent smart account does NOT hold
 * treasury funds or execute direct ERC-20 transfers. All disbursements must route through
 * ProcureYetiDisburser.sol to enforce on-chain supplier allowlisting and spend velocity caps.
 *
 * Use `buildDisburserSessionPermissions` from `./disburser` instead.
 */
export function buildProcurementSessionPermissions(
  params: ProcurementSessionParams
): { permissions: SessionPermissions; expiry: number } {
  console.warn(
    '[ProcureYeti Security Warning] `buildProcurementSessionPermissions` (direct ERC-20 transfer) is obsolete. All agent payments must use `buildDisburserSessionPermissions` targeting ProcureYetiDisburser.sol.'
  );
  const token = resolveTokenConfig(params.token, params.tokenAddress);
  const dailyLimit = params.dailySpendingLimit ?? params.dailySpendingLimitCUSD ?? 500;
  const expirySeconds = params.expirySeconds ?? 7 * 24 * 60 * 60; // 7 days default

  const calls: CallPermission[] = [
    {
      to: token.address,
      signature: 'transfer(address,uint256)',
    },
  ];

  const rawLimit = parseUnits(dailyLimit.toString(), token.decimals);
  const spend: SpendPermission[] = [
    {
      token: token.address,
      limit: rawLimit,
      period: 'day',
    },
  ];

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
  targetContract: Address | 'Not Deployed';
}

/**
 * Prepares a human-readable session summary for the owner before authorization.
 * Defaults to the disburser router session permissions when configured.
 */
export function prepareSessionDraft(params: ProcurementSessionParams): PreparedSessionDraft {
  const token = resolveTokenConfig(params.token, params.tokenAddress);
  const dailyLimit = params.dailySpendingLimit ?? params.dailySpendingLimitCUSD ?? 500;

  if (isDisburserConfigured()) {
    const disburserToken = getUsdcTokenConfig(ALTANA_CELO_CONFIG.chainId);
    const { permissions, expiry, disburserAddress } = buildDisburserSessionPermissions({
      dailySpendingLimitUSDC: dailyLimit,
      expirySeconds: params.expirySeconds,
    });
    const rawLimit = parseUnits(dailyLimit.toString(), token.decimals);
    return {
      network: ALTANA_CELO_CONFIG.chain.name,
      chainId: ALTANA_CELO_CONFIG.chainId,
      allowedVendorsCount: params.allowedVendorAddresses.length,
      allowedVendorAddresses: params.allowedVendorAddresses,
      dailySpendLimit: `$${dailyLimit.toLocaleString()} USDC`,
      rawSpendLimit: rawLimit.toString(),
      tokenAddress: token.address,
      tokenSymbol: 'USDC',
      tokenDecimals: token.decimals,
      expiryDate: new Date(expiry * 1000).toISOString(),
      permissions,
      requiresOwnerSignature: true,
      targetContract: disburserAddress,
    };
  }

  // Fallback draft when disburser is not yet deployed
  const expiry = Math.floor(Date.now() / 1000) + (params.expirySeconds ?? 7 * 24 * 60 * 60);
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
    permissions: { calls: [], spend: [] },
    requiresOwnerSignature: true,
    targetContract: 'Not Deployed',
  };
}

/**
 * Type-safe interface representing an active Altana session descriptor.
 */
export type ActiveAltanaSession = Session;
