
'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { DemoBanner } from '@/components/common/DemoBanner';
import { OverviewView } from '@/components/views/OverviewView';
import { PurchaseRequestsView } from '@/components/views/PurchaseRequestsView';
import { SuppliersView } from '@/components/views/SuppliersView';
import { QuotationsView } from '@/components/views/QuotationsView';
import { ApprovalCentreView } from '@/components/views/ApprovalCentreView';
import { AgentWalletView } from '@/components/views/AgentWalletView';
import { ActivityView } from '@/components/views/ActivityView';
import { SettingsView } from '@/components/views/SettingsView';
import { CreateRequestModal } from '@/components/modals/CreateRequestModal';
import { AddSupplierModal } from '@/components/modals/AddSupplierModal';

import {
  PurchaseRequest,
  Supplier,
  Quotation,
  ApprovalItem,
  AltanaWalletConfig,
  ActivityEvent,
} from '@/types';

import {
  getStoredRequests,
  saveStoredRequests,
  getStoredSuppliers,
  saveStoredSuppliers,
  getStoredQuotations,
  saveStoredQuotations,
  getStoredApprovals,
  saveStoredApprovals,
  getStoredWalletConfig,
  saveStoredWalletConfig,
  getStoredActivity,
  saveStoredActivity,
  resetToDemoDefaults,
} from '@/lib/storage';

import {
  INITIAL_PURCHASE_REQUESTS,
  INITIAL_SUPPLIERS,
  INITIAL_QUOTATIONS,
  INITIAL_APPROVALS,
  INITIAL_ALTANA_WALLET,
  INITIAL_ACTIVITY,
} from '@/lib/mockData';

import { AuditableDecisionReceipt } from '@/lib/sentinel/investigation';
import type { Address } from 'viem';

import {
  ALTANA_CELO_CONFIG,
  INITIAL_LIVE_WALLET_SESSION,
  connectAltanaPasskeyWallet,
  connectInjectedEoaWallet,
  type LiveWalletSession,
} from '@/lib/altana';

