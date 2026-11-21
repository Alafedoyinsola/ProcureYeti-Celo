'use client';

import React, { useState } from 'react';
import {
  Search,
  Plus,
  ShieldCheck,
  Clock,
  Star,
  Copy,
  Check,
  ExternalLink,
  Mail,
  Phone,
  LayoutGrid,
  List,
  Globe,
} from 'lucide-react';
import { Supplier } from '@/types';

interface SuppliersViewProps {
  suppliers: Supplier[];
  onOpenAddModal: () => void;
  onRequestQuote?: (supplier: Supplier) => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  suppliers,
  onOpenAddModal,
  onRequestQuote,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = Array.from(new Set(suppliers.map((s) => s.category)));

  const handleCopy = (address: string, id: string) => {
    navigator.clipboard.writeText(address);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredSuppliers = suppliers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.walletAddress.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Filter and Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by vendor name, category, contact, or wallet address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-teal-500 transition placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Grid / Table Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              title="Grid view"
              className={`p-1.5 rounded-lg text-xs transition ${
                viewMode === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Table view"
              className={`p-1.5 rounded-lg text-xs transition ${
                viewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 transition hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Vendor</span>
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSuppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-sm hover:border-slate-700 transition flex flex-col justify-between"
            >
              {/* Header */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-700 flex items-center justify-center font-bold text-white text-sm shadow-md">
                      {supplier.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm leading-tight">{supplier.name}</h4>
                      <span className="text-[11px] text-teal-400 font-medium">{supplier.category}</span>
                    </div>
                  </div>

                  {supplier.verificationStatus === 'verified' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>Verified [Demo]</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700/60">
                      <Clock className="w-3 h-3" />
                      <span>Pending [Demo]</span>
                    </span>
                  )}
                </div>

                {/* Rating & Country */}
                <div className="flex items-center justify-between text-xs text-slate-400 py-2 border-y border-slate-800/80 mb-3">
                  <div className="flex items-center gap-1 text-amber-400 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{supplier.rating.toFixed(1)}</span>
                    <span className="text-slate-500 font-normal">/ 5.0</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400">
                    <Globe className="w-3.5 h-3.5 text-slate-500" />
                    <span>{supplier.country}</span>
                  </div>
                </div>

                {/* Contact details */}
                <div className="space-y-1.5 text-xs text-slate-400 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-medium">{supplier.contactName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 hover:text-slate-200 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{supplier.phone}</span>
                  </div>
                </div>

                {/* Celo Payment Wallet Card */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 mb-4">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="font-semibold text-slate-300">Celo Settlement Address [Demo]</span>
                    <span className="text-[10px] font-mono text-emerald-400">Sepolia (11142220)</span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-xs text-emerald-400 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                    <span>
                      {supplier.walletAddress.slice(0, 8)}...{supplier.walletAddress.slice(-6)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopy(supplier.walletAddress, supplier.id)}
                        title="Copy Demo Address"
                        className="text-slate-400 hover:text-emerald-400 transition"
                      >
                        {copiedId === supplier.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <a
                        href={`https://celo-sepolia.blockscout.com/address/${supplier.walletAddress}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Inspect on Celo Sepolia Explorer"
                        className="text-slate-400 hover:text-emerald-400 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Metrics & Actions */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Demo Volume Authorized:</span>
                  <span className="font-bold text-white">
                    ${supplier.totalPaidCUSD.toLocaleString()}{' '}
                    <span className="text-emerald-400 font-normal">cUSD</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onRequestQuote && onRequestQuote(supplier)}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition"
                  >
                    Request Simulated Quote
                  </button>
                  <a
                    href={`https://celo-sepolia.blockscout.com/address/${supplier.walletAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-emerald-400 transition"
                    title="View Celo Sepolia Blockscout"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-x-auto rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Vendor Name</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Contact</th>
                <th className="px-4 py-3.5">Celo Demo Wallet</th>
                <th className="px-4 py-3.5">Demo Volume (cUSD)</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-5 py-4 font-bold text-white whitespace-nowrap">
                    {supplier.name}
                  </td>
                  <td className="px-4 py-4 text-teal-400">{supplier.category}</td>
                  <td className="px-4 py-4">
                    <div className="text-white font-medium">{supplier.contactName}</div>
                    <div className="text-[11px] text-slate-500">{supplier.email}</div>
                  </td>
                  <td className="px-4 py-4 font-mono text-emerald-400">
                    <div className="flex items-center gap-1.5">
                      <span>
                        {supplier.walletAddress.slice(0, 8)}...{supplier.walletAddress.slice(-6)}
                      </span>
                      <button
                        onClick={() => handleCopy(supplier.walletAddress, supplier.id)}
                        className="text-slate-400 hover:text-emerald-400"
                      >
                        {copiedId === supplier.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-bold text-white whitespace-nowrap">
                    ${supplier.totalPaidCUSD.toLocaleString()} cUSD
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {supplier.verificationStatus === 'verified' ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                        Verified [Demo]
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                        Pending [Demo]
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => onRequestQuote && onRequestQuote(supplier)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition"
                    >
                      Request Quote
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
