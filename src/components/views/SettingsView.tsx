'use client';

import React, { useState } from 'react';
import {
  Settings,
  Shield,
  RotateCcw,
  Check,
  Server,
  Cpu,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { AltanaWalletConfig } from '@/types';

interface SettingsViewProps {
  walletConfig: AltanaWalletConfig;
  onUpdateWallet: (config: AltanaWalletConfig) => void;
  onResetDemoData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  walletConfig,
  onUpdateWallet,
  onResetDemoData,
}) => {
  const [dailyAllowance, setDailyAllowance] = useState(walletConfig.dailyAllowance);
  const [autoApprovalThreshold, setAutoApprovalThreshold] = useState(walletConfig.autoApprovalThreshold);
  const [maxSingleTxLimit, setMaxSingleTxLimit] = useState(walletConfig.maxSingleTxLimit);
  const selectedChainId = 11142220; // Celo Sepolia (Mainnet disabled)
  const [aiAutonomy, setAiAutonomy] = useState('balanced');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateWallet({
      ...walletConfig,
      dailyAllowance: Number(dailyAllowance),
      autoApprovalThreshold: Number(autoApprovalThreshold),
      maxSingleTxLimit: Number(maxSingleTxLimit),
      chainId: Number(selectedChainId),
      network: Number(selectedChainId) === 11142220 ? 'Celo Sepolia Testnet' : 'Celo Mainnet',
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-400" />
          <span>Platform & Policy Settings [Demo Mode]</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Manage Altana Agent Wallet smart contract constraints, Celo network parameters (Sepolia & Mainnet), and simulated RFQ preferences.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Settings successfully synced to local storage and Altana configuration!</span>
        </div>
      )}

      {/* Altana Spending Policy Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
          <div className="pb-3 border-b border-slate-800">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Altana Agent Wallet Guardrails (Demo Simulation)</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Programmatic rules configured for smart account validation on Celo Sepolia / Mainnet
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                Auto-Approval Threshold (cUSD)
              </label>
              <input
                type="number"
                value={autoApprovalThreshold}
                onChange={(e) => setAutoApprovalThreshold(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Purchases below this amount can be auto-approved in demo session.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                Daily Velocity Cap (cUSD)
              </label>
              <input
                type="number"
                value={dailyAllowance}
                onChange={(e) => setDailyAllowance(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Maximum 24h simulated disbursement volume across all vendors.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                Max Single Requisition Cap (cUSD)
              </label>
              <input
                type="number"
                value={maxSingleTxLimit}
                onChange={(e) => setMaxSingleTxLimit(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Single transaction ceiling even with owner signature.
              </span>
            </div>
          </div>
        </div>

        {/* Network & Blockchain Selection */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
          <div className="pb-3 border-b border-slate-800">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-teal-400" />
              <span>Celo Network Configuration</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Select target Celo network for smart account verification
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
            <div
              className="p-4 rounded-xl border bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/30"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white">Celo Sepolia (Development Testnet)</span>
                <Check className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-[10px] font-mono text-emerald-400">Chain ID: 11142220 &bull; Active SDK Target</div>
              <div className="text-[11px] text-slate-400 mt-1">RPC: https://forno.celo-sepolia.celo-testnet.org</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Explorer: sepolia.celoscan.io</div>
            </div>

            <div
              className="p-4 rounded-xl border bg-slate-950/40 border-slate-800 opacity-60 cursor-not-allowed"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-400">Celo Mainnet (Production)</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">Disabled</span>
              </div>
              <div className="text-[10px] font-mono text-slate-500">Chain ID: 42220</div>
              <div className="text-[11px] text-slate-500 mt-1">Mainnet execution disabled during testnet phase</div>
              <div className="text-[10px] text-slate-600 mt-0.5">Explorer: celoscan.io</div>
            </div>
          </div>
        </div>

        {/* AI Autonomy & Preferences */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
          <div className="pb-3 border-b border-slate-800">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>Simulated RFQ Negotiation Profile</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Heuristic weighting for mock quotation scoring and supplier comparison
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {[
              {
                id: 'conservative',
                title: 'Conservative',
                desc: 'Prioritizes rapid supplier delivery and top-tier SLA over discount depth.',
              },
              {
                id: 'balanced',
                title: 'Balanced (Recommended)',
                desc: 'Optimal tradeoff between price discount, delivery speed and vendor rating.',
              },
              {
                id: 'proactive',
                title: 'Aggressive Cost-Cutting',
                desc: 'Maximizes cUSD savings through bulk grouping and multi-round bidding.',
              },
            ].map((lvl) => (
              <div
                key={lvl.id}
                onClick={() => setAiAutonomy(lvl.id)}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  aiAutonomy === lvl.id
                    ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white">{lvl.title}</span>
                  {aiAutonomy === lvl.id && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{lvl.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onResetDemoData}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data to Initial State</span>
          </button>

          <button
            type="submit"
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition hover:scale-[1.02]"
          >
            <Save className="w-4 h-4 stroke-[2.5]" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
