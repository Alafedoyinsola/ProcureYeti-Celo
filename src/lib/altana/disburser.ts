import { encodeFunctionData, parseUnits, keccak256, encodePacked, type Address } from 'viem';
import type { Call, CallPermission, SpendPermission, SessionPermissions } from '@altananetwork/sdk';
import { getUsdcTokenConfig } from './tokens';
import { ALTANA_CELO_CONFIG } from './client';

/**
 * Verified ProcureYetiDisburser Contract Interface and ABI on Celo
 *
 * ProcureYeti Sentinel: Purchase Mandate Engine
 * Enforces owner-authorized Purchase Mandates before executing any agent disbursements.
 */

/**
 * On-chain deployed address of ProcureYetiDisburser.
 * Returns null if NEXT_PUBLIC_DISBURSER_ADDRESS is not set.
 * No hardcoded fallback is used to prevent sending transactions to unverified addresses.
 */
export const PROCURE_YETI_DISBURSER_ADDRESS: Address | null =
  (process.env.NEXT_PUBLIC_DISBURSER_ADDRESS as Address) || null;

export function isDisburserConfigured(): boolean {
  return Boolean(
    PROCURE_YETI_DISBURSER_ADDRESS &&
      PROCURE_YETI_DISBURSER_ADDRESS.startsWith('0x') &&
      PROCURE_YETI_DISBURSER_ADDRESS.length === 42
  );
}

export function getDisburserAddressOrThrow(override?: Address): Address {
  const address = override || PROCURE_YETI_DISBURSER_ADDRESS;
  if (!address || !address.startsWith('0x') || address.length !== 42) {
    throw new Error(
      'ProcureYetiDisburser is not deployed on Celo. Configure NEXT_PUBLIC_DISBURSER_ADDRESS in .env.local after verified deployment.'
    );
  }
  return address;
}

/**
 * Derives a deterministic unique mandate ID from a requisition ID and supplier address.
 */
export function deriveMandateId(requisitionId: string, supplier: Address): `0x${string}` {
  return keccak256(encodePacked(['string', 'address'], [requisitionId, supplier]));
}

