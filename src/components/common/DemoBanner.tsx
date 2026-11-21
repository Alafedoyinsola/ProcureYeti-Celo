'use client';

import React from 'react';
import { RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';

interface DemoBannerProps {
  onReset?: () => void;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ onReset }) => {
  return (
    <div className="bg-gradient-to-r from-emerald-950/50 via-slate-900 to-indigo-950/50 border-b border-emerald-500/30 px-4 py-2 text-xs text-slate-300">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-emerald-400 tracking-wide uppercase text-[11px]">
            Hackathon Demo Mode
          </span>
          <span className="text-slate-400 hidden sm:inline">•</span>
          <span className="text-slate-200 hidden sm:inline">
            Target Networks: <strong className="text-emerald-400">Celo Sepolia (Chain ID 11142220)</strong> [Dev] &bull;{' '}
            <strong className="text-white">Celo Mainnet (Chain ID 42220)</strong> [Final]
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Policy: <strong>$500 cUSD</strong> Auto-Cap (Demo)</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-300 text-[11px] hidden md:flex">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Simulated Heuristics &bull; No Real Funds Moved</span>
          </div>

          {onReset && (
            <button
              onClick={onReset}
              title="Reset sample data to initial state"
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition text-[11px]"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span>Reset Demo Data</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
