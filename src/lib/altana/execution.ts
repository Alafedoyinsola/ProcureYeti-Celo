import { encodeFunctionData, parseUnits, type Address, erc20Abi } from 'viem';
import type { Call, ExecuteResult, RevokeSessionResult, Session } from '@altananetwork/sdk';
import { resolveTokenConfig } from './session';
import type { TokenConfig } from './tokens';
import {
  buildMandatePaymentCall,
  deriveMandateId,
  isDisburserConfigured,
  getDisburserAddressOrThrow,
} from './disburser';
import { CELO_SEPOLIA_USDC_ADDRESS, CELO_SEPOLIA_USDC } from './tokens';

export interface PrepareDisburserExecutionPlanParams {
  mandateId?: `0x${string}`;
  supplierAddress: Address;
  amountUSDC: number;
  requisitionId: string;
  disburserAddress?: Address;
}

/**
 * Validates and prepares an execution plan targeting the ProcureYetiDisburser router.
 * ProcureYeti Sentinel: Binds the execution call to an owner-approved Purchase Mandate.
 * Does not broadcast or execute.
 */
export function prepareDisburserExecutionPlan(
  params: PrepareDisburserExecutionPlanParams,
  autonomousThreshold: number = 500
): PreparedExecutionPlan {
  const targetAddress = params.disburserAddress || getDisburserAddressOrThrow();
  const mandateId =
    params.mandateId || deriveMandateId(params.requisitionId, params.supplierAddress);

  const call = buildMandatePaymentCall({
    mandateId,
    supplierAddress: params.supplierAddress,
    amountUSDC: params.amountUSDC,
    requisitionId: params.requisitionId,
    disburserAddress: targetAddress,
  });

  const isWithinSessionLimit = params.amountUSDC <= autonomousThreshold;
  const rawAmount = parseUnits(params.amountUSDC.toString(), CELO_SEPOLIA_USDC.decimals);

  return {
    call,
    mandateId,
    vendorAddress: params.supplierAddress,
    amountFormatted: `$${params.amountUSDC.toLocaleString()} USDC`,
    rawAmount: rawAmount.toString(),
    tokenAddress: CELO_SEPOLIA_USDC_ADDRESS,
    tokenSymbol: 'USDC',
    tokenDecimals: 6,
    isWithinSessionLimit,
    requiresOwnerSignature: !isWithinSessionLimit,
    targetNetwork: 'Celo Sepolia (Chain ID 11142220)',
  };
}

export interface PreparePaymentCallParams {
  mandateId?: `0x${string}`;
  vendorAddress: Address;
  amount: number;
  /** Backwards compatibility alias for amount */
  amountCUSD?: number;
  token?: TokenConfig;
  tokenAddress?: Address;
  requisitionId?: string;
  disburserAddress?: Address;
}

/**
 * @deprecated OBSOLETE DIRECT ERC-20 CALL BUILDER.
 * In ProcureYeti Sentinel, all agent payments must route through `buildMandatePaymentCall`.
 */
export function buildVendorPaymentCall(params: PreparePaymentCallParams): Call {
  console.warn(
    '[ProcureYeti Sentinel Security Warning] `buildVendorPaymentCall` (direct ERC-20 transfer) is obsolete. All agent payments must use `buildMandatePaymentCall`.'
  );
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
  mandateId?: `0x${string}`;
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
 * Routes through ProcureYetiDisburser Purchase Mandate engine when configured.
 * Does not broadcast or execute.
 */
export function prepareExecutionPlan(
  params: PreparePaymentCallParams,
  sessionThreshold: number = 500
): PreparedExecutionPlan {
  if (isDisburserConfigured() || params.disburserAddress) {
    const paymentAmount = params.amount ?? params.amountCUSD ?? 0;
    return prepareDisburserExecutionPlan(
      {
        mandateId: params.mandateId,
        supplierAddress: params.vendorAddress,
        amountUSDC: paymentAmount,
        requisitionId: params.requisitionId || 'PR-REQ',
        disburserAddress: params.disburserAddress,
      },
      sessionThreshold
    );
  }

  // Deprecated direct ERC-20 fallback when disburser is not configured
  const token = resolveTokenConfig(params.token, params.tokenAddress);
  const paymentAmount = params.amount ?? params.amountCUSD ?? 0;
  const call = buildVendorPaymentCall(params);
  const isWithinSessionLimit = paymentAmount <= sessionThreshold;
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
