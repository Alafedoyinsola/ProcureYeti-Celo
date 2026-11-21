'use client';

import React, { useState } from 'react';
import {
  Bell,
  Search,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Moon,
  Sun,
  Menu,
  Wallet,
  LogOut,
  Key,
  Loader2,
} from 'lucide-react';
import { NavTab } from './Sidebar';
import { isDisburserConfigured, type LiveWalletSession } from '@/lib/altana';

interface TopBarProps {
  currentTab: NavTab;
  onOpenCreateModal: () => void;
  onMobileMenuToggle?: () => void;
  pendingApprovalsCount: number;
  isLiveMode?: boolean;
  onToggleLiveMode?: (isLive: boolean) => void;
  walletSession?: LiveWalletSession;
  onConnectWallet?: (provider: 'altana_passkey' | 'injected_eoa') => void;
  onDisconnectWallet?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  onOpenCreateModal,
  onMobileMenuToggle,
  pendingApprovalsCount,
  isLiveMode = false,
  onToggleLiveMode,
  walletSession,
  onConnectWallet,
  onDisconnectWallet,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showConnectMenu, setShowConnectMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const disburserReady = isDisburserConfigured();

  const tabTitles: Record<NavTab, { title: string; subtitle: string }> = {
    overview: {
      title: 'Procurement Overview',
      subtitle: 'Real-time spend analytics, simulated AI recommendations & Celo settlement readiness',
    },
    requests: {
      title: 'Purchase Requests',
      subtitle: 'Manage departmental requisitions and trigger simulated AI quotation pipelines',
    },
    suppliers: {
      title: 'Verified Suppliers',
      subtitle: 'Directory of suppliers with demo Celo payment addresses',
    },
    quotations: {
      title: 'Quotations Engine',
      subtitle: 'Simulated heuristic quotation scoring and multi-vendor comparison [Demo Mode]',
    },
    approvals: {
      title: 'Approval Centre',
      subtitle: 'Owner cryptographic authorization workflow & Altana autonomous policy guardrails',
    },
    wallet: {
      title: 'Altana Agent Wallet',
      subtitle: 'Smart account guardrails, velocity limits and Celo Sepolia contract enforcement',
    },
    activity: {
      title: 'Audit & Activity Log',
      subtitle: 'Simulated tamper-proof event sequence: AI decisions, owner signatures & demo records',
    },
    settings: {
      title: 'Platform Settings',
      subtitle: 'Altana policy thresholds, Celo Sepolia / Mainnet RPC endpoints and corporate profiles',
    },
  };

  const notifications = [
    {
      id: 1,
      title: 'Owner Sign-Off Required',
      time: '10m ago',
      unread: true,
      desc: 'PR-2026-081 ($5,190 cUSD) exceeds $500 agent autonomous limit. Owner signature required.',
      type: 'warning',
    },
    {
      id: 2,
      title: 'Simulated AI Analysis Found 5.0% Savings',
      time: '1h ago',
      unread: true,
      desc: 'Simulated heuristic negotiation completed for Nebula Compute Labs. Reserved credits discounted.',
      type: 'info',
    },
    {
      id: 3,
      title: 'Awaiting On-Chain Execution (Celo Sepolia)',
      time: '2h ago',
      unread: false,
      desc: 'Demo authorized: 2,280.00 cUSD to Nebula Compute Labs. Queued for live contract broadcast on Celo Sepolia (11142220).',
      type: 'success',
    },
  ];

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    const root = document.documentElement;
    if (newMode) {
      root.classList.remove('light');
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  };

  const { title, subtitle } = tabTitles[currentTab] || tabTitles.overview;

