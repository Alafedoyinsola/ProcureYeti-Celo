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

export default function Home() {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);

  // Core Data States with lazy initializers (eliminates synchronous setState cascading render warning)
  const [requests, setRequests] = useState<PurchaseRequest[]>(getStoredRequests);
  const [suppliers, setSuppliers] = useState<Supplier[]>(getStoredSuppliers);
  const [quotations, setQuotations] = useState<Quotation[]>(getStoredQuotations);
  const [approvals, setApprovals] = useState<ApprovalItem[]>(getStoredApprovals);
  const [walletConfig, setWalletConfig] = useState<AltanaWalletConfig>(getStoredWalletConfig);
  const [activity, setActivity] = useState<ActivityEvent[]>(getStoredActivity);

  // Synchronize state changes to localStorage
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

  // Handler: Create Purchase Request
  const handleCreateRequest = (
    newReqData: Omit<PurchaseRequest, 'id' | 'createdAt' | 'status' | 'requestedBy'>
  ) => {
    const nextNum = requests.length + 85;
    const reqId = `PR-2026-${nextNum}`;

    // Determine status based on Altana policy:
    // If < autoApprovalThreshold ($500), AI auto-reviews and qualifies for demo scheduling
    const isUnderThreshold = newReqData.estimatedBudget < walletConfig.autoApprovalThreshold;
    const status = isUnderThreshold ? 'ai_reviewing' : 'pending_approval';

    // Simulated recommendation heuristic
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

    const updatedRequests = [newRequest, ...requests];
    setRequests(updatedRequests);

    // Also add to Approval Queue if >= $500 threshold
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
      setApprovals([newApproval, ...approvals]);
    }

    // Add activity event
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
    setActivity([newActivity, ...activity]);
  };

  // Handler: Add Supplier
  const handleAddSupplier = (
    newSupData: Omit<Supplier, 'id' | 'rating' | 'verificationStatus' | 'totalPaidCUSD'>
  ) => {
    const nextId = `SUP-0${suppliers.length + 1}`;
    const newSupplier: Supplier = {
      ...newSupData,
      id: nextId,
      rating: 4.8,
      verificationStatus: 'verified',
      totalPaidCUSD: 0,
    };

    setSuppliers([...suppliers, newSupplier]);

    const newActivity: ActivityEvent = {
      id: `ACT-${Date.now()}`,
      timestamp: 'Just now',
      type: 'policy_guardrail',
      actor: 'ProcureYeti System',
      title: `Verified Vendor Registered: ${newSupData.name}`,
      description: `Payment address ${newSupData.walletAddress.slice(0, 8)}... added to Altana whitelist for Celo Sepolia (11142220).`,
      badge: 'Whitelist Added',
    };
    setActivity([newActivity, ...activity]);
  };

  // Handler: Authorize (No fake tx hashes, honest demo execution status)
  const handleAuthorizeApproval = (approvalId: string) => {
    const item = approvals.find((a) => a.id === approvalId);
    if (!item) return;

    const demoRefId = `DEMO-AUTH-${Math.floor(1000 + Math.random() * 9000)}`;

    // Update approvals: status becomes awaiting_execution or demo_approved
    setApprovals(
      approvals.map((a) =>
        a.id === approvalId
          ? { ...a, status: 'awaiting_execution', demoRef: demoRefId }
          : a
      )
    );

    // Update request: status becomes awaiting_execution
    setRequests(
      requests.map((r) =>
        r.id === item.requestId
          ? { ...r, status: 'awaiting_execution', demoRef: demoRefId }
          : r
      )
    );

    // Update simulated daily spent in session
    setWalletConfig((prev) => ({
      ...prev,
      dailySpent: prev.dailySpent + item.amount,
      balanceCUSD: Math.max(0, prev.balanceCUSD - item.amount),
    }));

    // Update supplier total paid (demo volume)
    setSuppliers(
      suppliers.map((s) =>
        s.walletAddress.toLowerCase() === item.supplierWallet.toLowerCase()
          ? { ...s, totalPaidCUSD: s.totalPaidCUSD + item.amount }
          : s
      )
    );

    // Add activity event (clearly stating Awaiting Live On-Chain Settlement)
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
    setActivity([newActivity, ...activity]);
  };

  // Handler: Commit Mandate Decision from Sentinel Modal
  const handleCommitMandateDecision = (
    receipt: AuditableDecisionReceipt,
    mandateData?: {
      mandateId: `0x${string}`;
      maxAmount: number;
      expiry: string;
      supplierAddress: Address;
    }
  ) => {
    if (receipt.action === 'approve_and_generate_mandate' && mandateData) {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === receipt.requisitionId
            ? {
                ...r,
                status: 'awaiting_execution',
                mandateId: mandateData.mandateId,
                mandateStatus: 'prepared',
                mandateMaxAmount: mandateData.maxAmount,
                mandateExpiry: mandateData.expiry,
                demoRef: receipt.receiptId,
              }
            : r
        )
      );

      setApprovals((prev) =>
        prev.map((a) =>
          a.requestId === receipt.requisitionId
            ? {
                ...a,
                status: 'awaiting_execution',
                mandateId: mandateData.mandateId,
                mandateStatus: 'prepared',
                mandateMaxAmount: mandateData.maxAmount,
                mandateExpiry: mandateData.expiry,
                receiptId: receipt.receiptId,
              }
            : a
        )
      );

      setActivity((prev) => [
        {
          id: `ACT-MANDATE-${prev.length + 1}`,
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
        ...prev,
      ]);
    } else if (receipt.action === 'reject') {
      handleRejectApproval(receipt.requisitionId);
    } else if (receipt.action === 'request_clarification') {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === receipt.requisitionId
            ? { ...r, status: 'pending_approval' }
            : r
        )
      );
      setActivity((prev) => [
        {
          id: `ACT-CLARIFY-${prev.length + 1}`,
          timestamp: 'Just now',
          type: 'policy_guardrail',
          actor: 'Elena Vance (Owner)',
          title: `Clarification Requested: ${receipt.requisitionId}`,
          description: `Owner requested additional documentation: "${receipt.clarificationNote || 'Vendor quote and justification breakdown needed'}". No payment authority granted.`,
          badge: 'Clarification Needed',
        },
        ...prev,
      ]);
    } else if (receipt.action === 'escalate_to_multisig') {
      setActivity((prev) => [
        {
          id: `ACT-ESCALATE-${prev.length + 1}`,
          timestamp: 'Just now',
          type: 'policy_guardrail',
          actor: 'Elena Vance (Owner)',
          title: `Requisition Escalated to Multi-Sig: ${receipt.requisitionId}`,
          description: `Escalated for senior executive sign-off due to policy threshold or contract ceiling trigger. No payment authority granted.`,
          badge: 'Escalated',
        },
        ...prev,
      ]);
    }
  };

  // Handler: Reject Approval
  const handleRejectApproval = (approvalId: string) => {
    const item = approvals.find((a) => a.id === approvalId);
    if (!item) return;

    setApprovals(
      approvals.map((a) => (a.id === approvalId ? { ...a, status: 'rejected' } : a))
    );

    setRequests(
      requests.map((r) => (r.id === item.requestId ? { ...r, status: 'rejected' } : r))
    );

    const newActivity: ActivityEvent = {
      id: `ACT-${Date.now()}`,
      timestamp: 'Just now',
      type: 'owner_approval',
      actor: 'Elena Vance (Owner)',
      title: `Requisition Declined: ${item.title}`,
      description: `Requisition declined by owner. Smart account authorization withheld.`,
      badge: 'Declined',
    };
    setActivity([newActivity, ...activity]);
  };

  // Handler: Reset Demo Data
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

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'pending').length;
  const activeRequestsCount = requests.filter(
    (r) =>
      r.status === 'pending_approval' ||
      r.status === 'ai_reviewing' ||
      r.status === 'draft' ||
      r.status === 'awaiting_execution'
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Demo Mode Banner */}
      <DemoBanner onReset={handleResetDemoData} />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="hidden lg:flex shrink-0">
          <Sidebar
            currentTab={currentTab}
            onSelectTab={(tab) => {
              setCurrentTab(tab);
              setIsMobileSidebarOpen(false);
            }}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            walletConfig={walletConfig}
            pendingApprovalsCount={pendingApprovalsCount}
            activeRequestsCount={activeRequestsCount}
          />
        </div>

        {/* Mobile Slide-over Sidebar */}
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

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Bar */}
          <TopBar
            currentTab={currentTab}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onMobileMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            pendingApprovalsCount={pendingApprovalsCount}
          />

          {/* Tab Views */}
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
                onAcceptQuote={() => {
                  setCurrentTab('approvals');
                }}
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
                  setWalletConfig((prev) => ({ ...prev, ...updated }))
                }
              />
            )}

            {currentTab === 'activity' && <ActivityView activity={activity} />}

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
