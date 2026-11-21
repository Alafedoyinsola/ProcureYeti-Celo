'use client';

import React, { useState } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import { PurchaseRequest, CurrencyType } from '@/types';

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: Omit<PurchaseRequest, 'id' | 'createdAt' | 'status' | 'requestedBy'>) => void;
}

export const CreateRequestModal: React.FC<CreateRequestModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Hardware & IT');
  const [quantity, setQuantity] = useState(1);
  const [estimatedBudget, setEstimatedBudget] = useState<number | ''>('');
  const [currency, setCurrency] = useState<CurrencyType>('cUSD');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [justification, setJustification] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Item title is required.');
      return;
    }
    if (!estimatedBudget || Number(estimatedBudget) <= 0) {
      setError('Please provide a valid estimated budget.');
      return;
    }
    if (!deliveryDate) {
      setError('Target delivery date is required.');
      return;
    }

    onSubmit({
      title: title.trim(),
      category,
      quantity: Number(quantity) || 1,
      estimatedBudget: Number(estimatedBudget),
      currency,
      deliveryDate,
      department,
      justification: justification.trim() || 'General operations requisition',
    });

    // Reset fields
    setTitle('');
    setEstimatedBudget('');
    setQuantity(1);
    setJustification('');
    setError('');
    onClose();
  };

  const categories = [
    'Hardware & IT',
    'Cloud & Infrastructure',
    'Packaging & Logistics',
    'Office & Facilities',
    'Professional Services',
    'Security & Compliance',
  ];

  const departments = ['Engineering', 'Operations', 'DevOps & AI', 'Marketing', 'Legal & Finance'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Create Purchase Request [Demo]</h3>
              <p className="text-xs text-slate-400">
                ProcureYeti AI will evaluate simulated quotation options and check Altana policy limits.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Item Name */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">
              Item or Service Name *
            </label>
            <input
              type="text"
              placeholder="e.g. MacBook Pro M3 Workstations, Docker GPU Cluster..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {/* Category & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity, Budget & Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Quantity</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Est. Budget *</label>
              <input
                type="number"
                step="any"
                min="1"
                placeholder="0.00"
                value={estimatedBudget}
                onChange={(e) => setEstimatedBudget(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Currency (Celo)</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
              >
                <option value="cUSD">cUSD</option>
                <option value="CELO">CELO</option>
                <option value="USDC">USDC</option>
              </select>
            </div>
          </div>

          {/* Delivery Date */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Target Delivery Date *</label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {/* Business Justification */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">
              Business Justification & Requirements
            </label>
            <textarea
              rows={2}
              placeholder="Describe requirements or SLA for simulated quotation matching..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Policy Notice Box */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400">
            <span className="text-emerald-400 font-semibold">Altana Policy Note (Demo):</span>{' '}
            Requests under $500 cUSD qualify for simulated autonomous agent processing.
            Requests exceeding $500 will require owner cryptographic sign-off in the Approval Centre.
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold transition shadow-lg shadow-emerald-500/20"
            >
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
