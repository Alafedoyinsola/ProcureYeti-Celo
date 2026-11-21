'use client';

import React, { useState } from 'react';
import {
  Search,
  Plus,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';
import { PurchaseRequest, RequestStatus } from '@/types';
import { NavTab } from '../layout/Sidebar';

interface PurchaseRequestsViewProps {
  requests: PurchaseRequest[];
  onOpenCreateModal: () => void;
  onNavigateTab: (tab: NavTab) => void;
  onTriggerAiReview?: (requestId: string) => void;
}

export const PurchaseRequestsView: React.FC<PurchaseRequestsViewProps> = ({
  requests,
  onOpenCreateModal,
  onNavigateTab,
  onTriggerAiReview,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const statusConfig: Record<
    RequestStatus,
    { label: string; badgeClass: string; icon: React.FC<{ className?: string }> }
  > = {
    draft: {
      label: 'Draft',
      badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
      icon: FileText,
    },
    ai_reviewing: {
      label: 'Simulated RFQ Review',
      badgeClass: 'bg-indigo-950/70 text-indigo-300 border-indigo-700/50',
      icon: Sparkles,
    },
    pending_approval: {
      label: 'Pending Owner Sign',
      badgeClass: 'bg-amber-950/70 text-amber-300 border-amber-700/50',
      icon: Clock,
    },
    demo_approved: {
      label: 'Demo Approved',
      badgeClass: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/50',
      icon: CheckCircle2,
    },
    awaiting_execution: {
      label: 'Awaiting On-chain Execution',
      badgeClass: 'bg-teal-950/80 text-teal-300 border-teal-500/50 glow-celo',
      icon: CheckCircle2,
    },
    rejected: {
      label: 'Rejected',
      badgeClass: 'bg-red-950/70 text-red-300 border-red-700/50',
      icon: AlertCircle,
    },
  };

  const categories = Array.from(new Set(requests.map((r) => r.category)));

  // Filter logic
  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.requestedBy.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = selectedStatus === 'all' || req.status === selectedStatus;
    const matchesCategory = selectedCategory === 'all' || req.category === selectedCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Controls: Search, Filters, New Request CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID, item name, requester, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-emerald-500 transition placeholder:text-slate-500"
          />
        </div>

        {/* Category & Status Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create Request</span>
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'all', label: 'All Requests', count: requests.length },
          { id: 'ai_reviewing', label: 'Simulated RFQ', count: requests.filter((r) => r.status === 'ai_reviewing').length },
          { id: 'pending_approval', label: 'Pending Approval', count: requests.filter((r) => r.status === 'pending_approval').length },
          { id: 'demo_approved', label: 'Demo Approved', count: requests.filter((r) => r.status === 'demo_approved').length },
          { id: 'awaiting_execution', label: 'Awaiting On-Chain', count: requests.filter((r) => r.status === 'awaiting_execution').length },
          { id: 'draft', label: 'Drafts', count: requests.filter((r) => r.status === 'draft').length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedStatus(tab.id)}
            className={`px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 shrink-0 ${
              selectedStatus === tab.id
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedStatus === tab.id ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Request Cards */}
      {filteredRequests.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-white mb-1">No Purchase Requests Found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Try adjusting your search filters or click below to submit a new requisition.
          </p>
          <button
            onClick={onOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
          >
            Create Request
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const statusMeta = statusConfig[req.status] || statusConfig.draft;
            const StatusIcon = statusMeta.icon;

            return (
              <div
                key={req.id}
                className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-sm hover:border-slate-700 transition"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                  {/* Title & Metadata */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-400">{req.id}</span>
                      <span className="text-slate-600">&bull;</span>
                      <h4 className="font-bold text-white text-base truncate">{req.title}</h4>
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusMeta.badgeClass}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        <span>{statusMeta.label}</span>
                      </span>

                      {/* Mandate Status Badge */}
                      {req.mandateStatus === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          Mandate Active: {req.mandateId ? `${req.mandateId.slice(0, 8)}...` : 'On-Chain'}
                        </span>
                      ) : req.mandateStatus === 'prepared' || req.mandateId ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                          Mandate Prepared (Demo): {req.mandateId ? `${req.mandateId.slice(0, 8)}...` : 'Local'}
                        </span>
                      ) : req.status === 'pending_approval' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Owner Mandate Required
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>Category: <strong className="text-slate-300">{req.category}</strong></span>
                      <span>&bull;</span>
                      <span>Dept: <strong className="text-slate-300">{req.department}</strong></span>
                      <span>&bull;</span>
                      <span>By: <span className="text-slate-300">{req.requestedBy}</span></span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        Due: {req.deliveryDate}
                      </span>
                    </div>
                  </div>

                  {/* Financial Overview */}
                  <div className="flex items-center justify-between lg:justify-end gap-6 shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Estimated Budget</div>
                      <div className="text-lg font-extrabold text-white">
                        ${req.estimatedBudget.toLocaleString()}{' '}
                        <span className="text-xs text-emerald-400 font-semibold">{req.currency}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">Qty: {req.quantity} units</div>
                    </div>

                    {/* Actions based on status */}
                    {req.status === 'awaiting_execution' ? (
                      <div className="flex flex-col items-end gap-1">
                        <span className="px-3 py-1.5 rounded-xl bg-teal-950/80 border border-teal-500/40 text-teal-300 text-xs font-mono">
                          {req.demoRef || 'Demo Authorized'}
                        </span>
                        <span className="text-[10px] text-slate-400">Awaiting Celo Sepolia Broadcast</span>
                      </div>
                    ) : req.status === 'demo_approved' ? (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-semibold">
                        Demo Approved
                      </span>
                    ) : req.status === 'pending_approval' ? (
                      <button
                        onClick={() => onNavigateTab('approvals')}
                        className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1"
                      >
                        <span>Review in Approval Centre</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : req.status === 'ai_reviewing' ? (
                      <button
                        onClick={() => onNavigateTab('quotations')}
                        className="px-3 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/50 text-indigo-300 text-xs font-semibold transition flex items-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Compare Simulated RFQs</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onTriggerAiReview && onTriggerAiReview(req.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                      >
                        Run Simulated RFQ Scan
                      </button>
                    )}
                  </div>
                </div>

                {/* Simulated Recommendation Snippet */}
                {req.aiRecommendation && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">
                            Simulated Recommendation [Demo]: {req.aiRecommendation.suggestedSupplier}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                            {req.aiRecommendation.matchScore}% Match (Heuristic)
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-950 text-teal-300 border border-teal-800 flex items-center gap-1">
                            <TrendingDown className="w-3 h-3" />
                            {req.aiRecommendation.savingsPct}% Saved
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px] leading-snug">
                          {req.aiRecommendation.rationale}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigateTab('quotations')}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold text-xs shrink-0 self-start sm:self-auto flex items-center gap-1"
                    >
                      <span>View Breakdown</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
