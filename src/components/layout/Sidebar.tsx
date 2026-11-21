'use client';

import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Building2,
  Receipt,
  CheckCircle2,
  Wallet,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Shield,
  Copy,
  Check,
} from 'lucide-react';
import { AltanaWalletConfig } from '@/types';

export type NavTab =
  | 'overview'
  | 'requests'
  | 'suppliers'
  | 'quotations'
  | 'approvals'
  | 'wallet'
  | 'activity'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  walletConfig: AltanaWalletConfig;
  pendingApprovalsCount: number;
  activeRequestsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  walletConfig,
  pendingApprovalsCount,
  activeRequestsCount,
}) => {
  const [copied, setCopied] = React.useState(false);

  const copyAgentAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(walletConfig.agentAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const navItems = [
    {
      id: 'overview' as NavTab,
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'requests' as NavTab,
      label: 'Purchase Requests',
      icon: FileSpreadsheet,
      badge: activeRequestsCount > 0 ? activeRequestsCount : null,
      badgeColor: 'bg-slate-700 text-slate-200',
    },
    {
      id: 'suppliers' as NavTab,
      label: 'Suppliers',
      icon: Building2,
      badge: null,
    },
    {
      id: 'quotations' as NavTab,
      label: 'Quotations',
      icon: Receipt,
      badge: 'Simulated RFQ',
      badgeColor: 'bg-indigo-900/60 text-indigo-300 border border-indigo-700/50',
    },
    {
      id: 'approvals' as NavTab,
      label: 'Approval Centre',
      icon: CheckCircle2,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse',
    },
    {
      id: 'wallet' as NavTab,
      label: 'Agent Wallet',
      icon: Wallet,
      badge: 'Altana',
      badgeColor: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50',
    },
    {
      id: 'activity' as NavTab,
      label: 'Activity',
      icon: History,
      badge: null,
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings',
      icon: Settings,
      badge: null,
    },
  ];

  const dailySpentPercent = Math.min(
    100,
    Math.round((walletConfig.dailySpent / walletConfig.dailyAllowance) * 100)
  );

  return (
    <aside
      className={`relative flex flex-col bg-slate-900 border-r border-slate-800 text-slate-300 transition-all duration-300 ease-in-out z-30 select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 shadow-lg shadow-emerald-500/20 text-white font-bold">
              <span className="text-xl">🏔️</span>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">ProcureYeti</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Celo
                </span>
              </div>
              <span className="text-[11px] text-slate-400 truncate">Autonomous Procurement</span>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 shadow-md text-white font-bold text-xl">
            🏔️
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition hidden lg:flex items-center justify-center"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Principle Callout Pill */}
      {!isCollapsed && (
        <div className="px-3 pt-3 pb-1">
          <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-tight text-slate-300">
              <span className="font-semibold text-emerald-400">AI recommends.</span>{' '}
              <span className="font-semibold text-amber-300">Owners authorize.</span>{' '}
              <span className="font-semibold text-indigo-400">Celo enforces.</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs tracking-wide transition-all group ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />

              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        item.badgeColor || 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}

              {isCollapsed && item.badge && (
                <span className="absolute left-12 top-2 w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Altana Agent Wallet Mini-Card Footer */}
      {!isCollapsed ? (
        <div className="p-3 m-3 rounded-xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-200">Altana Agent [Demo]</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/50">
              Celo Sepolia
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-2 bg-slate-900/90 px-2 py-1 rounded border border-slate-800">
            <span title="Demo simulated agent address">
              {walletConfig.agentAddress.slice(0, 6)}...{walletConfig.agentAddress.slice(-4)} (Demo)
            </span>
            <button
              onClick={copyAgentAddress}
              title="Copy Demo Agent Wallet Address"
              className="text-slate-400 hover:text-emerald-400 transition"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          {/* Daily Allowance Progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Demo Session Cap</span>
              <span className="font-semibold text-slate-300 font-mono">
                ${walletConfig.dailySpent.toLocaleString()} / ${walletConfig.dailyAllowance.toLocaleString()} cUSD
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  dailySpentPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${dailySpentPercent}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 flex justify-center border-t border-slate-800">
          <div
            title="Altana Agent Guardrails Engaged (Demo Mode)"
            className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-700/50 flex items-center justify-center text-emerald-400"
          >
            <Shield className="w-4 h-4" />
          </div>
        </div>
      )}
    </aside>
  );
};
