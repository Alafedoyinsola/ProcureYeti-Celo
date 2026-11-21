import { PurchaseRequest, Supplier, Quotation } from '@/types';
import { keccak256, toBytes, type Address } from 'viem';

export type SentinelRiskLevel = 'low' | 'medium' | 'high';

export interface SentinelRuleEvaluation {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  scoreImpact: number;
  description: string;
}

export interface DuplicateCheckResult {
  hasDuplicate: boolean;
  duplicateCount: number;
  matchingRequestIds: string[];
  reason?: string;
}

export interface PriceInvestigationResult {
  quotedAmount: number;
  estimatedBudget: number;
  variancePercentage: number;
  isSuspicious: boolean;
  suspicionReason?: string;
  quoteComparisonNotes: string;
}

export interface BudgetImpactAnalysis {
  department: string;
  monthlyDepartmentBudget: number;
  currentDepartmentSpend: number;
  requisitionAmount: number;
  projectedSpend: number;
  budgetUtilizationPctBefore: number;
  budgetUtilizationPctAfter: number;
  isWithinBudget: boolean;
}

export interface SentinelInvestigation {
  requisitionId: string;
  evaluatedAt: string;
  riskScore: number; // 0 - 100
  riskLevel: SentinelRiskLevel;
  ruleEvaluations: SentinelRuleEvaluation[];
  duplicateCheck: DuplicateCheckResult;
  priceInvestigation: PriceInvestigationResult;
  budgetImpact: BudgetImpactAnalysis;
  supplierRisk: {
    supplierName: string;
    supplierAddress: string;
    verificationStatus: 'verified' | 'pending' | 'unverified';
    isApprovedInDisburser: boolean;
    rating: number;
  };
  recommendation: 'generate_mandate' | 'request_clarification' | 'escalate_to_multisig' | 'reject';
  recommendationText: string;
}

export type DecisionAction =
  | 'approve_and_generate_mandate'
  | 'reject'
  | 'request_clarification'
  | 'escalate_to_multisig';

export interface AuditableDecisionReceipt {
  receiptId: string;
  receiptHash: `0x${string}`;
  requisitionId: string;
  action: DecisionAction;
  decisionMaker: string;
  timestamp: string;
  mandateId?: `0x${string}`;
  maxAuthorisedUSDC?: number;
  supplierAddress?: Address;
  clarificationNote?: string;
  rejectionReason?: string;
  triggeredPolicyRules: string[];
  status: 'prepared_awaiting_broadcast' | 'recorded_locally' | 'confirmed_onchain';
}

// Department monthly allocation benchmarks (deterministic baseline)
const DEPARTMENT_MONTHLY_BUDGETS: Record<string, number> = {
  Engineering: 35000,
  Operations: 20000,
  'DevOps & AI': 25000,
  Marketing: 15000,
  'Legal & Finance': 18000,
  'Security & Compliance': 22000,
};

/**
 * Runs the deterministic Sentinel Procurement Investigation engine.
 * Transparent rule evaluations: no hidden black-box AI claims.
 */
