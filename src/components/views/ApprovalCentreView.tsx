'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  Clock,
  Sparkles,
  Shield,
  Layers,
  X,
  FileCheck,
} from 'lucide-react';
import { ApprovalItem } from '@/types';

interface ApprovalCentreViewProps {
  approvals: ApprovalItem[];
  onAuthorize: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
}

export const ApprovalCentreView: React.FC<ApprovalCentreViewProps> = ({
  approvals,
  onAuthorize,
  onReject,
}) => {
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ id: string; demoRef: string } | null>(null);

  const pendingApprovals = approvals.filter((a) => a.status === 'pending');
  const authorizedApprovals = approvals.filter(
    (a) => a.status === 'demo_approved' || a.status === 'awaiting_execution'
  );

  const handleSimulateAuthorization = (item: ApprovalItem) => {
    setIsAuthorizing(true);
    setSelectedApproval(item);

    // Simulate cryptographic owner sign and Altana Agent wallet dispatch readiness
    setTimeout(() => {
      onAuthorize(item.id);
      setIsAuthorizing(false);
      const demoRefId = `DEMO-AUTH-${Math.floor(1000 + Math.random() * 9000)}`;
      setSuccessInfo({
        id: item.id,
        demoRef: demoRefId,
      });
      setTimeout(() => setSuccessInfo(null), 7000);
      setSelectedApproval(null);
    }, 1000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-500/30 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Owner Authority & Altana Smart Account Guardrails [Demo]</span>
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Cryptographic Approval Centre
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Every procurement transaction is governed by the Altana Agent Wallet on Celo.
              Routine micro-transactions (&lt; $500 cUSD) can be scheduled automatically in demo mode, while major expenditures
              require explicit owner cryptographic sign-off.
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-1 text-xs">
            <span className="text-slate-400">
              Pending Authorization: <strong className="text-amber-400 font-bold">{pendingApprovals.length}</strong>
            </span>
            <span className="text-slate-500 text-[11px]">
              Demo Volume: ${pendingApprovals.reduce((a, c) => a + c.amount, 0).toLocaleString()} cUSD
            </span>
          </div>
        </div>
      </div>

      {/* Honest Demo Notification Alert */}
      {successInfo && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-white">Owner Authorization Recorded! [Demo Mode]</span>
              <p className="text-[11px] text-emerald-300">
                Requisition status updated to <strong>Awaiting On-chain Execution</strong> on Celo Sepolia (11142220).
                No live blockchain transaction was broadcast or funds debited in demo mode.
              </p>
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
            <span>Rule 1: Autonomous Micro-Spend</span>
          </div>
          <p className="text-slate-400 leading-snug">
            Purchases below <strong>$500 cUSD</strong> with verified suppliers can be scheduled or auto-approved by the Altana Agent in demo mode.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <div className="flex items-center gap-2 font-bold text-amber-400 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Rule 2: Owner Cryptographic Sign</span>
          </div>
          <p className="text-slate-400 leading-snug">
            Expenditures <strong>&ge; $500 cUSD</strong> strictly require owner signature before the Celo smart contract unlocks funds.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <div className="flex items-center gap-2 font-bold text-indigo-400 mb-1">
            <Layers className="w-4 h-4" />
            <span>Rule 3: Daily Session Velocity Cap</span>
          </div>
          <p className="text-slate-400 leading-snug">
            Hard cap of <strong>$5,000 cUSD / 24hrs</strong> prevents treasury drainage even in the event of an agent anomaly.
          </p>
        </div>
      </div>

      {/* Pending Items List */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Awaiting Owner Authorization ({pendingApprovals.length})</span>
        </h4>

        {pendingApprovals.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
            <FileCheck className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <h5 className="font-bold text-white text-sm mb-1">Queue Clear</h5>
            <p className="text-slate-500">No pending purchase orders requiring signature.</p>
          </div>
        ) : (
          pendingApprovals.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-sm hover:border-slate-700 transition space-y-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-400">{item.id}</span>
                    <span className="text-slate-600">&bull;</span>
                    <h5 className="font-bold text-white text-base truncate">{item.title}</h5>

                    {item.policyType === 'owner_authorization_required' ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold uppercase">
                        Owner Signature Required (&gt; $500)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold uppercase">
                        Altana Auto-Eligible (&lt; $500)
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span>Department: <strong className="text-slate-200">{item.department}</strong></span>
                    <span>&bull;</span>
                    <span>Requester: <span className="text-slate-200">{item.submittedBy}</span></span>
                    <span>&bull;</span>
                    <span>Vendor: <strong className="text-slate-200">{item.supplierName}</strong></span>
                    <span>&bull;</span>
                    <span className="font-mono text-slate-400">
                      Celo (Demo): {item.supplierWallet.slice(0, 8)}...{item.supplierWallet.slice(-6)}
                    </span>
                  </div>
                </div>

                {/* Amount & Execution Button */}
                <div className="flex items-center justify-between lg:justify-end gap-6 shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Authorized Release</div>
                    <div className="text-2xl font-extrabold text-white">
                      ${item.amount.toLocaleString()}{' '}
                      <span className="text-xs text-emerald-400 font-semibold">{item.currency}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">Est. Celo Gas: &lt; $0.001</div>
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
                      disabled={isAuthorizing && selectedApproval?.id === item.id}
                      onClick={() => handleSimulateAuthorization(item)}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition flex items-center gap-2 hover:scale-[1.02] disabled:opacity-50"
                    >
                      {isAuthorizing && selectedApproval?.id === item.id ? (
                        <>
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                          <span>Simulating Sign...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                          <span>Demo Authorize</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* AI Agent Analysis Note */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold text-slate-300">ProcureYeti Simulated AI Audit [Demo]:</span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">{item.aiNotes}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Historical Authorized Items */}
      {authorizedApprovals.length > 0 && (
        <div className="pt-6 border-t border-slate-800 space-y-3">
          <h4 className="text-sm font-bold text-slate-400">Recently Demo Authorized</h4>
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
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-white font-bold">
                    ${auth.amount.toLocaleString()} {auth.currency}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Awaiting On-chain Execution
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
