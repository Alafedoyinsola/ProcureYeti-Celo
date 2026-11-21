'use client';

import React, { useState } from 'react';
import { X, Building2, AlertCircle } from 'lucide-react';
import { Supplier } from '@/types';

interface AddSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (supplier: Omit<Supplier, 'id' | 'rating' | 'verificationStatus' | 'totalPaidCUSD'>) => void;
}

export const AddSupplierModal: React.FC<AddSupplierModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Hardware & IT');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 15 via Celo cUSD');
  const [country, setCountry] = useState('United States');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Supplier business name is required.');
      return;
    }
    if (!walletAddress.trim() || !walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      setError('Please provide a valid 42-character Celo wallet address starting with 0x.');
      return;
    }
    if (!email.trim()) {
      setError('Contact email is required.');
      return;
    }

    onSubmit({
      name: name.trim(),
      category,
      contactName: contactName.trim() || 'Procurement Rep',
      email: email.trim(),
      phone: phone.trim() || '+1 (555) 000-0000',
      walletAddress: walletAddress.trim(),
      paymentTerms,
      country,
    });

    setName('');
    setContactName('');
    setEmail('');
    setPhone('');
    setWalletAddress('');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Register Verified Vendor [Demo]</h3>
              <p className="text-xs text-slate-400">
                Register a vendor and link their Celo Sepolia / Mainnet demo address for automated settlement.
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Company / Vendor Name *</label>
            <input
              type="text"
              placeholder="e.g. Apex Silicon Global, DeepCloud Labs..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

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
              <label className="block font-semibold text-slate-300 mb-1.5">Country</label>
              <input
                type="text"
                placeholder="e.g. United States, Germany..."
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Celo Wallet Address */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-semibold text-slate-300">Celo Settlement Address (Demo) *</label>
              <span className="text-[10px] text-emerald-400 font-mono">Sepolia (11142220) / Mainnet</span>
            </div>
            <input
              type="text"
              placeholder="0x..."
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="w-full font-mono bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Contact Person</label>
              <input
                type="text"
                placeholder="e.g. Alex Morgan"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Contact Email *</label>
              <input
                type="email"
                placeholder="billing@vendor.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Payment Terms</label>
            <input
              type="text"
              placeholder="e.g. Net 15 via Celo cUSD, Instant on Delivery"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

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
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold transition shadow-lg shadow-teal-500/20"
            >
              Register Vendor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
