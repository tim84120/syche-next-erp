// types.ts
export interface InventoryItem {
  id: number;
  brand: string;
  name: string;
  style: string;
  size: string;
  foreignCost: number;
  appliedRate: number;
  twdCost: number;
  quantity: number;
  status?: number; // 1 = 已下單, 2 = 已到貨(TH), 3 = 已出貨(TH), 4 = 已到貨(TW)
  paymentMethod?: string;
  purchaseOrderId?: number | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ExchangeRecord {
  id: number;
  twdSpent: number;
  thbReceived: number;
  date: string;
}

export interface WalletStats {
  balance: number;
  avgRate: number;
}
