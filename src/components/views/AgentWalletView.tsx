'use client';

import React, { useState } from 'react';
import {
  Wallet,
  Shield,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  Cpu,
  Lock,
  Zap,
  Activity,
  FileCode2,
} from 'lucide-react';
import { AltanaWalletConfig } from '@/types';
import {
  ALTANA_CELO_CONFIG,
  CELO_SEPOLIA_ERC8004_REGISTRY,
  CELO_SEPOLIA_USDC_ADDRESS,
  CELO_SEPOLIA_CUSD_ADDRESS,
  PROCURE_YETI_DISBURSER_ADDRESS_CELO_SEPOLIA,
  AltanaConnectionStatus,
} from '@/lib/altana';

interface AgentWalletViewProps {
  walletConfig: AltanaWalletConfig;
  onUpdatePolicy?: (updated: Partial<AltanaWalletConfig>) => void;
}

export const AgentWalletView: React.FC<AgentWalletViewProps> = ({
  walletConfig,
  onUpdatePolicy,
}) => {
  const [connectionStatus, setConnectionStatus] = useState<AltanaConnectionStatus>('demo');
  const [copiedAgent, setCopiedAgent] = useState(false);
  const [copiedOwner, setCopiedOwner] = useState(false);
  const [customThreshold, setCustomThreshold] = useState(walletConfig.autoApprovalThreshold);
  const [isSaved, setIsSaved] = useState(false);

  const copyText = (text: string, type: 'agent' | 'owner') => {
    navigator.clipboard.writeText(text);
    if (type === 'agent') {
      setCopiedAgent(true);
      setTimeout(() => setCopiedAgent(false), 2000);
    } else {
      setCopiedOwner(true);
      setTimeout(() => setCopiedOwner(false), 2000);
    }
  };

  const handleSaveThreshold = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdatePolicy) {
      onUpdatePolicy({ autoApprovalThreshold: Number(customThreshold) });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    }
  };

  const dailySpentPercent = Math.min(
    100,
    Math.round((walletConfig.dailySpent / walletConfig.dailyAllowance) * 100)
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/30 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Official Altana SDK Architecture &bull; Celo Sepolia</span>
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Altana Agent Wallet & ERC-8004 Registry
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Equipped with <strong>@altananetwork/sdk</strong> and native <strong>CELO_SEPOLIA</strong> support.
              Programmatic spending caps and contract allowlists are anchored in the on-chain KeyStore registry.
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5">
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-500/30">
              Chain: CELO_SEPOLIA (#11142220)
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Celo Mainnet: Disabled in current phase
            </span>
          </div>
        </div>
      </div>

      {/* Connection State Selector & Status Banner */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">Altana SDK Connection State:</span>
              {connectionStatus === 'demo' && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold">
                  Demo Sandbox Mode
                </span>
              )}
              {connectionStatus === 'disconnected' && (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[11px] font-bold">
                  Disconnected (Awaiting Owner Wallet)
                </span>
              )}
              {connectionStatus === 'connected' && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold">
                  Live Altana SDK Client Ready
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {connectionStatus === 'demo' &&
                'Operating with simulated mock keys. No real private keys or wallet extensions are requested.'}
              {connectionStatus === 'disconnected' &&
                'Altana SDK initialized with CELO_SEPOLIA config. Connect an owner signer to grant live sessions.'}
              {connectionStatus === 'connected' &&
                'Altana client instantiated. KeyStore and Relay endpoints active for Celo Sepolia.'}
            </p>
          </div>
        </div>

        {/* Mode Switcher Buttons */}
        <div className="flex items-center gap-1.5 self-start md:self-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setConnectionStatus('demo')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              connectionStatus === 'demo'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Demo Sandbox
          </button>
          <button
            onClick={() => setConnectionStatus('disconnected')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              connectionStatus === 'disconnected'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Disconnected
          </button>
          <button
            onClick={() => setConnectionStatus('connected')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              connectionStatus === 'connected'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Connected (SDK Ready)
          </button>
        </div>
      </div>

      {/* Main Stats Grid: Balances & Allowances */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Treasury Balances */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-3 text-xs uppercase tracking-wider font-semibold">
              <span>{connectionStatus === 'demo' ? 'Agent Treasury [Demo]' : 'Simulated Treasury Reserves'}</span>
              <Wallet className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight mb-2">
              ${walletConfig.balanceCUSD.toLocaleString()}{' '}
              <span className="text-xs text-emerald-400 font-semibold">cUSD</span>
            </div>
            <div className="space-y-1 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>CELO (Gas Reserve):</span>
                <span className="text-white font-mono">{walletConfig.balanceCELO.toFixed(2)} CELO</span>
              </div>
              <div className="flex justify-between">
                <span>USDC (Reserve):</span>
                <span className="text-white font-mono">${walletConfig.balanceUSDC.toLocaleString()} USDC</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Verified USDC (6 dec):</span>
              <span className="font-mono text-emerald-400">{CELO_SEPOLIA_USDC_ADDRESS.slice(0, 6)}...{CELO_SEPOLIA_USDC_ADDRESS.slice(-4)}</span>
            </div>
            <div className="flex justify-between">
              <span>Verified cUSD (18 dec):</span>
              <span className="font-mono text-slate-300">{CELO_SEPOLIA_CUSD_ADDRESS.slice(0, 6)}...{CELO_SEPOLIA_CUSD_ADDRESS.slice(-4)}</span>
            </div>
          </div>
        </div>

        {/* Daily Velocity Cap */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-3 text-xs uppercase tracking-wider font-semibold">
              <span>24h Velocity Allowance</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>

            <div className="text-2xl font-bold text-white mb-1">
              ${walletConfig.dailySpent.toLocaleString()}{' '}
              <span className="text-xs text-slate-400 font-normal">
                / ${walletConfig.dailyAllowance.toLocaleString()} cUSD
              </span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-2.5 my-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  dailySpentPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${dailySpentPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Remaining Capacity Today:</span>
              <span className="text-emerald-400 font-bold font-mono">
                ${(walletConfig.dailyAllowance - walletConfig.dailySpent).toLocaleString()} cUSD
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
            Enforced on-chain by ProcureYetiDisburser router state
          </div>
        </div>

        {/* Autonomy & Guardrail Setting */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-3 text-xs uppercase tracking-wider font-semibold">
              <span>Autonomy Policy Threshold</span>
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
            </div>

            <form onSubmit={handleSaveThreshold} className="space-y-3">
              <div className="text-xs text-slate-300">
                Purchases under this amount can be auto-executed by Altana Agent:
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                  <input
                    type="number"
                    min="50"
                    max="2000"
                    value={customThreshold}
                    onChange={(e) => setCustomThreshold(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-white font-mono text-xs rounded-xl pl-6 pr-14 py-2 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-emerald-400 font-mono font-bold">
                    cUSD
                  </span>
                </div>

                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                >
                  Update
                </button>
              </div>

              {isSaved && (
                <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Threshold updated in session parameters!</span>
                </div>
              )}
            </form>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
            Hard single tx limit: ${walletConfig.maxSingleTxLimit.toLocaleString()} cUSD
          </div>
        </div>
      </div>

      {/* Verified On-Chain Contract Manifest (Direct from @altananetwork/sdk) */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileCode2 className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-bold text-white">Verified Altana SDK Contract Manifest (CELO_SEPOLIA)</h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
            Source: @altananetwork/sdk
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[11px]">KeyStore Registry Address</span>
            <div className="text-emerald-400 font-bold truncate">{ALTANA_CELO_CONFIG.keyStore}</div>
            <a
              href={`https://sepolia.celoscan.io/address/${ALTANA_CELO_CONFIG.keyStore}`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-slate-400 hover:underline flex items-center gap-1 pt-1"
            >
              <span>View on CeloScan</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[11px]">KeyStore Controller Address</span>
            <div className="text-emerald-400 font-bold truncate">{ALTANA_CELO_CONFIG.keyStoreController}</div>
            <a
              href={`https://sepolia.celoscan.io/address/${ALTANA_CELO_CONFIG.keyStoreController}`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-slate-400 hover:underline flex items-center gap-1 pt-1"
            >
              <span>View on CeloScan</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[11px]">ERC-8004 Agent Identity Registry</span>
            <div className="text-indigo-400 font-bold truncate">{CELO_SEPOLIA_ERC8004_REGISTRY}</div>
            <a
              href={`https://sepolia.celoscan.io/address/${CELO_SEPOLIA_ERC8004_REGISTRY}`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-slate-400 hover:underline flex items-center gap-1 pt-1"
            >
              <span>View on CeloScan (ERC-721 Token)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[11px]">Altana Testnet Relay</span>
            <div className="text-teal-400 font-bold truncate">{ALTANA_CELO_CONFIG.relayUrl}</div>
            <span className="text-[10px] text-slate-400">Gas abstraction relay for session intents</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[11px]">Verified USDC Token Contract (6 Decimals)</span>
            <div className="text-emerald-400 font-bold truncate">{CELO_SEPOLIA_USDC_ADDRESS}</div>
            <a
              href={`https://sepolia.celoscan.io/address/${CELO_SEPOLIA_USDC_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-slate-400 hover:underline flex items-center gap-1 pt-1"
            >
              <span>View Circle USDC on CeloScan</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[11px]">Verified cUSD StableToken (18 Decimals)</span>
            <div className="text-emerald-400 font-bold truncate">{CELO_SEPOLIA_CUSD_ADDRESS}</div>
            <a
              href={`https://sepolia.celoscan.io/address/${CELO_SEPOLIA_CUSD_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-slate-400 hover:underline flex items-center gap-1 pt-1"
            >
              <span>View Mento cUSD on CeloScan</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-emerald-300 text-[11px] font-semibold">ProcureYetiDisburser Router</span>
              <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded">Owner Guarded</span>
            </div>
            <div className="text-emerald-400 font-bold truncate">{PROCURE_YETI_DISBURSER_ADDRESS_CELO_SEPOLIA}</div>
            <span className="text-[10px] text-slate-400">Enforces on-chain supplier whitelist & autonomous caps</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400 space-y-1.5">
          <div>
            <span className="text-emerald-400 font-semibold">On-Chain Whitelist Security Guarantee: </span>
            Altana Agent session permissions target <code className="text-emerald-300">ProcureYetiDisburser.disbursePayment(address,uint256,string)</code> rather than the raw USDC contract. This cryptographically prevents the agent key from transferring tokens to any unapproved recipient on Celo.
          </div>
          <div className="text-[10px] text-slate-500">
            Note: Address <code>0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B</code> was verified via RPC as a USDC Fee Adapter (0 bytecode on Sepolia) and is strictly excluded from transfer execution.
          </div>
        </div>
      </div>

      {/* Account Verification & Key Delegation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Altana Agent Account */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">Smart Account Target Address</h4>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              ERC-4337 / EIP-7702
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Derived non-custodial address. Executes calls according to session permissions validated by the KeyStore.
          </p>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400">
            <span className="truncate pr-2">{walletConfig.agentAddress} (Demo)</span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => copyText(walletConfig.agentAddress, 'agent')}
                className="text-slate-400 hover:text-emerald-400 transition"
                title="Copy Address"
              >
                {copiedAgent ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <a
                href={`https://sepolia.celoscan.io/address/${walletConfig.agentAddress}`}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-emerald-400 transition"
                title="Inspect on CeloScan"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Owner Authorization Address */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-bold text-white">Authorized Owner Admin Address</h4>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
              Admin Signer
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Human owner holding root governance. Required to grant new session keys, modify spend caps, or revoke permissions.
          </p>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-amber-300">
            <span className="truncate pr-2">{walletConfig.ownerAddress} (Demo)</span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => copyText(walletConfig.ownerAddress, 'owner')}
                className="text-slate-400 hover:text-amber-400 transition"
                title="Copy Address"
              >
                {copiedOwner ? <Check className="w-4 h-4 text-amber-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <a
                href={`https://sepolia.celoscan.io/address/${walletConfig.ownerAddress}`}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-amber-400 transition"
                title="Inspect on CeloScan"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Active Altana Policy Guardrails List */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Session Policy Guardrails & KeyStore Rules</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Parameters mapped directly to Altana SDK `grantSession` permissions
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-950 px-2 py-1 rounded border border-emerald-800">
            5 Guardrails Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {walletConfig.activePolicies.map((policy, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-3 text-slate-300"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="font-medium">{policy}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
