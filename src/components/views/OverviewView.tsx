'use client';

import React from 'react';
import {
  DollarSign,
  Clock,
  FileText,
  Users,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Cpu,
} from 'lucide-react';
import {
  PurchaseRequest,
  Supplier,
  ApprovalItem,
  ActivityEvent,
} from '@/types';
import { NavTab } from '../layout/Sidebar';

interface OverviewViewProps {
  requests: PurchaseRequest[];
  suppliers: Supplier[];
  approvals: ApprovalItem[];
  activity: ActivityEvent[];
  onNavigateTab: (tab: NavTab) => void;
  onAuthorizeApproval: (approvalId: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  requests,
  suppliers,
  approvals,
  activity,
  onNavigateTab,
  onAuthorizeApproval,
}) => {
  // Aggregate stats
  const totalSpendCUSD = requests
    .filter((r) => r.status === 'demo_approved' || r.status === 'awaiting_execution')
    .reduce((acc, curr) => acc + curr.estimatedBudget, 0);

  const pendingApprovalsList = approvals.filter((a) => a.status === 'pending');
  const activeRequestsList = requests.filter(
    (r) =>
      r.status === 'pending_approval' ||
      r.status === 'ai_reviewing' ||
      r.status === 'draft' ||
      r.status === 'awaiting_execution'
  );

  // Spend breakdown by category
  const categories = [
    { name: 'Hardware & IT', spend: 23900, pct: 49, color: 'bg-emerald-500' },
    { name: 'Cloud & GPU Clusters', spend: 14680, pct: 30, color: 'bg-indigo-500' },
    { name: 'Packaging & Logistics', spend: 5200, pct: 11, color: 'bg-teal-500' },
    { name: 'Office & Facilities', spend: 2890, pct: 6, color: 'bg-amber-500' },
    { name: 'Professional & Audits', spend: 1950, pct: 4, color: 'bg-purple-500' },
  ];

  // Monthly timeline for CSS-based spending visualization
  const monthlyData = [
    { month: 'Jun', spend: 18400, height: '42%' },
    { month: 'Jul', spend: 24200, height: '55%' },
    { month: 'Aug', spend: 21800, height: '50%' },
    { month: 'Sep', spend: 32500, height: '74%' },
    { month: 'Oct', spend: 39100, height: '88%' },
    { month: 'Nov (Current)', spend: 48250, height: '100%', active: true },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/70 border border-slate-800 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Corporate Treasury on Celo &bull; Track 4 Altana Agent Wallets [Demo]</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              AI recommends. Owners authorize. Celo enforces.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              ProcureYeti equips SMBs with autonomous procurement agents governed by Altana Agent Wallets.
              Routine expenses settle within agent limits; high-value purchases require cryptographic owner sign-off.
            </p>
          </div>

          {/* Quick Metrics Badge Container */}
          <div className="flex flex-wrap lg:flex-col items-start lg:items-end gap-2 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Dev Network: <strong className="text-white">Celo Sepolia (11142220)</strong></span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span>Target Network: <strong className="text-white">Celo Mainnet (42220)</strong></span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Altana Spend Policy: <strong className="text-white">&lt; $500 cUSD Auto (Demo)</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Procurement Spend */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Total Authorized [Demo]</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1">
            ${totalSpendCUSD.toLocaleString()} <span className="text-xs font-normal text-emerald-400">cUSD</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="flex items-center text-emerald-400 font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5" /> +14.2%
            </span>
            <span>Simulated demo baseline</span>
          </div>
        </div>

        {/* Pending Approvals */}
        <div
          onClick={() => onNavigateTab('approvals')}
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm hover:border-amber-500/50 cursor-pointer transition group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Pending Approvals</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1 flex items-center justify-between">
            <span>{pendingApprovalsList.length}</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Action Req.
            </span>
          </div>
          <div className="text-xs text-slate-400">
            ${pendingApprovalsList.reduce((a, c) => a + c.amount, 0).toLocaleString()} cUSD awaiting owner sign
          </div>
        </div>

        {/* Active Purchase Requests */}
        <div
          onClick={() => onNavigateTab('requests')}
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm hover:border-indigo-500/50 cursor-pointer transition group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Active Requests</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1">
            {activeRequestsList.length} <span className="text-xs font-normal text-slate-400">active</span>
          </div>
          <div className="text-xs text-slate-400">
            {requests.filter((r) => r.status === 'ai_reviewing').length} under simulated RFQ comparison
          </div>
        </div>

        {/* Registered Suppliers */}
        <div
          onClick={() => onNavigateTab('suppliers')}
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm hover:border-teal-500/50 cursor-pointer transition group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Registered Vendors</span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 group-hover:scale-110 transition">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1">
            {suppliers.length} <span className="text-xs font-normal text-teal-400">demo vendors</span>
          </div>
          <div className="text-xs text-slate-400">
            100% with simulated Celo settlement addresses
          </div>
        </div>
      </div>

      {/* Pending Actions Requiring Owner Attention */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-base font-bold text-white">Pending Owner Authorizations</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Items exceeding the Altana Agent autonomy threshold ($500 cUSD) requiring owner cryptographic authorization
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('approvals')}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1 self-start sm:self-auto"
          >
            <span>View All Approvals ({pendingApprovalsList.length})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {pendingApprovalsList.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <p>All procurement items are authorized! Altana agent is operating within session guardrails.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingApprovalsList.slice(0, 2).map((item) => (
              <div
                key={item.id}
                className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm text-white truncate">{item.title}</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      Owner Authorization Required
                    </span>
                    <span className="text-xs text-slate-500">&bull; {item.department}</span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed flex items-start gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span>{item.aiNotes}</span>
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    <span>Vendor: <strong className="text-slate-300">{item.supplierName}</strong></span>
                    <span>&bull;</span>
                    <span className="font-mono text-slate-400">
                      Demo Celo: {item.supplierWallet.slice(0, 6)}...{item.supplierWallet.slice(-4)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                  <div className="text-right">
                    <div className="text-base sm:text-lg font-bold text-white">
                      ${item.amount.toLocaleString()} <span className="text-xs text-emerald-400 font-normal">{item.currency}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">Est. Celo Gas: &lt; 0.001 CELO</div>
                  </div>

                  <button
                    onClick={() => onAuthorizeApproval(item.id)}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                    <span>Demo Authorize</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grid: Spending Overview Visualization + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2 Cols: Spending Overview Chart */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Monthly Procurement Trajectory [Demo]
                </h3>
                <p className="text-xs text-slate-400">
                  Simulated settlement volume (cUSD / CELO) across departments
                </p>
              </div>

              {/* Currency Pills */}
              <div className="flex items-center gap-1.5 text-xs bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-slate-300 font-medium">82% cUSD</span>
                <span className="text-slate-600">|</span>
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                <span className="text-slate-400">12% USDC</span>
                <span className="text-slate-600">|</span>
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-slate-400">6% CELO</span>
              </div>
            </div>

            {/* CSS-based Bar Chart Visualization */}
            <div className="h-48 flex items-end gap-3 sm:gap-6 pt-6 pb-2 px-2 border-b border-slate-800">
              {monthlyData.map((d) => (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  <div className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    ${(d.spend / 1000).toFixed(1)}k
                  </div>
                  <div
                    style={{ height: d.height }}
                    className={`w-full rounded-t-lg transition-all duration-300 group-hover:brightness-110 ${
                      d.active
                        ? 'bg-gradient-to-t from-emerald-600 via-teal-500 to-emerald-400 shadow-lg shadow-emerald-500/20'
                        : 'bg-slate-800 hover:bg-slate-700'
                    }`}
                  />
                  <span className={`text-[11px] truncate ${d.active ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                    {d.month}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Department Breakdown Mini-Pills */}
          <div className="mt-5 space-y-2">
            <span className="text-xs font-semibold text-slate-300">Category Breakdown:</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.slice(0, 3).map((c) => (
                <div key={c.name} className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`w-2 h-2 rounded-full ${c.color}`} />
                    <span className="text-slate-300 font-medium truncate">{c.name}</span>
                  </div>
                  <div className="font-bold text-white text-sm">
                    ${c.spend.toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">({c.pct}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 1 Col: Recent Procurement Activity Timeline */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              Agent & Demo Activity
            </h3>
            <button
              onClick={() => onNavigateTab('activity')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Full Log
            </button>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto max-h-[360px] pr-1">
            {activity.slice(0, 5).map((act) => (
              <div key={act.id} className="relative pl-5 border-l border-slate-800 pb-2 text-xs">
                {/* Node icon */}
                <div className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full bg-slate-900 border-2 border-emerald-400" />

                <div className="flex items-center justify-between text-slate-400 mb-0.5">
                  <span className="font-semibold text-white truncate">{act.title}</span>
                  <span className="text-[10px] text-slate-500 shrink-0">{act.timestamp}</span>
                </div>

                <p className="text-slate-400 leading-snug mb-1">{act.description}</p>

                {act.demoRef && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                    <span>Demo Ref: {act.demoRef}</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
