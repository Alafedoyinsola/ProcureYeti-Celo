import { encodeFunctionData, parseUnits, type Address, erc20Abi } from 'viem';
import type { Call, ExecuteResult, RevokeSessionResult, Session } from '@altananetwork/sdk';
import { resolveTokenConfig } from './session';
import type { TokenConfig } from './tokens';

export interface PreparePaymentCallParams {
  vendorAddress: Address;
  amount: number;
  /** Backwards compatibility alias for amount */
  amountCUSD?: number;
  token?: TokenConfig;
  tokenAddress?: Address;
}

/**
 * Builds a standard ERC-20 transfer Call object for an approved vendor.
 * Does not broadcast or execute.
 *
 * SAFETY & PROTOCOL ALIGNMENT:
 * - `Call.to`: The ERC-20 token contract (e.g. USDC `0x01C5C0122039549AD1493B8220cABEdD739BC44E`).
 * - `Call.data`: Standard ERC-20 `transfer(address recipient, uint256 amount)` calldata.
 * - The supplier wallet (`vendorAddress`) is the recipient argument inside the transfer calldata.
 *   The supplier address is NOT the call target!
 * - Token decimals are strictly respected (e.g. 6 decimals for USDC, 18 decimals for cUSD).
 */
export function buildVendorPaymentCall(params: PreparePaymentCallParams): Call {
  const token = resolveTokenConfig(params.token, params.tokenAddress);
  const paymentAmount = params.amount ?? params.amountCUSD ?? 0;
  const rawAmount = parseUnits(paymentAmount.toString(), token.decimals);

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [params.vendorAddress, rawAmount],
  });

  return {
    to: token.address,
    data,
    value: BigInt(0),
  };
}

export interface PreparedExecutionPlan {
  call: Call;
  vendorAddress: Address;
  amountFormatted: string;
  rawAmount: string;
  tokenAddress: Address;
  tokenSymbol: string;
  tokenDecimals: number;
  isWithinSessionLimit: boolean;
  requiresOwnerSignature: boolean;
  targetNetwork: string;
}

/**
 * Validates and prepares an execution plan against session thresholds.
 * Does not broadcast or execute.
 */
export function prepareExecutionPlan(
  params: PreparePaymentCallParams,
  sessionThreshold: number = 500
): PreparedExecutionPlan {
  const token = resolveTokenConfig(params.token, params.tokenAddress);
  const paymentAmount = params.amount ?? params.amountCUSD ?? 0;
  const call = buildVendorPaymentCall(params);
  const isWithinSessionLimit = paymentAmount < sessionThreshold;
  const rawAmount = parseUnits(paymentAmount.toString(), token.decimals);

  return {
    call,
    vendorAddress: params.vendorAddress,
    amountFormatted: `$${paymentAmount.toLocaleString()} ${token.symbol}`,
    rawAmount: rawAmount.toString(),
    tokenAddress: token.address,
    tokenSymbol: token.symbol,
    tokenDecimals: token.decimals,
    isWithinSessionLimit,
    requiresOwnerSignature: !isWithinSessionLimit,
    targetNetwork: 'Celo Sepolia (Chain ID 11142220)',
  };
}

export interface PreparedRevocationPlan {
  sessionPublicKey: string;
  walletAddress: Address;
  expiry: number;
  requiresOwnerSignature: boolean;
  status: 'prepared_awaiting_signature';
}

/**
 * Prepares a revocation plan to invalidate an active session key.
 * Does not broadcast or execute.
 */
export function prepareRevocationPlan(session: Session): PreparedRevocationPlan {
  return {
    sessionPublicKey: session.publicKey,
    walletAddress: session.walletAddress,
    expiry: session.expiry,
    requiresOwnerSignature: true,
    status: 'prepared_awaiting_signature',
  };
}

export type ExecutionOutcome = ExecuteResult;
export type RevocationOutcome = RevokeSessionResult;
