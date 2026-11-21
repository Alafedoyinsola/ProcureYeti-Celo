export type RequestStatus =
  | 'draft'
  | 'ai_reviewing'
  | 'pending_approval'
  | 'demo_approved'
  | 'awaiting_execution'
  | 'rejected';

export type MandateStatus = 'none' | 'prepared' | 'active' | 'used' | 'revoked' | 'expired';

export type CurrencyType = 'cUSD' | 'CELO' | 'USDC';

export type CeloNetwork = 'celo_sepolia' | 'celo_mainnet';

export interface PurchaseRequest {
  id: string;
  title: string;
  category: string;
  quantity: number;
  estimatedBudget: number;
  currency: CurrencyType;
  deliveryDate: string;
  department: string;
  requestedBy: string;
  justification?: string;
  status: RequestStatus;
  createdAt: string;
  mandateId?: `0x${string}`;
  mandateStatus?: MandateStatus;
  mandateMaxAmount?: number;
  mandateExpiry?: string;
  aiRecommendation?: {
    suggestedSupplier: string;
    bestPrice: number;
    savingsPct: number;
    matchScore: number;
    rationale: string;
    isSimulatedHeuristic: boolean;
  };
  demoRef?: string;
}

export interface Supplier {
  id: string;
  name: string;
  category: string;
  contactName: string;
  email: string;
  phone: string;
  walletAddress: string; // Simulated Celo demo address
  rating: number; // e.g. 4.9
  verificationStatus: 'verified' | 'pending' | 'unverified';
  totalPaidCUSD: number; // Demo simulated volume
  paymentTerms: string;
  country: string;
}

export interface Quotation {
  id: string;
  requestId: string;
  requestTitle: string;
  supplierId: string;
  supplierName: string;
  supplierAddress: string;
  amount: number;
  currency: CurrencyType;
  deliveryDays: number;
  aiScore: number; // Simulated heuristic score
  isAiRecommended: boolean;
  isSimulatedHeuristic: boolean;
  notes: string;
  status: 'pending' | 'accepted' | 'declined';
  receivedAt: string;
}

export interface ApprovalItem {
  id: string;
  requestId: string;
  title: string;
  supplierName: string;
  supplierWallet: string;
  amount: number;
  currency: CurrencyType;
  department: string;
  submittedBy: string;
  submittedAt: string;
  policyType: 'altana_auto_eligible' | 'owner_authorization_required';
  aiRiskScore: 'low' | 'medium' | 'high';
  aiNotes: string;
  status: 'pending' | 'demo_approved' | 'awaiting_execution' | 'rejected';
  mandateId?: `0x${string}`;
  mandateStatus?: MandateStatus;
  mandateMaxAmount?: number;
  mandateExpiry?: string;
  demoRef?: string;
  receiptId?: string;
}

export interface AltanaWalletConfig {
  agentAddress: string; // Demo simulated address
  ownerAddress: string; // Demo simulated address
  network: string; // e.g. "Celo Sepolia Testnet"
  chainId: number; // 11142220 for Celo Sepolia; 42220 for Celo Mainnet
  targetMainnetChainId: number; // 42220
  dailyAllowance: number; // Demo session limit
  dailySpent: number; // Demo session spent
  maxSingleTxLimit: number; // Demo policy cap
  autoApprovalThreshold: number; // Demo threshold ($500)
  balanceCUSD: number; // Demo simulated balance
  balanceCELO: number; // Demo simulated balance
  balanceUSDC: number; // Demo simulated balance
  activePolicies: string[];
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  type: 'ai_agent' | 'owner_approval' | 'demo_authorization' | 'policy_guardrail' | 'request_created';
  actor: string;
  title: string;
  description: string;
  amount?: number;
  currency?: CurrencyType;
  demoRef?: string;
  badge?: string;
}