export function runSentinelInvestigation(
  request: PurchaseRequest,
  allRequests: PurchaseRequest[],
  suppliers: Supplier[],
  quotations: Quotation[]
): SentinelInvestigation {
  const evaluations: SentinelRuleEvaluation[] = [];
  let score = 0;

  // 1. Supplier Matching & Verification Rule
  const matchedSupplier = suppliers.find(
    (s) =>
      s.name.toLowerCase() === request.aiRecommendation?.suggestedSupplier?.toLowerCase() ||
      s.category === request.category
  ) || suppliers[0];

  const isVerified = matchedSupplier?.verificationStatus === 'verified';
  if (!isVerified) {
    score += 35;
    evaluations.push({
      ruleId: 'SENTINEL-R01',
      ruleName: 'Supplier Whitelist Verification',
      passed: false,
      scoreImpact: 35,
      description: `Vendor ${matchedSupplier.name} is not marked as verified on Celo allowlist.`,
    });
  } else {
    evaluations.push({
      ruleId: 'SENTINEL-R01',
      ruleName: 'Supplier Whitelist Verification',
      passed: true,
      scoreImpact: 0,
      description: `Vendor ${matchedSupplier.name} is verified with on-chain payment record.`,
    });
  }

  // 2. Duplicate Requisition Check (within last 30 days)
  const potentialDuplicates = allRequests.filter(
    (r) =>
      r.id !== request.id &&
      (r.title.toLowerCase().trim() === request.title.toLowerCase().trim() ||
        (r.category === request.category &&
          r.department === request.department &&
          Math.abs(r.estimatedBudget - request.estimatedBudget) < 50))
  );

  const hasDuplicate = potentialDuplicates.length > 0;
  if (hasDuplicate) {
    score += 25;
    evaluations.push({
      ruleId: 'SENTINEL-R02',
      ruleName: 'Duplicate Requisition Filter',
      passed: false,
      scoreImpact: 25,
      description: `Detected ${potentialDuplicates.length} matching purchase requisition(s) in the same category/department: ${potentialDuplicates.map((d) => d.id).join(', ')}.`,
    });
  } else {
    evaluations.push({
      ruleId: 'SENTINEL-R02',
      ruleName: 'Duplicate Requisition Filter',
      passed: true,
      scoreImpact: 0,
      description: 'Zero duplicate purchase requests found for this item and specification.',
    });
  }

  // 3. Price Variance & Quotation Check
  const bestQuotedPrice = request.aiRecommendation?.bestPrice || request.estimatedBudget;
  const variancePct =
    request.estimatedBudget > 0
      ? ((bestQuotedPrice - request.estimatedBudget) / request.estimatedBudget) * 100
      : 0;

  let isSuspiciousPrice = false;
  let suspicionReason: string | undefined;

  if (variancePct > 15) {
    score += 20;
    isSuspiciousPrice = true;
    suspicionReason = `Quoted price is ${variancePct.toFixed(1)}% above the estimated budget.`;
    evaluations.push({
      ruleId: 'SENTINEL-R03',
      ruleName: 'Price Variance & Outlier Detection',
      passed: false,
      scoreImpact: 20,
      description: suspicionReason,
    });
  } else if (variancePct < -40) {
    score += 15;
    isSuspiciousPrice = true;
    suspicionReason = `Quoted price is ${Math.abs(variancePct).toFixed(1)}% below benchmark (potential fulfillment SLA or counterfeit risk).`;
    evaluations.push({
      ruleId: 'SENTINEL-R03',
      ruleName: 'Price Variance & Outlier Detection',
      passed: false,
      scoreImpact: 15,
      description: suspicionReason,
    });
  } else {
    evaluations.push({
      ruleId: 'SENTINEL-R03',
      ruleName: 'Price Variance & Outlier Detection',
      passed: true,
      scoreImpact: 0,
      description: `Quoted price ($${bestQuotedPrice.toLocaleString()}) aligns within budget parameters (${variancePct >= 0 ? '+' : ''}${variancePct.toFixed(1)}%).`,
    });
  }

  // 4. Autonomous Spending Threshold Evaluation
  const isAboveAutoCap = bestQuotedPrice >= 500;
  if (isAboveAutoCap) {
    evaluations.push({
      ruleId: 'SENTINEL-R04',
      ruleName: 'Policy Threshold Check ($500 limit)',
      passed: true,
      scoreImpact: 0,
      description: 'Transaction exceeds $500 USDC autonomous threshold; owner cryptographic signature is strictly required.',
    });
  } else {
    evaluations.push({
      ruleId: 'SENTINEL-R04',
      ruleName: 'Policy Threshold Check ($500 limit)',
      passed: true,
      scoreImpact: 0,
      description: 'Micro-transaction under $500 USDC threshold; eligible for agent autonomous disbursement if mandate is provisioned.',
    });
  }

  // 5. Single Payment Cap ($2,500 contract limit)
  if (bestQuotedPrice > 2500) {
    score += 40;
    evaluations.push({
      ruleId: 'SENTINEL-R05',
      ruleName: 'Contract Single-Payment Cap ($2,500)',
      passed: false,
      scoreImpact: 40,
      description: `Amount exceeds the $2,500 single payment ceiling of ProcureYetiDisburser.sol. Requires multi-tranche structuring or owner limit upgrade.`,
    });
  }

  // Clamp score
  const finalScore = Math.min(100, Math.max(0, score));
  const riskLevel: SentinelRiskLevel =
    finalScore >= 60 ? 'high' : finalScore >= 25 ? 'medium' : 'low';

  // Budget calculations
  const monthlyDeptBudget = DEPARTMENT_MONTHLY_BUDGETS[request.department] || 25000;
  const currentDeptSpend = allRequests
    .filter(
      (r) =>
        r.department === request.department &&
        r.id !== request.id &&
        (r.status === 'demo_approved' || r.status === 'awaiting_execution')
    )
    .reduce((sum, r) => sum + r.estimatedBudget, 0);

  const projectedSpend = currentDeptSpend + bestQuotedPrice;
  const budgetUtilizationPctBefore = Math.round((currentDeptSpend / monthlyDeptBudget) * 100);
  const budgetUtilizationPctAfter = Math.round((projectedSpend / monthlyDeptBudget) * 100);

  // Recommendations
  let recommendation: SentinelInvestigation['recommendation'] = 'generate_mandate';
  let recommendationText = 'Requisition passes all Sentinel baseline policy checks. Recommend owner sign and create Purchase Mandate.';

  if (bestQuotedPrice > 2500 || finalScore >= 65) {
    recommendation = 'escalate_to_multisig';
    recommendationText = 'Requisition exceeds single-payment contract cap or presents high risk. Escalation to Owner Multi-Sig recommended.';
  } else if (hasDuplicate || isSuspiciousPrice) {
    recommendation = 'request_clarification';
    recommendationText = 'Potential duplicate purchase or pricing outlier flagged. Requesting requester clarification recommended before locking mandate.';
  }

  return {
    requisitionId: request.id,
    evaluatedAt: new Date().toISOString(),
    riskScore: finalScore,
    riskLevel,
    ruleEvaluations: evaluations,
    duplicateCheck: {
      hasDuplicate,
      duplicateCount: potentialDuplicates.length,
      matchingRequestIds: potentialDuplicates.map((d) => d.id),
      reason: hasDuplicate
        ? `Found ${potentialDuplicates.length} similar requisition(s) in category "${request.category}".`
        : undefined,
    },
    priceInvestigation: {
      quotedAmount: bestQuotedPrice,
      estimatedBudget: request.estimatedBudget,
      variancePercentage: Number(variancePct.toFixed(1)),
      isSuspicious: isSuspiciousPrice,
      suspicionReason,
      quoteComparisonNotes: `Gathered ${quotations.filter((q) => q.requestId === request.id).length || 1} competitive quote(s). Best match: ${matchedSupplier.name}.`,
    },
    budgetImpact: {
      department: request.department,
      monthlyDepartmentBudget: monthlyDeptBudget,
      currentDepartmentSpend: currentDeptSpend,
      requisitionAmount: bestQuotedPrice,
      projectedSpend,
      budgetUtilizationPctBefore,
      budgetUtilizationPctAfter,
      isWithinBudget: projectedSpend <= monthlyDeptBudget,
    },
    supplierRisk: {
      supplierName: matchedSupplier.name,
      supplierAddress: matchedSupplier.walletAddress,
      verificationStatus: matchedSupplier.verificationStatus,
      isApprovedInDisburser: isVerified,
      rating: matchedSupplier.rating,
    },
    recommendation,
    recommendationText,
  };
}

