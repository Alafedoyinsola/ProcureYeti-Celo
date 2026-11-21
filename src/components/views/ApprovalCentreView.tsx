'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  Clock,
  Shield,
  Layers,
  X,
  FileCheck,
} from 'lucide-react';
import { ApprovalItem, PurchaseRequest, Supplier, Quotation } from '@/types';
import { PurchaseMandateModal } from '@/components/modals/PurchaseMandateModal';
import { AuditableDecisionReceipt } from '@/lib/sentinel/investigation';
import { Address } from 'viem';

interface ApprovalCentreViewProps {
  approvals: ApprovalItem[];
  requests: PurchaseRequest[];
  suppliers: Supplier[];
  quotations: Quotation[];
  onAuthorize: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
  onCommitMandateDecision?: (
    receipt: AuditableDecisionReceipt,
    mandateData?: {
      mandateId: `0x${string}`;
      maxAmount: number;
      expiry: string;
      supplierAddress: Address;
    }
  ) => void;
}

export const ApprovalCentreView: React.FC<ApprovalCentreViewProps> = ({
  approvals,
  requests,
  suppliers,
  quotations,
  onAuthorize,
  onReject,
  onCommitMandateDecision,
}) => {
  const [selectedApprovalForMandate, setSelectedApprovalForMandate] = useState<ApprovalItem | null>(null);
  const [isMandateModalOpen, setIsMandateModalOpen] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ id: string; demoRef: string; mandateId?: string; action: string } | null>(null);

  const pendingApprovals = approvals.filter((a) => a.status === 'pending');
  const authorizedApprovals = approvals.filter(
    (a) => a.status === 'demo_approved' || a.status === 'awaiting_execution'
  );

  const handleOpenMandateModal = (item: ApprovalItem) => {
    setSelectedApprovalForMandate(item);
    setIsMandateModalOpen(true);
  };

  const handleCommitMandateDecision = (
    receipt: AuditableDecisionReceipt,
    mandateData?: {
      mandateId: `0x${string}`;
      maxAmount: number;
      expiry: string;
      supplierAddress: Address;
    }
  ) => {
    if (selectedApprovalForMandate) {
      if (receipt.action === 'approve_and_generate_mandate') {
        onAuthorize(selectedApprovalForMandate.id);
      } else if (receipt.action === 'reject') {
        onReject(selectedApprovalForMandate.id);
      }

      setSuccessInfo({
        id: selectedApprovalForMandate.id,
        demoRef: receipt.receiptId,
        mandateId: mandateData?.mandateId,
        action: receipt.action,
      });

      if (onCommitMandateDecision) {
        onCommitMandateDecision(receipt, mandateData);
      }
    }
  };

  const selectedRequest = requests.find((r) => r.id === selectedApprovalForMandate?.requestId) || null;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-500/30 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>ProcureYeti Sentinel: Owner Mandate Engine [Governance]</span>
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Owner Purchase Mandate Approval Centre
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Every procurement disbursement on Celo requires an owner-authorized Purchase Mandate.
              AI recommends purchases through deterministic risk investigation, human business owners authorize
              exact limits and suppliers, and the Celo Solidity disburser enforces them on-chain.
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-1 text-xs">
            <span className="text-slate-400">
              Pending Mandates: <strong className="text-amber-400 font-bold">{pendingApprovals.length}</strong>
            </span>
            <span className="text-slate-500 text-[11px]">
              Volume: ${pendingApprovals.reduce((a, c) => a + c.amount, 0).toLocaleString()} USDC
            </span>
          </div>
        </div>
      </div>

      {/* Honest Notification Alert */}
      {successInfo && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              {successInfo.action === 'approve_and_generate_mandate' ? (
                <>
                  <span className="font-bold text-white">Owner Decision Recorded (Prepared Calldata / Demo)</span>
                  <p className="text-[11px] text-emerald-300">
                    Receipt <strong>{successInfo.demoRef}</strong> generated.
                    {successInfo.mandateId && (
                      <span> Mandate ID: <strong className="font-mono">{successInfo.mandateId.slice(0, 10)}...</strong></span>
                    )}
                    {' '}Requisition status updated to <strong>Prepared / Awaiting On-Chain Submission</strong> (no live funds transferred).
                  </p>
                </>
              ) : successInfo.action === 'reject' ? (
                <>
                  <span className="font-bold text-white">Owner Rejection Recorded</span>
                  <p className="text-[11px] text-red-300">
                    Receipt <strong>{successInfo.demoRef}</strong> recorded. Requisition declined; zero payment authority created.
                  </p>
                </>
              ) : successInfo.action === 'request_clarification' ? (
                <>
                  <span className="font-bold text-white">Clarification Requested</span>
                  <p className="text-[11px] text-indigo-300">
                    Receipt <strong>{successInfo.demoRef}</strong> recorded. Requisition returned to requester; zero payment authority created.
                  </p>
                </>
              ) : (
                <>
                  <span className="font-bold text-white">Escalated to Multi-Sig Council</span>
                  <p className="text-[11px] text-indigo-300">
                    Receipt <strong>{successInfo.demoRef}</strong> recorded. Escalated for governance sign-off; zero payment authority created.
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="font-mono text-[11px] px-3 py-1.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-emerald-300 shrink-0">
            {successInfo.demoRef}
          </div>
        </div>
      )}

      {/* Policy Guardrail Rule Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <div className="flex items-center gap-2 font-bold text-emerald-400 mb-1">
            <Shield className="w-4 h-4" />
            <span>Rule 1: Owner Purchase Mandate</span>
          </div>
          <p className="text-slate-400 leading-snug">
            All disbursements strictly require an owner-created mandate specifying exact supplier, maximum amount, and requisition ID.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <div className="flex items-center gap-2 font-bold text-amber-400 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Rule 2: Contract Spending Ceilings</span>
          </div>
          <p className="text-slate-400 leading-snug">
            Capped at <strong>$2,500 USDC</strong> per single payment and <strong>$500 USDC</strong> for autonomous agent sessions.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <div className="flex items-center gap-2 font-bold text-indigo-400 mb-1">
            <Layers className="w-4 h-4" />
            <span>Rule 3: Daily Velocity &amp; Whitelist</span>
          </div>
          <p className="text-slate-400 leading-snug">
            Hard cap of <strong>$5,000 USDC daily</strong> (UTC calendar day) treasury protection and strictly verified supplier addresses.
          </p>
        </div>
      </div>

      {/* Pending Items List */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Awaiting Owner Purchase Mandate ({pendingApprovals.length})</span>
        </h4>

        {pendingApprovals.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
            <FileCheck className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <h5 className="font-bold text-white text-sm mb-1">Queue Clear</h5>
            <p className="text-slate-500">No pending requisitions requiring owner signature.</p>
          </div>
        ) : (
          pendingApprovals.map((item) => {
            const reqMeta = requests.find((r) => r.id === item.requestId);
            const hasMandate = Boolean(reqMeta?.mandateId || item.mandateId);

            return (
              <div
                key={item.id}
                className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-sm hover:border-slate-700 transition space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-400">{item.requestId}</span>
                      <span className="text-slate-600">&bull;</span>
                      <h5 className="font-bold text-white text-base truncate">{item.title}</h5>

                      {/* Mandate Status Badge */}
                      {item.mandateStatus === 'active' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold uppercase">
                          Mandate Active (On-Chain)
                        </span>
                      ) : item.mandateStatus === 'prepared' || hasMandate ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold uppercase">
                          Mandate Prepared (Local Demo)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold uppercase">
                          No Mandate Authorized
                        </span>
                      )}

                      {/* Deterministic Sentinel Score */}
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold">
                        Sentinel Score: {item.aiRiskScore === 'low' ? '12/100 (Low)' : '48/100 (Med)'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>Department: <strong className="text-slate-200">{item.department}</strong></span>
                      <span>&bull;</span>
                      <span>Requester: <span className="text-slate-200">{item.submittedBy}</span></span>
                      <span>&bull;</span>
                      <span>Vendor: <strong className="text-slate-200">{item.supplierName}</strong></span>
                      <span>&bull;</span>
                      <span className="font-mono text-slate-400">
                        Celo: {item.supplierWallet.slice(0, 8)}...{item.supplierWallet.slice(-6)}
                      </span>
                    </div>
                  </div>

                  {/* Financial Overview & Actions */}
                  <div className="flex items-center justify-between lg:justify-end gap-6 shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Quoted Amount</div>
                      <div className="text-2xl font-extrabold text-white">
                        ${item.amount.toLocaleString()}{' '}
                        <span className="text-xs text-emerald-400 font-semibold">{item.currency}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">Contract Cap: $2,500 USDC</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onReject(item.id)}
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-red-950 hover:text-red-300 text-slate-400 border border-slate-700 transition"
                        title="Decline requisition"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleOpenMandateModal(item)}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition flex items-center gap-2 hover:scale-[1.02]"
                      >
                        <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                        <span>Review &amp; Generate Mandate</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sentinel Risk Note */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-300">Sentinel Deterministic Policy Evaluation:</span>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {item.aiNotes} Whitelisted vendor on Celo. Requires owner mandate to authorize maximum settlement of ${item.amount.toLocaleString()} USDC.
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Historical Authorized Items */}
      {authorizedApprovals.length > 0 && (
        <div className="pt-6 border-t border-slate-800 space-y-3">
          <h4 className="text-sm font-bold text-slate-400">Recently Authorized Mandates</h4>
          <div className="space-y-2">
            {authorizedApprovals.map((auth) => (
              <div
                key={auth.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-white">{auth.title}</span>
                  <span className="text-slate-500">&bull; {auth.supplierName}</span>
                  <span className="font-mono text-[10px] text-amber-300/80">
                    Mandate: {auth.mandateStatus === 'active' ? (auth.mandateId ? `${auth.mandateId.slice(0, 10)}... (On-Chain)` : 'On-Chain') : `${auth.mandateId ? auth.mandateId.slice(0, 10) : 'None'}... (Prepared Demo)`}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-white font-bold">
                    ${auth.amount.toLocaleString()} {auth.currency}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Awaiting Execution
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Purchase Mandate Modal */}
      <PurchaseMandateModal
        isOpen={isMandateModalOpen}
        onClose={() => setIsMandateModalOpen(false)}
        request={selectedRequest}
        allRequests={requests}
        suppliers={suppliers}
        quotations={quotations}
        onCommitDecision={handleCommitMandateDecision}
      />
    </div>
  );
};
