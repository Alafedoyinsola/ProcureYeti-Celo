'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Building,
  DollarSign,
  Info,
  Copy,
  Check,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';
import { PurchaseRequest, Supplier, Quotation } from '@/types';
import {
  deriveMandateId,
  buildCreateMandateCall,
  PROCURE_YETI_DISBURSER_ADDRESS,
} from '@/lib/altana/disburser';
import {
  runSentinelInvestigation,
  createDecisionReceipt,
  type SentinelInvestigation,
  type AuditableDecisionReceipt,
  type DecisionAction,
} from '@/lib/sentinel/investigation';
import { type Address, isAddress } from 'viem';

interface PurchaseMandateModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: PurchaseRequest | null;
  allRequests: PurchaseRequest[];
  suppliers: Supplier[];
  quotations: Quotation[];
  onCommitDecision: (
    receipt: AuditableDecisionReceipt,
    mandateData?: {
      mandateId: `0x${string}`;
      maxAmount: number;
      expiry: string;
      supplierAddress: Address;
    }
  ) => void;
}

export const PurchaseMandateModal: React.FC<PurchaseMandateModalProps> = ({
  isOpen,
  onClose,
  request,
  allRequests,
  suppliers,
  quotations,
  onCommitDecision,
}) => {
  const [activeTab, setActiveTab] = useState<'review' | 'sentinel_audit' | 'receipt'>('review');
  const [maxAmountUSDC, setMaxAmountUSDC] = useState<number | ''>('');
  const [expiryOption, setExpiryOption] = useState<'24h' | '48h' | '7d' | '30d'>('24h');
  const [copiedId, setCopiedId] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<DecisionAction | null>(null);
  const [clarificationText, setClarificationText] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [generatedReceipt, setGeneratedReceipt] = useState<AuditableDecisionReceipt | null>(null);

  // Run deterministic Sentinel Investigation
  const investigation: SentinelInvestigation | null = useMemo(() => {
    if (!request) return null;
    return runSentinelInvestigation(request, allRequests, suppliers, quotations);
  }, [request, allRequests, suppliers, quotations]);

  // Supplier info
  const matchedSupplier = useMemo(() => {
    if (!request) return null;
    return (
      suppliers.find(
        (s) =>
          s.name.toLowerCase() === request.aiRecommendation?.suggestedSupplier?.toLowerCase() ||
          s.category === request.category
      ) || suppliers[0]
    );
  }, [request, suppliers]);

  const quotedAmount = request?.aiRecommendation?.bestPrice || request?.estimatedBudget || 0;
  const currentMaxAmount = maxAmountUSDC === '' ? quotedAmount : Number(maxAmountUSDC);

  // Pure baseline timestamp captured once via state initializer
  const [nowSec] = useState(() => Math.floor(Date.now() / 1000));

  // Expiry calculation
  const expiryTimestamp = useMemo(() => {
    switch (expiryOption) {
      case '24h':
        return nowSec + 86400;
      case '48h':
        return nowSec + 172800;
      case '7d':
        return nowSec + 604800;
      case '30d':
        return nowSec + 2592000;
    }
  }, [expiryOption, nowSec]);

  const supplierAddress: Address | null =
    matchedSupplier?.walletAddress && isAddress(matchedSupplier.walletAddress)
      ? matchedSupplier.walletAddress
      : null;

  // Derive a mandate ID only when a valid supplier wallet exists.
  const mandateId: `0x${string}` = useMemo<`0x${string}`>(() => {
    if (!request || !supplierAddress) {
      return (`0x${'0'.repeat(64)}`) as `0x${string}`;
    }

    return deriveMandateId(request.id, supplierAddress) as `0x${string}`;
  }, [request, supplierAddress]);

  // Build a preview only when all required addresses are configured and valid.
  const preparedCallPreview = useMemo(() => {
    const disburserAddress = PROCURE_YETI_DISBURSER_ADDRESS;

    if (
      !request ||
      !supplierAddress ||
      !disburserAddress ||
      !isAddress(disburserAddress)
    ) {
      return null;
    }

    try {
      return buildCreateMandateCall({
        mandateId,
        supplierAddress,
        maxAmountUSDC: currentMaxAmount,
        requisitionId: request.id,
        expiryTimestamp,
        disburserAddress,
      });
    } catch {
      return null;
    }
  }, [
    request,
    mandateId,
    supplierAddress,
    currentMaxAmount,
    expiryTimestamp,
  ]);
  // Validation rules
  const validationErrors: string[] = useMemo(() => {
    const errors: string[] = [];
    if (!request) return errors;

    if (!supplierAddress || !isAddress(supplierAddress)) {
      errors.push('Supplier wallet address must be a valid 42-character hex address.');
    }
    if (matchedSupplier?.verificationStatus !== 'verified') {
      errors.push('Supplier must be marked verified on Celo allowlist prior to mandate issuance.');
    }
    if (currentMaxAmount <= 0) {
      errors.push('Maximum authorized amount must be greater than zero.');
    }
    if (currentMaxAmount > 2500) {
      errors.push('Amount exceeds $2,500 single transaction ceiling enforced by ProcureYetiDisburser.sol.');
    }
    if (expiryTimestamp <= nowSec) {
      errors.push('Mandate expiration must be set in the future.');
    }

    // Check duplicate active mandate
    const existingMandate = allRequests.find(
      (r) => r.id === request.id && r.mandateStatus === 'active'
    );
    if (existingMandate) {
      errors.push(`An active mandate (${existingMandate.mandateId?.slice(0, 10)}...) is already registered for this requisition.`);
    }

    return errors;
  }, [request, supplierAddress, matchedSupplier, currentMaxAmount, expiryTimestamp, nowSec, allRequests]);

  const isValid = validationErrors.length === 0;

  if (!isOpen || !request || !investigation) return null;

  const handleCopyMandateId = () => {
    navigator.clipboard.writeText(mandateId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleExecuteAction = (action: DecisionAction) => {
    if (
      action === 'approve_and_generate_mandate' &&
      (!supplierAddress || !preparedCallPreview)
    ) {
      return;
    }

    setActionInProgress(action);

    const approvalData =
      action === 'approve_and_generate_mandate'
        ? {
            mandateId,
            maxAmount: currentMaxAmount,
            expiry: new Date(expiryTimestamp * 1000).toISOString(),
            supplierAddress: supplierAddress as Address,
          }
        : undefined;

    const receipt = createDecisionReceipt({
      requisitionId: request.id,
      action,
      decisionMaker: 'Elena Vance (Owner)',
      mandateId: approvalData ? mandateId : undefined,
      maxAuthorisedUSDC: approvalData ? currentMaxAmount : undefined,
      supplierAddress: approvalData?.supplierAddress,
      clarificationNote: action === 'request_clarification' ? clarificationText : undefined,
      rejectionReason: action === 'reject' ? rejectionReason : undefined,
      triggeredRules: investigation.ruleEvaluations
        .filter((r) => !r.passed)
        .map((r) => r.ruleId),
    });

    setGeneratedReceipt(receipt);
    onCommitDecision(receipt, approvalData);
    setActiveTab('receipt');
    setActionInProgress(null);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Purchase Mandate Review &amp; Authorization
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-800 text-amber-400 font-bold border border-slate-700">
                  {request.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                ProcureYeti Sentinel: Replace broad agent payment authority with owner-created, purchase-specific on-chain mandates.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-800 bg-slate-950/30 text-xs">
          <button
            onClick={() => setActiveTab('review')}
            className={`px-3 py-2 font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'review'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Mandate Parameters &amp; Call Preview</span>
          </button>

          <button
            onClick={() => setActiveTab('sentinel_audit')}
            className={`px-3 py-2 font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'sentinel_audit'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-indigo-400" />
            <span>Sentinel Risk Audit &amp; Investigation</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                investigation.riskLevel === 'low'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : investigation.riskLevel === 'medium'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-red-500/20 text-red-300'
              }`}
            >
              Risk: {investigation.riskScore}/100
            </span>
          </button>

          {generatedReceipt && (
            <button
              onClick={() => setActiveTab('receipt')}
              className={`px-3 py-2 font-semibold border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'receipt'
                  ? 'border-teal-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
              <span>Auditable Decision Receipt</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {activeTab === 'review' && (
            <>
              {/* Validation Errors Alert */}
              {validationErrors.length > 0 && (
                <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-red-400 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Mandate Pre-Flight Validation Issues:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-red-300">
                    {validationErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Core Requisition & Supplier Meta */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Purchase Summary */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      Requisition Summary
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                      {request.department}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white">{request.title}</div>
                  <div className="text-slate-400 text-[11px] leading-relaxed">
                    <strong>Justification:</strong> {request.justification || 'General departmental purchase.'}
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Requested by:</span>
                    <span className="text-slate-300 font-medium">{request.requestedBy}</span>
                  </div>
                </div>

                {/* Approved Supplier Detail */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      Approved Supplier Target
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        matchedSupplier?.verificationStatus === 'verified'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {matchedSupplier?.verificationStatus === 'verified' ? 'Verified on Celo' : 'Verification Pending'}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-slate-400" />
                    <span>{matchedSupplier?.name}</span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-400 bg-slate-900 p-2 rounded-lg break-all border border-slate-800">
                    {supplierAddress}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Payment Terms: {matchedSupplier?.paymentTerms || 'Net 30'}</span>
                    <span>Rating: {matchedSupplier?.rating || 4.9} / 5.0</span>
                  </div>
                </div>
              </div>

              {/* Financial Parameters & Mandate Limits */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white text-xs">Mandate Spending Governance</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Router Cap: $2,500 USDC / Tx
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Quoted Best Price */}
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 text-[10px]">Quoted Amount</span>
                    <div className="text-lg font-bold text-white mt-0.5">
                      ${quotedAmount.toLocaleString()} <span className="text-xs text-emerald-400">USDC</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Best competitive quote</span>
                  </div>

                  {/* Authorized Mandate Max Amount (Editable) */}
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <label className="text-slate-400 text-[10px] font-semibold block mb-1">
                      Max Authorised Mandate Limit *
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                      <input
                        type="number"
                        min="1"
                        max="2500"
                        value={maxAmountUSDC === '' ? quotedAmount : maxAmountUSDC}
                        onChange={(e) => setMaxAmountUSDC(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-6 pr-12 py-1.5 text-white font-bold text-sm focus:outline-none focus:border-emerald-500"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-emerald-400 font-semibold">
                        USDC
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">Contract hard cap: $2,500</span>
                  </div>

                  {/* Expiry Selector */}
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <label className="text-slate-400 text-[10px] font-semibold block mb-1">
                      Mandate Expiry Window
                    </label>
                    <select
                      value={expiryOption}
                      onChange={(e) => setExpiryOption(e.target.value as '24h' | '48h' | '7d' | '30d')}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-medium text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="24h">24 Hours (Recommended)</option>
                      <option value="48h">48 Hours</option>
                      <option value="7d">7 Days</option>
                      <option value="30d">30 Days</option>
                    </select>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Expires: {new Date(expiryTimestamp * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Budget Impact Gauge */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">
                      {investigation.budgetImpact.department} Monthly Budget Utilization:
                    </span>
                    <span className="font-mono text-slate-200">
                      ${investigation.budgetImpact.projectedSpend.toLocaleString()} / ${investigation.budgetImpact.monthlyDepartmentBudget.toLocaleString()} USDC ({investigation.budgetImpact.budgetUtilizationPctAfter}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        investigation.budgetImpact.budgetUtilizationPctAfter > 100
                          ? 'bg-red-500'
                          : investigation.budgetImpact.budgetUtilizationPctAfter > 75
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, investigation.budgetImpact.budgetUtilizationPctAfter)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* On-Chain Call & Calldata Preview */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-white text-xs">On-Chain Mandate Call Preparation</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500">Unique Mandate ID:</span>
                    <button
                      onClick={handleCopyMandateId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-amber-300 hover:bg-slate-800"
                    >
                      <span>{mandateId.slice(0, 10)}...{mandateId.slice(-6)}</span>
                      {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 font-mono text-[11px] text-slate-300 space-y-1">
                  <div className="text-slate-500">{'// ProcureYetiDisburser.createMandate:'}</div>
                  <div>
                    <span className="text-amber-400">target:</span>{' '}
                    <span>{PROCURE_YETI_DISBURSER_ADDRESS || 'Not configured'}</span>
                  </div>
                  <div>
                    <span className="text-amber-400">signature:</span>{' '}
                    <span>createMandate(bytes32,address,uint256,string,uint256)</span>
                  </div>
                  <div>
                    <span className="text-amber-400">mandateId:</span> <span>{mandateId}</span>
                  </div>
                  <div>
                    <span className="text-amber-400">supplier:</span> <span>{supplierAddress}</span>
                  </div>
                  <div>
                    <span className="text-amber-400">maxAmount:</span>{' '}
                    <span>{(currentMaxAmount * 1_000_000).toLocaleString()} (6 decimals)</span>
                  </div>
                  <div>
                    <span className="text-amber-400">requisitionId:</span> <span>&quot;{request.id}&quot;</span>
                  </div>
                  <div>
                    <span className="text-amber-400">expiry:</span> <span>{expiryTimestamp}</span>
                  </div>
                  {preparedCallPreview && preparedCallPreview.data && (
                    <div className="pt-2 border-t border-slate-800/60 text-[10px] text-slate-500 break-all">
                      <span className="text-amber-400">calldata:</span> {preparedCallPreview.data.slice(0, 74)}...
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>
                    Prepares owner transaction for the Celo Sepolia disburser router. Does NOT claim on-chain commitment until confirmed transaction receipt.
                  </span>
                </div>
              </div>

              {/* Optional Decision Note */}
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-semibold text-slate-400">
                  Decision Note / Clarification Instruction (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Please provide itemized invoice and competitive quotation breakdown..."
                  value={clarificationText}
                  onChange={(e) => {
                    setClarificationText(e.target.value);
                    setRejectionReason(e.target.value);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExecuteAction('reject')}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-red-950 hover:text-red-300 text-slate-400 border border-slate-700 transition"
                  >
                    Reject Requisition
                  </button>

                  <button
                    onClick={() => handleExecuteAction('request_clarification')}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1.5"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Request Clarification</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {investigation.recommendation === 'escalate_to_multisig' && (
                    <button
                      onClick={() => handleExecuteAction('escalate_to_multisig')}
                      className="px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 font-bold transition flex items-center gap-1.5"
                    >
                      <ShieldAlert className="w-4 h-4 text-indigo-400" />
                      <span>Escalate to Multi-Sig</span>
                    </button>
                  )}

                  <button
                    disabled={!isValid || actionInProgress !== null}
                    onClick={() => handleExecuteAction('approve_and_generate_mandate')}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold shadow-md shadow-emerald-500/20 transition hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100 flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                    <span>Sign &amp; Generate Purchase Mandate</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Sentinel Investigation Audit Tab */}
          {activeTab === 'sentinel_audit' && (
            <div className="space-y-4">
              {/* Scorecard Banner */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  investigation.riskLevel === 'low'
                    ? 'bg-emerald-950/40 border-emerald-500/40'
                    : investigation.riskLevel === 'medium'
                    ? 'bg-amber-950/40 border-amber-500/40'
                    : 'bg-red-950/40 border-red-500/40'
                }`}
              >
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Sentinel Procurement Risk Score
                  </div>
                  <div className="text-xl font-extrabold text-white flex items-center gap-2">
                    <span>{investigation.riskScore} / 100</span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        investigation.riskLevel === 'low'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : investigation.riskLevel === 'medium'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      {investigation.riskLevel} Risk
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 max-w-xl">{investigation.recommendationText}</p>
                </div>

                <div className="text-right text-[10px] text-slate-400 space-y-0.5">
                  <div>Evaluated: {new Date(investigation.evaluatedAt).toLocaleTimeString()}</div>
                  <div>Engine: Deterministic Policy Rules</div>
                  <div className="text-emerald-400 font-mono">No Black-Box AI Hallucinations</div>
                </div>
              </div>

              {/* Rule Evaluations List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300">Deterministic Policy Rule Results:</span>
                {investigation.ruleEvaluations.map((rule) => (
                  <div
                    key={rule.ruleId}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-amber-400">{rule.ruleId}</span>
                        <span className="text-slate-600">&bull;</span>
                        <span className="font-bold text-white text-xs">{rule.ruleName}</span>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">{rule.description}</p>
                    </div>

                    <div className="shrink-0 text-right">
                      {rule.passed ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                          <Check className="w-3 h-3" />
                          <span>Passed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-400 text-xs font-bold px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30">
                          <AlertTriangle className="w-3 h-3" />
                          <span>+{rule.scoreImpact} Risk</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Duplicate & Quotation Detailed Findings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-white text-xs">Duplicate Requisition Scan:</div>
                  <p className="text-slate-400 text-[11px]">
                    {investigation.duplicateCheck.hasDuplicate
                      ? `Flagged: Found ${investigation.duplicateCheck.duplicateCount} duplicate match(es): ${investigation.duplicateCheck.matchingRequestIds.join(', ')}.`
                      : 'Zero duplicate purchases found in past 30 days.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-white text-xs">Price &amp; Quotation Analysis:</div>
                  <p className="text-slate-400 text-[11px]">
                    {investigation.priceInvestigation.quoteComparisonNotes} Variance vs budget:{' '}
                    <span className={investigation.priceInvestigation.isSuspicious ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {investigation.priceInvestigation.variancePercentage}%
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Auditable Decision Receipt Tab */}
          {activeTab === 'receipt' && generatedReceipt && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="font-bold text-white text-sm">Auditable Decision Receipt Generated</span>
                </div>
                <p className="text-xs text-emerald-300">
                  Owner decision has been cryptographically recorded. Status is Prepared / Awaiting On-Chain Settlement.
                  No live funds are transferred until the transaction is confirmed on Celo.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2 text-slate-300">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-500">Receipt ID:</span>
                  <span className="text-white font-bold">{generatedReceipt.receiptId}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-500">Receipt Cryptographic Hash:</span>
                  <span className="text-emerald-400 text-[11px]">{generatedReceipt.receiptHash}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-500">Action:</span>
                  <span className="text-amber-400 font-bold uppercase">{generatedReceipt.action}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-500">Decision Maker:</span>
                  <span className="text-slate-200">{generatedReceipt.decisionMaker}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="text-slate-400">{generatedReceipt.timestamp}</span>
                </div>
                {generatedReceipt.mandateId && (
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-500">Generated Mandate ID:</span>
                    <span className="text-amber-300 text-[11px]">{generatedReceipt.mandateId}</span>
                  </div>
                )}
                {generatedReceipt.maxAuthorisedUSDC && (
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-500">Authorized Max USDC:</span>
                    <span className="text-white font-bold">${generatedReceipt.maxAuthorisedUSDC.toLocaleString()} USDC</span>
                  </div>
                )}
                <div className="flex justify-between pt-1">
                  <span className="text-slate-500">Audit Status:</span>
                  <span className="text-teal-400 font-bold uppercase">{generatedReceipt.status}</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition text-xs"
                >
                  Close &amp; Return to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