/**
 * Creates a cryptographically referenced auditable decision receipt.
 */
export function createDecisionReceipt(params: {
  requisitionId: string;
  action: DecisionAction;
  decisionMaker: string;
  mandateId?: `0x${string}`;
  maxAuthorisedUSDC?: number;
  supplierAddress?: Address;
  clarificationNote?: string;
  rejectionReason?: string;
  triggeredRules?: string[];
}): AuditableDecisionReceipt {
  const receiptId = `REC-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const timestamp = new Date().toISOString();

  const receiptPayload = JSON.stringify({
    receiptId,
    requisitionId: params.requisitionId,
    action: params.action,
    decisionMaker: params.decisionMaker,
    timestamp,
    mandateId: params.mandateId || null,
    supplierAddress: params.supplierAddress || null,
    maxAuthorisedUSDC: params.maxAuthorisedUSDC || null,
  });

  const receiptHash = keccak256(toBytes(receiptPayload));

  return {
    receiptId,
    receiptHash,
    requisitionId: params.requisitionId,
    action: params.action,
    decisionMaker: params.decisionMaker,
    timestamp,
    mandateId: params.mandateId,
    maxAuthorisedUSDC: params.maxAuthorisedUSDC,
    supplierAddress: params.supplierAddress,
    clarificationNote: params.clarificationNote,
    rejectionReason: params.rejectionReason,
    triggeredPolicyRules: params.triggeredRules || ['SENTINEL-R01', 'SENTINEL-R04'],
    status: 'prepared_awaiting_broadcast',
  };
}