  return (
    <header className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger & breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          {onMobileMenuToggle && (
            <button
              onClick={onMobileMenuToggle}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate flex items-center gap-2">
              {title}
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block truncate">{subtitle}</p>
          </div>
        </div>

        {/* Center: Search input */}
        <div className="hidden md:flex items-center flex-1 max-w-xs mx-2">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search requests, vendors..."
              className="w-full bg-slate-950/70 border border-slate-800 text-slate-200 text-xs rounded-xl pl-8 pr-12 py-2 focus:outline-none focus:border-emerald-500/50 transition placeholder:text-slate-500"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Celo Network Status Pill */}
          <div className="hidden xl:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Celo Sepolia</span>
            <span className="text-slate-400 text-[10px]">#11142220</span>
          </div>

          {/* Contract Deployment State Badge */}
          {disburserReady ? (
            <div
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono"
              title="ProcureYetiDisburser router deployed and active on Celo Sepolia"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Router: <strong className="text-emerald-400">Active</strong></span>
            </div>
          ) : (
            <div
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs font-mono"
              title="ProcureYetiDisburser router is not deployed on Celo Sepolia (NEXT_PUBLIC_DISBURSER_ADDRESS is unset)"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Contract: <strong className="text-amber-400">Not Deployed</strong></span>
            </div>
          )}

          {/* Mode Switcher: Demo Sandbox vs Live Celo Sepolia */}
          {onToggleLiveMode && (
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => onToggleLiveMode(false)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${
                  !isLiveMode
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Local Demo Sandbox: Simulates authorizations without network calls"
              >
                Demo
              </button>
              <button
                type="button"
                onClick={() => onToggleLiveMode(true)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${
                  isLiveMode
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Live Mode: Real Altana Smart Account sessions and Celo Sepolia contract execution"
              >
                Live
              </button>
            </div>
          )}

          {/* Wallet Connection Pill / Action */}
          {walletSession && walletSession.state === 'connected' && walletSession.address ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-bold">
                {walletSession.address.slice(0, 6)}...{walletSession.address.slice(-4)}
              </span>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-1 py-0.5 rounded">
                {walletSession.providerType === 'altana_passkey' ? 'Passkey' : 'EOA'}
              </span>
              {onDisconnectWallet && (
                <button
                  type="button"
                  onClick={onDisconnectWallet}
                  title="Disconnect Wallet"
                  className="p-1 text-slate-400 hover:text-red-400 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : walletSession && walletSession.state === 'connecting' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span className="text-[11px]">Connecting...</span>
            </div>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowConnectMenu(!showConnectMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                title="Connect Altana Smart Account or Injected EOA Signer"
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Connect Wallet</span>
              </button>

              {showConnectMenu && (
                <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 text-xs z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">
                    Connect Signer (Celo Sepolia)
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowConnectMenu(false);
                      onConnectWallet?.('altana_passkey');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-white flex items-center gap-2.5 transition"
                  >
                    <Key className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-xs">Altana Passkey</div>
                      <div className="text-[10px] text-slate-400">WebAuthn Smart Account</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowConnectMenu(false);
                      onConnectWallet?.('injected_eoa');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-white flex items-center gap-2.5 transition mt-1"
                  >
                    <Wallet className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-xs">Browser EOA</div>
                      <div className="text-[10px] text-slate-400">MetaMask, Rabby, etc.</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {pendingApprovalsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-900" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-4 text-xs z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <span className="font-bold text-white text-sm">System & Simulated AI Alerts</span>
                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="text-[11px] text-emerald-400 font-semibold cursor-pointer hover:underline"
                  >
                    Close
                  </button>
                </div>
                <div className="space-y-2.5">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-2.5 rounded-xl border transition ${
                        n.unread
                          ? 'bg-slate-950 border-slate-700/80'
                          : 'bg-slate-900/60 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between font-medium text-slate-200 mb-1">
                        <span className="flex items-center gap-1.5">
                          {n.type === 'warning' && <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />}
                          {n.title}
                        </span>
                        <span className="text-[10px] text-slate-500">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{n.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Primary Action Button: Create Purchase Request */}
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">New Request</span>
          </button>

          {/* User Profile Area */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs ring-2 ring-slate-800 shadow-sm">
                EV
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
            </div>

            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-semibold text-white leading-tight">Elena Vance</span>
              <span className="text-[10px] text-slate-400">Owner & Authorized Signer</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
