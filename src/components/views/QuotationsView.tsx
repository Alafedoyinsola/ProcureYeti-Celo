'use client';

import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Award,
} from 'lucide-react';
import { Quotation } from '@/types';
import { NavTab } from '../layout/Sidebar';

interface QuotationsViewProps {
  quotations: Quotation[];
  onAcceptQuote: (quoteId: string) => void;
  onNavigateTab: (tab: NavTab) => void;
}

export const QuotationsView: React.FC<QuotationsViewProps> = ({
  quotations,
  onAcceptQuote,
  onNavigateTab,
}) => {
  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulated Quotation Engine [Demo Mode]</span>
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Quotation Analysis & Multi-Vendor Comparison
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              <strong>Notice:</strong> Recommendations below use simulated rule-based heuristics (SLA, cost delta, vendor history)
              for hackathon demonstration purposes. In production, ProcureYeti connects live autonomous LLM agents to negotiate bids directly.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">
              Evaluated Bids: <strong className="text-white">{quotations.length} Active (Demo)</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Quotations List */}
      <div className="space-y-6">
        {quotations.map((quote) => (
          <div
            key={quote.id}
            className={`rounded-2xl border p-5 sm:p-6 transition shadow-sm ${
              quote.isAiRecommended
                ? 'bg-slate-900 border-indigo-500/50 shadow-indigo-500/5 ring-1 ring-indigo-500/20'
                : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-400">{quote.id}</span>
                  <span className="text-slate-600">&bull;</span>
                  <span className="text-xs font-medium text-slate-400">Requisition:</span>
                  <span className="font-bold text-white text-sm truncate">{quote.requestTitle}</span>

                  {quote.isAiRecommended && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-[11px]">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      <span>Simulated Recommendation [Demo]</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span>Vendor: <strong className="text-white">{quote.supplierName}</strong></span>
                  <span>&bull;</span>
                  <span className="font-mono text-slate-400">
                    {quote.supplierAddress.slice(0, 6)}...{quote.supplierAddress.slice(-4)} (Demo)
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    Delivery SLA: {quote.deliveryDays} business days
                  </span>
                </div>
              </div>

              {/* Price & Action */}
              <div className="flex items-center justify-between lg:justify-end gap-6 shrink-0">
                <div className="text-right">
                  <div className="text-[11px] text-slate-500">Quoted Price</div>
                  <div className="text-2xl font-extrabold text-white">
                    ${quote.amount.toLocaleString()}{' '}
                    <span className="text-xs text-emerald-400 font-semibold">{quote.currency}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">Heuristic Score: {quote.aiScore}% (Demo)</div>
                </div>

                {quote.status === 'pending' ? (
                  <button
                    onClick={() => {
                      onAcceptQuote(quote.id);
                      onNavigateTab('approvals');
                    }}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 shadow-md ${
                      quote.isAiRecommended
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Select & Route to Approval</span>
                  </button>
                ) : (
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-semibold">
                    Routed to Approval
                  </span>
                )}
              </div>
            </div>

            {/* AI Reasoning and Insights */}
            <div className="mt-4 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-300">Sentinel Price &amp; SLA Heuristic [Deterministic]:</span>
                    {quote.amount > 3000 ? (
                      <span className="px-2 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                        Price Warning: High Outlier
                      </span>
                    ) : (
                      <span className="px-2 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                        Fair Market Spread
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">{quote.notes}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-400">
                  Sentinel Score: {quote.aiScore}/100
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