export default function Home() {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);

  // Core application data
  const [requests, setRequests] = useState<PurchaseRequest[]>(getStoredRequests);
  const [suppliers, setSuppliers] = useState<Supplier[]>(getStoredSuppliers);
  const [quotations, setQuotations] = useState<Quotation[]>(getStoredQuotations);
  const [approvals, setApprovals] = useState<ApprovalItem[]>(getStoredApprovals);
  const [walletConfig, setWalletConfig] = useState<AltanaWalletConfig>(
    getStoredWalletConfig
  );
  const [activity, setActivity] = useState<ActivityEvent[]>(getStoredActivity);

  // Wallet connection state. Connecting a wallet does not enable payment execution.
  const [walletSession, setWalletSession] = useState<LiveWalletSession>(
    INITIAL_LIVE_WALLET_SESSION
  );

  // Connect an Altana Passkey wallet or an injected browser wallet.
  const handleConnectWallet = async (
    provider: 'altana_passkey' | 'injected_eoa'
  ) => {
    setWalletSession((previous) => ({
      ...previous,
      state: 'connecting',
      error: null,
    }));

    try {
      const result =
        provider === 'altana_passkey'
          ? await connectAltanaPasskeyWallet('create')
          : await connectInjectedEoaWallet();

      // Verify the injected wallet is using the configured Celo network.
      if (provider === 'injected_eoa') {
        const ethereum = (
          window as Window & {
            ethereum?: {
              request: (args: { method: string }) => Promise<string>;
            };
          }
        ).ethereum;

        if (!ethereum) {
          throw new Error('No injected wallet provider found.');
        }

        const chainIdHex = await ethereum.request({
          method: 'eth_chainId',
        });

        const connectedChainId = Number(BigInt(chainIdHex));

        if (connectedChainId !== ALTANA_CELO_CONFIG.chainId) {
          throw new Error(
            `Wrong network. Please switch your wallet to chain ID ${ALTANA_CELO_CONFIG.chainId}.`
          );
        }
      }

      setWalletSession({
        mode: 'live',
        state: 'connected',
        providerType: result.type,
        address: result.address,
        ownerAddress: null,
        error: null,
        chainId: ALTANA_CELO_CONFIG.chainId,
        relayUrl:
          ALTANA_CELO_CONFIG.relayUrl || 'https://relay.altana.network',
        isPasskeySupported:
          typeof window !== 'undefined' &&
          Boolean(window.PublicKeyCredential),
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Wallet connection failed.';

      setWalletSession((previous) => ({
        ...previous,
        state: 'error',
        error: message,
      }));

      window.alert(message);
    }
  };

  // Disconnect the wallet from the dashboard session.
  const handleDisconnectWallet = () => {
    setWalletSession(INITIAL_LIVE_WALLET_SESSION);
  };

  // Persist application state to localStorage.
  useEffect(() => {
    saveStoredRequests(requests);
  }, [requests]);

  useEffect(() => {
    saveStoredSuppliers(suppliers);
  }, [suppliers]);

  useEffect(() => {
    saveStoredQuotations(quotations);
  }, [quotations]);

  useEffect(() => {
    saveStoredApprovals(approvals);
  }, [approvals]);

  useEffect(() => {
    saveStoredWalletConfig(walletConfig);
  }, [walletConfig]);

  useEffect(() => {
    saveStoredActivity(activity);
  }, [activity]);

  // Create a purchase request.
  const handleCreateRequest = (
    newReqData: Omit<
      PurchaseRequest,
      'id' | 'createdAt' | 'status' | 'requestedBy'
    >
  ) => {
    const nextNum = requests.length + 85;
    const reqId = `PR-2026-${nextNum}`;

    const isUnderThreshold =
      newReqData.estimatedBudget < walletConfig.autoApprovalThreshold;

    const status = isUnderThreshold ? 'ai_reviewing' : 'pending_approval';

    const matchingSupplier = suppliers[0] || INITIAL_SUPPLIERS[0];
    const bestPrice = Math.round(newReqData.estimatedBudget * 0.94);
    const savingsPct = 6.0;

    const newRequest: PurchaseRequest = {
      ...newReqData,
      id: reqId,
      createdAt: new Date().toISOString(),
      status,
      requestedBy: 'Elena Vance (Owner)',
      aiRecommendation: {
        suggestedSupplier: matchingSupplier.name,
        bestPrice,
        savingsPct,
        matchScore: 96,
        rationale: `Simulated RFQ Heuristic (Demo): Evaluated vendor ${matchingSupplier.name} with 100% simulated fulfillment SLA and competitive pricing.`,
        isSimulatedHeuristic: true,
      },
    };

    setRequests((previous) => [newRequest, ...previous]);

    if (!isUnderThreshold) {
      const newApproval: ApprovalItem = {
        id: `AP-${Math.floor(Math.random() * 800 + 200)}`,
        requestId: reqId,
        title: `${newReqData.title} - ${matchingSupplier.name}`,
        supplierName: matchingSupplier.name,
        supplierWallet: matchingSupplier.walletAddress,
        amount: bestPrice,
        currency: newReqData.currency,
        department: newReqData.department,
        submittedBy: 'Elena Vance (Owner)',
        submittedAt: new Date().toISOString(),
        policyType: 'owner_authorization_required',
        aiRiskScore: 'low',
        aiNotes: `Requisition exceeds $${walletConfig.autoApprovalThreshold} cUSD Altana agent threshold. Verified vendor on Celo Sepolia (11142220).`,
        status: 'pending',
      };

      setApprovals((previous) => [newApproval, ...previous]);
    }

    const newActivity: ActivityEvent = {
      id: `ACT-${Date.now()}`,
      timestamp: 'Just now',
      type: 'request_created',
      actor: 'Elena Vance',
      title: `New Purchase Request: ${newReqData.title}`,
      description: `Submitted for ${newReqData.department}. Estimated budget: $${newReqData.estimatedBudget.toLocaleString()} ${newReqData.currency}.`,
      amount: newReqData.estimatedBudget,
      currency: newReqData.currency,
      badge: 'Requisition',
    };

    setActivity((previous) => [newActivity, ...previous]);
  };

  // Add a supplier.
  const handleAddSupplier = (
    newSupData: Omit<
      Supplier,
      'id' | 'rating' | 'verificationStatus' | 'totalPaidCUSD'
    >
  ) => {
    const nextId = `SUP-0${suppliers.length + 1}`;

    const newSupplier: Supplier = {
      ...newSupData,
      id: nextId,
      rating: 4.8,
      verificationStatus: 'verified',
      totalPaidCUSD: 0,
    };

    setSuppliers((previous) => [...previous, newSupplier]);

    const newActivity: ActivityEvent = {
      id: `ACT-${Date.now()}`,
      timestamp: 'Just now',
      type: 'policy_guardrail',
      actor: 'ProcureYeti System',
      title: `Verified Vendor Registered: ${newSupData.name}`,
      description: `Payment address ${newSupData.walletAddress.slice(0, 8)}... added to Altana whitelist for Celo Sepolia (11142220).`,
      badge: 'Whitelist Added',
    };

    setActivity((previous) => [newActivity, ...previous]);
  };

  // Record a demo authorization. This does not submit an on-chain transaction.
  const handleAuthorizeApproval = (approvalId: string) => {
    const item = approvals.find((approval) => approval.id === approvalId);
    if (!item) return;

    const demoRefId = `DEMO-AUTH-${Math.floor(1000 + Math.random() * 9000)}`;

    setApprovals((previous) =>
      previous.map((approval) =>
        approval.id === approvalId
          ? { ...approval, status: 'awaiting_execution', demoRef: demoRefId }
          : approval
      )
    );

    setRequests((previous) =>
      previous.map((request) =>
        request.id === item.requestId
          ? { ...request, status: 'awaiting_execution', demoRef: demoRefId }
          : request
      )
    );

    setWalletConfig((previous) => ({
      ...previous,
      dailySpent: previous.dailySpent + item.amount,
      balanceCUSD: Math.max(0, previous.balanceCUSD - item.amount),
    }));

    setSuppliers((previous) =>
      previous.map((supplier) =>
        supplier.walletAddress.toLowerCase() ===
        item.supplierWallet.toLowerCase()
          ? {
              ...supplier,
              totalPaidCUSD: supplier.totalPaidCUSD + item.amount,
            }
          : supplier
      )
    );

    const newActivity: ActivityEvent = {
      id: `ACT-${Date.now()}`,
      timestamp: 'Just now',
      type: 'demo_authorization',
      actor: 'Elena Vance (Owner)',
      title: 'Demo Authorization Recorded',
      description: `Requisition authorized for $${item.amount.toLocaleString()} ${item.currency} to ${item.supplierName}. Queued as 'Awaiting On-chain Execution' on Celo Sepolia (Chain ID 11142220).`,
      amount: item.amount,
      currency: item.currency,
      demoRef: demoRefId,
      badge: 'Awaiting On-Chain',
    };

    setActivity((previous) => [newActivity, ...previous]);
  };

  // Commit an auditable decision from the Sentinel modal.
  const handleCommitMandateDecision = (
    receipt: AuditableDecisionReceipt,
    mandateData?: {
      mandateId: `0x${string}`;
      maxAmount: number;
      expiry: string;
      supplierAddress: Address;
    }
  ) => {
    if (
      receipt.action === 'approve_and_generate_mandate' &&
      mandateData
    ) {
      setRequests((previous) =>
        previous.map((request) =>
          request.id === receipt.requisitionId
            ? {
                ...request,
                status: 'awaiting_execution',
                mandateId: mandateData.mandateId,
                mandateStatus: 'prepared',
                mandateMaxAmount: mandateData.maxAmount,
                mandateExpiry: mandateData.expiry,
                demoRef: receipt.receiptId,
              }
            : request
        )
      );

      setApprovals((previous) =>
        previous.map((approval) =>
          approval.requestId === receipt.requisitionId
            ? {
                ...approval,
                status: 'awaiting_execution',
                mandateId: mandateData.mandateId,
                mandateStatus: 'prepared',
                mandateMaxAmount: mandateData.maxAmount,
                mandateExpiry: mandateData.expiry,
                receiptId: receipt.receiptId,
              }
            : approval
        )
      );

      setActivity((previous) => [
        {
          id: `ACT-MANDATE-${previous.length + 1}`,
          timestamp: 'Just now',
          type: 'owner_approval',
          actor: 'Elena Vance (Owner)',
          title: `Purchase Mandate Prepared (Demo): ${mandateData.mandateId.slice(0, 10)}...`,
          description: `Owner recorded approval and prepared Purchase Mandate calldata for requisition ${receipt.requisitionId} (Max $${mandateData.maxAmount.toLocaleString()} USDC). Prepared calldata awaiting on-chain broadcast. Receipt: ${receipt.receiptId}.`,
          amount: mandateData.maxAmount,
          currency: 'USDC',
          demoRef: receipt.receiptId,
          badge: 'Mandate Prepared (Local)',
        },
        ...previous,
      ]);
    } else if (receipt.action === 'reject') {
      handleRejectApproval(receipt.requisitionId);
    } else if (receipt.action === 'request_clarification') {
      setRequests((previous) =>
        previous.map((request) =>
          request.id === receipt.requisitionId
            ? { ...request, status: 'pending_approval' }
            : request
        )
      );

      setActivity((previous) => [
        {
          id: `ACT-CLARIFY-${previous.length + 1}`,
          timestamp: 'Just now',
          type: 'policy_guardrail',
          actor: 'Elena Vance (Owner)',
          title: `Clarification Requested: ${receipt.requisitionId}`,
          description: `Owner requested additional documentation: "${receipt.clarificationNote || 'Vendor quote and justification breakdown needed'}". No payment authority granted.`,
          badge: 'Clarification Needed',
        },
        ...previous,
      ]);
    } else if (receipt.action === 'escalate_to_multisig') {
      setActivity((previous) => [
        {
          id: `ACT-ESCALATE-${previous.length + 1}`,
          timestamp: 'Just now',
          type: 'policy_guardrail',
          actor: 'Elena Vance (Owner)',
          title: `Requisition Escalated to Multi-Sig: ${receipt.requisitionId}`,
          description:
            'Escalated for senior executive sign-off due to policy threshold or contract ceiling trigger. No payment authority granted.',
          badge: 'Escalated',
        },
        ...previous,
      ]);
    }
  };

  // Reject an approval.
  const handleRejectApproval = (approvalId: string) => {
    const item = approvals.find((approval) => approval.id === approvalId);
    if (!item) return;

    setApprovals((previous) =>
      previous.map((approval) =>
        approval.id === approvalId
          ? { ...approval, status: 'rejected' }
          : approval
      )
    );

    setRequests((previous) =>
      previous.map((request) =>
        request.id === item.requestId
          ? { ...request, status: 'rejected' }
          : request
      )
    );

    const newActivity: ActivityEvent = {
      id: `ACT-${Date.now()}`,
      timestamp: 'Just now',
      type: 'owner_approval',
      actor: 'Elena Vance (Owner)',
      title: `Requisition Declined: ${item.title}`,
      description:
        'Requisition declined by owner. Smart account authorization withheld.',
      badge: 'Declined',
    };

    setActivity((previous) => [newActivity, ...previous]);
  };

  // Reset the demo data.
  const handleResetDemoData = () => {
    if (typeof window !== 'undefined') {
      resetToDemoDefaults();
      setRequests(INITIAL_PURCHASE_REQUESTS);
      setSuppliers(INITIAL_SUPPLIERS);
      setQuotations(INITIAL_QUOTATIONS);
      setApprovals(INITIAL_APPROVALS);
      setWalletConfig(INITIAL_ALTANA_WALLET);
      setActivity(INITIAL_ACTIVITY);
    }
  };

  const pendingApprovalsCount = approvals.filter(
    (approval) => approval.status === 'pending'
  ).length;

  const activeRequestsCount = requests.filter(
    (request) =>
      request.status === 'pending_approval' ||
      request.status === 'ai_reviewing' ||
      request.status === 'draft' ||
      request.status === 'awaiting_execution'
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <DemoBanner onReset={handleResetDemoData} />

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex shrink-0">
          <Sidebar
            currentTab={currentTab}
            onSelectTab={(tab) => {
              setCurrentTab(tab);
              setIsMobileSidebarOpen(false);
            }}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() =>
              setIsSidebarCollapsed((previous) => !previous)
            }
            walletConfig={walletConfig}
            pendingApprovalsCount={pendingApprovalsCount}
            activeRequestsCount={activeRequestsCount}
          />
        </div>

        {/* Mobile Sidebar */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setIsMobileSidebarOpen(false)}
            />

            <div className="relative z-10 w-64 bg-slate-900 h-full flex flex-col">
              <Sidebar
                currentTab={currentTab}
                onSelectTab={(tab) => {
                  setCurrentTab(tab);
                  setIsMobileSidebarOpen(false);
                }}
                isCollapsed={false}
                onToggleCollapse={() => setIsMobileSidebarOpen(false)}
                walletConfig={walletConfig}
                pendingApprovalsCount={pendingApprovalsCount}
                activeRequestsCount={activeRequestsCount}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <TopBar
            currentTab={currentTab}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onMobileMenuToggle={() =>
              setIsMobileSidebarOpen((previous) => !previous)
            }
            pendingApprovalsCount={pendingApprovalsCount}
            walletSession={walletSession}
            onConnectWallet={(provider) => {
              void handleConnectWallet(provider);
            }}
            onDisconnectWallet={handleDisconnectWallet}
          />

          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
            {currentTab === 'overview' && (
              <OverviewView
                requests={requests}
                suppliers={suppliers}
                approvals={approvals}
                activity={activity}
                onNavigateTab={(tab) => setCurrentTab(tab)}
                onAuthorizeApproval={handleAuthorizeApproval}
              />
            )}

            {currentTab === 'requests' && (
              <PurchaseRequestsView
                requests={requests}
                onOpenCreateModal={() => setIsCreateModalOpen(true)}
                onNavigateTab={(tab) => setCurrentTab(tab)}
              />
            )}

            {currentTab === 'suppliers' && (
              <SuppliersView
                suppliers={suppliers}
                onOpenAddModal={() => setIsAddSupplierModalOpen(true)}
              />
            )}

            {currentTab === 'quotations' && (
              <QuotationsView
                quotations={quotations}
                onAcceptQuote={() => setCurrentTab('approvals')}
                onNavigateTab={(tab) => setCurrentTab(tab)}
              />
            )}

            {currentTab === 'approvals' && (
              <ApprovalCentreView
                approvals={approvals}
                requests={requests}
                suppliers={suppliers}
                quotations={quotations}
                onAuthorize={handleAuthorizeApproval}
                onReject={handleRejectApproval}
                onCommitMandateDecision={handleCommitMandateDecision}
              />
            )}

            {currentTab === 'wallet' && (
              <AgentWalletView
                walletConfig={walletConfig}
                onUpdatePolicy={(updated) =>
                  setWalletConfig((previous) => ({
                    ...previous,
                    ...updated,
                  }))
                }
              />
            )}

            {currentTab === 'activity' && (
              <ActivityView activity={activity} />
            )}

            {currentTab === 'settings' && (
              <SettingsView
                walletConfig={walletConfig}
                onUpdateWallet={(newConfig) => setWalletConfig(newConfig)}
                onResetDemoData={handleResetDemoData}
              />
            )}
          </main>
        </div>
      </div>

      {/* Modals */}
      <CreateRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateRequest}
      />

      <AddSupplierModal
        isOpen={isAddSupplierModalOpen}
        onClose={() => setIsAddSupplierModalOpen(false)}
        onSubmit={handleAddSupplier}
      />
    </div>
  );
}
