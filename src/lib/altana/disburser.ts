import { encodeFunctionData, parseUnits, type Address } from 'viem';
import type { Call, CallPermission, SpendPermission, SessionPermissions } from '@altananetwork/sdk';
import { CELO_SEPOLIA_USDC_ADDRESS, CELO_SEPOLIA_USDC } from './tokens';

/**
 * Verified ProcureYetiDisburser Contract Interface and ABI on Celo Sepolia
 *
 * Resolves the security limitation of ERC-20 transfers by forcing all agent disbursements
 * through an owner-governed smart contract with on-chain supplier whitelist verification.
 */

/// @dev Placeholder until owner executes on-chain deployment with owner keys
export const PROCURE_YETI_DISBURSER_ADDRESS_CELO_SEPOLIA: Address =
  (process.env.NEXT_PUBLIC_DISBURSER_ADDRESS as Address) ||
  '0xD15b805E8004081cE10c0eF62b2f2dC9fFDb7702';

export const PROCURE_YETI_DISBURSER_ABI = [
  {
    type: 'function',
    name: 'disbursePayment',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'supplier', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'requisitionId', type: 'string' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'approveSupplier',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'supplier', type: 'address' },
      { name: 'name', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'approveSuppliersBatch',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'suppliers', type: 'address[]' },
      { name: 'names', type: 'string[]' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'revokeSupplier',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'supplier', type: 'address' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'setSpendingLimits',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_maxSinglePayment', type: 'uint256' },
      { name: '_dailyVelocityCap', type: 'uint256' },
      { name: '_autonomousThreshold', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'setAuthorizedAgent',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agent', type: 'address' },
      { name: 'authorized', type: 'bool' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'isSupplierApproved',
    stateMutability: 'view',
    inputs: [{ name: 'supplier', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'isApprovedSupplier',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'getRemainingDailyCapacity',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'usdc',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'maxSinglePayment',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'dailyVelocityCap',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'autonomousThreshold',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'SupplierApproved',
    inputs: [
      { name: 'supplier', type: 'address', indexed: true },
      { name: 'name', type: 'string', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'SupplierRevoked',
    inputs: [
      { name: 'supplier', type: 'address', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PaymentDisbursed',
    inputs: [
      { name: 'supplier', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'requisitionId', type: 'string', indexed: false },
      { name: 'caller', type: 'address', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
] as const;

export interface PrepareDisburserPaymentParams {
  supplierAddress: Address;
  amountUSDC: number;
  requisitionId: string;
  disburserAddress?: Address;
}

/**
 * Builds an execution Call targeted at the ProcureYetiDisburser contract.
 * Does not broadcast or execute.
 */
export function buildDisburserPaymentCall(params: PrepareDisburserPaymentParams): Call {
  const {
    supplierAddress,
    amountUSDC,
    requisitionId,
    disburserAddress = PROCURE_YETI_DISBURSER_ADDRESS_CELO_SEPOLIA,
  } = params;

  const rawAmount = parseUnits(amountUSDC.toString(), CELO_SEPOLIA_USDC.decimals);

  const data = encodeFunctionData({
    abi: PROCURE_YETI_DISBURSER_ABI,
    functionName: 'disbursePayment',
    args: [supplierAddress, rawAmount, requisitionId],
  });

  return {
    to: disburserAddress,
    data,
    value: BigInt(0),
  };
}

export interface DisburserSessionPermissionsParams {
  disburserAddress?: Address;
  dailySpendingLimitUSDC?: number;
  /** Native CELO gas fee headroom for Altana relay submission (default: 1 CELO) */
  nativeGasLimitCELO?: number;
  expirySeconds?: number;
}

/**
 * Generates bounded Altana session permissions scoped strictly to ProcureYetiDisburser.
 *
 * SAFETY & PROTOCOL ALIGNMENT:
 * 1. Scoped Call Permissions:
 *    The session key has ZERO permission to call `USDC.transfer`.
 *    It can ONLY call `disbursePayment(address,uint256,string)` on the Disburser.
 * 2. Real Altana Relay Compatibility (Gas Headroom):
 *    Altana relay fees on Celo Sepolia are paid in native CELO. A session must carry
 *    a native spend permission (`token: undefined`) with sufficient gas headroom,
 *    otherwise the relay rejects the intent with `NoSpendPermissions`.
 * 3. Router Internal Spend Tracking Note:
 *    USDC spend limits on the Altana Smart Account track calls made directly by the account.
 *    Because `ProcureYetiDisburser` disburses USDC from its own contract treasury via internal
 *    `safeTransfer`, Altana's account-level USDC spend limits DO NOT track internal router disbursements.
 *    Instead, the $500 autonomous threshold, $2,500 single limit, and $5,000 daily velocity cap
 *    are enforced directly on-chain by `ProcureYetiDisburser.sol`.
 */
export function buildDisburserSessionPermissions(
  params: DisburserSessionPermissionsParams = {}
): { permissions: SessionPermissions; expiry: number } {
  const {
    disburserAddress = PROCURE_YETI_DISBURSER_ADDRESS_CELO_SEPOLIA,
    dailySpendingLimitUSDC = 500,
    nativeGasLimitCELO = 1,
    expirySeconds = 7 * 24 * 60 * 60,
  } = params;

  const calls: CallPermission[] = [
    {
      to: disburserAddress,
      signature: 'disbursePayment(address,uint256,string)',
    },
  ];

  const rawUsdcLimit = parseUnits(dailySpendingLimitUSDC.toString(), CELO_SEPOLIA_USDC.decimals);
  const rawNativeGasLimit = parseUnits(nativeGasLimitCELO.toString(), 18);

  const spend: SpendPermission[] = [
    {
      token: CELO_SEPOLIA_USDC_ADDRESS,
      limit: rawUsdcLimit,
      period: 'day',
    },
    {
      // Native CELO gas fee headroom for Altana relay execution (omitting token designates native currency)
      limit: rawNativeGasLimit,
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
