import {
  PurchaseRequest,
  Supplier,
  Quotation,
  ApprovalItem,
  AltanaWalletConfig,
  ActivityEvent,
} from '@/types';
import {
  INITIAL_PURCHASE_REQUESTS,
  INITIAL_SUPPLIERS,
  INITIAL_QUOTATIONS,
  INITIAL_APPROVALS,
  INITIAL_ALTANA_WALLET,
  INITIAL_ACTIVITY,
} from './mockData';

const STORAGE_KEYS = {
  REQUESTS: 'procureyeti_requests_v2',
  SUPPLIERS: 'procureyeti_suppliers_v2',
  QUOTATIONS: 'procureyeti_quotations_v2',
  APPROVALS: 'procureyeti_approvals_v2',
  WALLET: 'procureyeti_wallet_v2',
  ACTIVITY: 'procureyeti_activity_v2',
};

const isBrowser = typeof window !== 'undefined';

export function getStoredRequests(): PurchaseRequest[] {
  if (!isBrowser) return INITIAL_PURCHASE_REQUESTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REQUESTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(INITIAL_PURCHASE_REQUESTS));
      return INITIAL_PURCHASE_REQUESTS;
    }
    const parsed = JSON.parse(raw);
    // Sanitize any legacy statuses
    return parsed.map((item: PurchaseRequest) => ({
      ...item,
      status: ((item as unknown as Record<string, unknown>).status === 'settled_onchain'
        ? 'awaiting_execution'
        : item.status) as PurchaseRequest['status'],
    }));
  } catch (e) {
    console.error('Error loading requests from localStorage', e);
    return INITIAL_PURCHASE_REQUESTS;
  }
}

export function saveStoredRequests(requests: PurchaseRequest[]): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(requests));
  } catch (e) {
    console.error('Error saving requests', e);
  }
}

export function getStoredSuppliers(): Supplier[] {
  if (!isBrowser) return INITIAL_SUPPLIERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(INITIAL_SUPPLIERS));
      return INITIAL_SUPPLIERS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading suppliers from localStorage', e);
    return INITIAL_SUPPLIERS;
  }
}

export function saveStoredSuppliers(suppliers: Supplier[]): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
  } catch (e) {
    console.error('Error saving suppliers', e);
  }
}

export function getStoredQuotations(): Quotation[] {
  if (!isBrowser) return INITIAL_QUOTATIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUOTATIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.QUOTATIONS, JSON.stringify(INITIAL_QUOTATIONS));
      return INITIAL_QUOTATIONS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading quotations', e);
    return INITIAL_QUOTATIONS;
  }
}

export function saveStoredQuotations(quotations: Quotation[]): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(STORAGE_KEYS.QUOTATIONS, JSON.stringify(quotations));
  } catch (e) {
    console.error('Error saving quotations', e);
  }
}

export function getStoredApprovals(): ApprovalItem[] {
  if (!isBrowser) return INITIAL_APPROVALS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.APPROVALS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.APPROVALS, JSON.stringify(INITIAL_APPROVALS));
      return INITIAL_APPROVALS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading approvals', e);
    return INITIAL_APPROVALS;
  }
}

export function saveStoredApprovals(approvals: ApprovalItem[]): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(STORAGE_KEYS.APPROVALS, JSON.stringify(approvals));
  } catch (e) {
    console.error('Error saving approvals', e);
  }
}

export function getStoredWalletConfig(): AltanaWalletConfig {
  if (!isBrowser) return INITIAL_ALTANA_WALLET;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WALLET);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.WALLET, JSON.stringify(INITIAL_ALTANA_WALLET));
      return INITIAL_ALTANA_WALLET;
    }
    const parsed = JSON.parse(raw);
    // Sanitize any legacy chain IDs or network names
    if (parsed.chainId === 44787 || parsed.network?.includes('Alfajores')) {
      parsed.chainId = 11142220;
      parsed.network = 'Celo Sepolia Testnet';
      parsed.targetMainnetChainId = 42220;
    }
    return parsed;
  } catch (e) {
    console.error('Error loading wallet config', e);
    return INITIAL_ALTANA_WALLET;
  }
}

export function saveStoredWalletConfig(config: AltanaWalletConfig): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(STORAGE_KEYS.WALLET, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving wallet config', e);
  }
}

export function getStoredActivity(): ActivityEvent[] {
  if (!isBrowser) return INITIAL_ACTIVITY;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVITY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(INITIAL_ACTIVITY));
      return INITIAL_ACTIVITY;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading activity', e);
    return INITIAL_ACTIVITY;
  }
}

export function saveStoredActivity(activity: ActivityEvent[]): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activity));
  } catch (e) {
    console.error('Error saving activity', e);
  }
}

export function resetToDemoDefaults(): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(INITIAL_PURCHASE_REQUESTS));
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(INITIAL_SUPPLIERS));
    localStorage.setItem(STORAGE_KEYS.QUOTATIONS, JSON.stringify(INITIAL_QUOTATIONS));
    localStorage.setItem(STORAGE_KEYS.APPROVALS, JSON.stringify(INITIAL_APPROVALS));
    localStorage.setItem(STORAGE_KEYS.WALLET, JSON.stringify(INITIAL_ALTANA_WALLET));
    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(INITIAL_ACTIVITY));
  } catch (e) {
    console.error('Error resetting to demo defaults', e);
  }
}
