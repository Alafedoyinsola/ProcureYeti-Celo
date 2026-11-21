'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Search,
  Cpu,
  Layers,
} from 'lucide-react';
import { ActivityEvent } from '@/types';

interface ActivityViewProps {
  activity: ActivityEvent[];
}

export const ActivityView: React.FC<ActivityViewProps> = ({ activity }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const typeConfig: Record<
    ActivityEvent['type'],
    { label: string; icon: React.FC<{ className?: string }>; color: string }
  > = {
    ai_agent: {
      label: 'Simulated RFQ',
      icon: Sparkles,
      color: 'text-indigo-400 bg-indigo-950/60 border-indigo-700/50',
    },
    owner_approval: {
      label: 'Owner Demo Sign',
      icon: ShieldCheck,
      color: 'text-amber-400 bg-amber-950/60 border-amber-700/50',
    },
    demo_authorization: {
      label: 'Awaiting Execution',
      icon: CheckCircle2,
      color: 'text-emerald-400 bg-emerald-950/60 border-emerald-700/50 glow-celo',
    },
    policy_guardrail: {
      label: 'Policy Guardrail',
      icon: Layers,
      color: 'text-teal-400 bg-teal-950/60 border-teal-700/50',
    },
    request_created: {
      label: 'Requisition',
      icon: Cpu,
      color: 'text-slate-300 bg-slate-800 border-slate-700',
    },
  };

  const filteredActivity = activity.filter((item) => {
    const matchesFilter = filterType === 'all' || item.type === filterType;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.demoRef && item.demoRef.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search demo audit trail, actors, ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-emerald-500 transition placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: 'all', label: 'All Demo Events' },
            { id: 'ai_agent', label: 'Simulated RFQ' },
            { id: 'owner_approval', label: 'Owner Approvals' },
            { id: 'demo_authorization', label: 'Queued Executions' },
            { id: 'policy_guardrail', label: 'Guardrails' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilterType(btn.id)}
              className={`px-3 py-1.5 rounded-xl font-medium transition shrink-0 ${
                filterType === btn.id
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-sm">
        <div className="space-y-6">
          {filteredActivity.map((event) => {
            const meta = typeConfig[event.type] || typeConfig.request_created;
            const Icon = meta.icon;

            return (
              <div
                key={event.id}
                className="flex items-start gap-4 pb-6 border-b border-slate-800/80 last:border-0 last:pb-0"
              >
                <div
                  className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${meta.color}`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{event.title}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${meta.color}`}
                      >
                        {event.badge || meta.label}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">{event.timestamp}</span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">{event.description}</p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                    <span>Actor: <strong className="text-slate-300">{event.actor}</strong></span>

                    {event.amount && (
                      <>
                        <span>&bull;</span>
                        <span>Amount: <strong className="text-emerald-400">${event.amount.toLocaleString()} {event.currency}</strong></span>
                      </>
                    )}

                    {event.demoRef && (
                      <>
                        <span>&bull;</span>
                        <span className="font-mono text-emerald-400">
                          Demo Ref: {event.demoRef}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