export const PROCURE_YETI_DISBURSER_ABI = [
  // --- Purchase Mandate Governance & Execution Functions ---
  {
    type: 'function',
    name: 'createMandate',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'mandateId', type: 'bytes32' },
      { name: 'supplier', type: 'address' },
      { name: 'maxAmount', type: 'uint256' },
      { name: 'requisitionId', type: 'string' },
      { name: 'expiry', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'revokeMandate',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'mandateId', type: 'bytes32' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'disburseWithMandate',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'mandateId', type: 'bytes32' },
      { name: 'supplier', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'requisitionId', type: 'string' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'executeMandatePayment',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'mandateId', type: 'bytes32' },
      { name: 'supplier', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'requisitionId', type: 'string' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'getMandate',
    stateMutability: 'view',
    inputs: [{ name: 'mandateId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'mandateId', type: 'bytes32' },
          { name: 'supplier', type: 'address' },
          { name: 'maxAmount', type: 'uint256' },
          { name: 'requisitionId', type: 'string' },
          { name: 'expiry', type: 'uint256' },
          { name: 'isUsed', type: 'bool' },
          { name: 'isRevoked', type: 'bool' },
          { name: 'createdAt', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'isMandateExecutable',
    stateMutability: 'view',
    inputs: [{ name: 'mandateId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'isMandateExecutable',
    stateMutability: 'view',
    inputs: [
      { name: 'mandateId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'mandates',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [
      { name: 'mandateId', type: 'bytes32' },
      { name: 'supplier', type: 'address' },
      { name: 'maxAmount', type: 'uint256' },
      { name: 'requisitionId', type: 'string' },
      { name: 'expiry', type: 'uint256' },
      { name: 'isUsed', type: 'bool' },
      { name: 'isRevoked', type: 'bool' },
      { name: 'createdAt', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'mandateCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'executedMandateCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },

  // --- Legacy / Backwards-Compatibility Disburse Function ---
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

  // --- Supplier Allowlist Management ---
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

  // --- Spending Limits & Agent Access ---
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
    name: 'isAuthorizedAgent',
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

  // --- Events ---
  {
    type: 'event',
    name: 'MandateCreated',
    inputs: [
      { name: 'mandateId', type: 'bytes32', indexed: true },
      { name: 'supplier', type: 'address', indexed: true },
      { name: 'maxAmount', type: 'uint256', indexed: false },
      { name: 'requisitionId', type: 'string', indexed: false },
      { name: 'expiry', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MandateRevoked',
    inputs: [
      { name: 'mandateId', type: 'bytes32', indexed: true },
      { name: 'supplier', type: 'address', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MandateExecuted',
    inputs: [
      { name: 'mandateId', type: 'bytes32', indexed: true },
      { name: 'supplier', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'requisitionId', type: 'string', indexed: false },
      { name: 'caller', type: 'address', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
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

export interface PrepareMandatePaymentParams {
  mandateId: `0x${string}`;
  supplierAddress: Address;
  amountUSDC: number;
  requisitionId: string;
  disburserAddress?: Address;
}

/**
 * Builds an execution Call targeted at ProcureYetiDisburser.disburseWithMandate.
 * Does not broadcast or execute.
 */
export function buildMandatePaymentCall(params: PrepareMandatePaymentParams): Call {
  const {
    mandateId,
    supplierAddress,
    amountUSDC,
    requisitionId,
    disburserAddress,
  } = params;

  const targetAddress = getDisburserAddressOrThrow(disburserAddress);
  const rawAmount = parseUnits(amountUSDC.toString(), getUsdcTokenConfig(ALTANA_CELO_CONFIG.chainId).decimals);

  const data = encodeFunctionData({
    abi: PROCURE_YETI_DISBURSER_ABI,
    functionName: 'disburseWithMandate',
    args: [mandateId, supplierAddress, rawAmount, requisitionId],
  });

  return {
    to: targetAddress,
    data,
    value: BigInt(0),
  };
}

export interface PrepareCreateMandateParams {
  mandateId: `0x${string}`;
  supplierAddress: Address;
  maxAmountUSDC: number;
  requisitionId: string;
  expirySeconds?: number;
  expiryTimestamp?: number;
  disburserAddress?: Address;
}

/**
 * Builds an owner execution Call targeted at ProcureYetiDisburser.createMandate.
 */
export function buildCreateMandateCall(params: PrepareCreateMandateParams): Call {
  const {
    mandateId,
    supplierAddress,
    maxAmountUSDC,
    requisitionId,
    expirySeconds = 7 * 24 * 60 * 60,
    expiryTimestamp,
    disburserAddress,
  } = params;

  const targetAddress = getDisburserAddressOrThrow(disburserAddress);
  const rawAmount = parseUnits(maxAmountUSDC.toString(), getUsdcTokenConfig(ALTANA_CELO_CONFIG.chainId).decimals);
  const expiry = expiryTimestamp || Math.floor(Date.now() / 1000) + expirySeconds;

  const data = encodeFunctionData({
    abi: PROCURE_YETI_DISBURSER_ABI,
    functionName: 'createMandate',
    args: [mandateId, supplierAddress, rawAmount, requisitionId, BigInt(expiry)],
  });

  return {
    to: targetAddress,
    data,
    value: BigInt(0),
  };
}

/**
 * Builds an owner execution Call targeted at ProcureYetiDisburser.revokeMandate.
 */
export function buildRevokeMandateCall(params: {
  mandateId: `0x${string}`;
  disburserAddress?: Address;
}): Call {
  const targetAddress = getDisburserAddressOrThrow(params.disburserAddress);
  const data = encodeFunctionData({
    abi: PROCURE_YETI_DISBURSER_ABI,
    functionName: 'revokeMandate',
    args: [params.mandateId],
  });

  return {
    to: targetAddress,
    data,
    value: BigInt(0),
  };
}

export interface PrepareDisburserPaymentParams {
  supplierAddress: Address;
  amountUSDC: number;
  requisitionId: string;
  disburserAddress?: Address;
}

/**
 * @deprecated OBSOLETE UN-MANDATED PAYMENT BUILDER.
 * All autonomous agent payments must use `buildMandatePaymentCall` with an owner-approved Purchase Mandate.
 */
export function buildDisburserPaymentCall(params: PrepareDisburserPaymentParams): Call {
  console.warn(
    '[ProcureYeti Sentinel Security Warning] `buildDisburserPaymentCall` (un-mandated disbursement) is deprecated. All agent payments must use `buildMandatePaymentCall`.'
  );

  const {
    supplierAddress,
    amountUSDC,
    requisitionId,
    disburserAddress,
  } = params;

  const targetAddress = getDisburserAddressOrThrow(disburserAddress);
  const rawAmount = parseUnits(amountUSDC.toString(), getUsdcTokenConfig(ALTANA_CELO_CONFIG.chainId).decimals);

  const data = encodeFunctionData({
    abi: PROCURE_YETI_DISBURSER_ABI,
    functionName: 'disbursePayment',
    args: [supplierAddress, rawAmount, requisitionId],
  });

  return {
    to: targetAddress,
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
 * Generates bounded Altana session permissions scoped strictly to ProcureYetiDisburser.disburseWithMandate.
 *
 * SAFETY & PROTOCOL ALIGNMENT:
 * 1. Scoped Call Permissions:
 *    The session key has ZERO permission to call `USDC.transfer`.
 *    The session key has ZERO permission to call `disbursePayment` (un-mandated).
 *    It can ONLY call `disburseWithMandate(bytes32,address,uint256,string)` on the Disburser.
 * 2. Mandatory Purchase Mandates:
 *    Every payment must reference an active, owner-created on-chain Purchase Mandate.
 * 3. Real Altana Relay Compatibility (Gas Headroom):
 *    Altana relay fees on Celo are paid in native CELO. A session must carry
 *    a native spend permission (`token: undefined`) with sufficient gas headroom,
 *    otherwise the relay rejects the intent with `NoSpendPermissions`.
 * 4. Router Internal Spend Tracking:
 *    Enforced directly on-chain by `ProcureYetiDisburser.sol`.
 */
export function buildDisburserSessionPermissions(
  params: DisburserSessionPermissionsParams = {}
): { permissions: SessionPermissions; expiry: number; disburserAddress: Address } {
  const {
    disburserAddress,
    dailySpendingLimitUSDC = 500,
    nativeGasLimitCELO = 1,
    expirySeconds = 7 * 24 * 60 * 60,
  } = params;

  const targetAddress = getDisburserAddressOrThrow(disburserAddress);

  // Scoped strictly to disburseWithMandate(bytes32,address,uint256,string)
  const calls: CallPermission[] = [
    {
      to: targetAddress,
      signature: 'disburseWithMandate(bytes32,address,uint256,string)',
    },
  ];

  const rawUsdcLimit = parseUnits(dailySpendingLimitUSDC.toString(), getUsdcTokenConfig(ALTANA_CELO_CONFIG.chainId).decimals);
  const rawNativeGasLimit = parseUnits(nativeGasLimitCELO.toString(), 18);

  const spend: SpendPermission[] = [
    {
      token: getUsdcTokenConfig(ALTANA_CELO_CONFIG.chainId).address,
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
    disburserAddress: targetAddress,
  };
}
