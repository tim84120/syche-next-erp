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
  quantity: number; // 現有庫存數量
  stockQuantity: number; // 進貨數量
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

export interface PurchaseOrder {
  id: number;
  orderNumber: string;
  brand: string;
  name: string;
  style: string;
  size: string;
  quantity: number;
  link: string;
  note: string | null;
  status: 0 | 1 | 2 | 3 | 4; // 0 = pending, 1 = 已下單, 2 = 已到貨(TH), 3 = 已出貨(TH), 4 = 已到貨(TW)
  createdAt: string;
  inventoryItems?: {
    id: number;
    foreignCost: number;
    appliedRate: number;
    twdCost: number;
    quantity: number;
    status: 1 | 2 | 3 | 4; // 1 = 已下單, 2 = 已到貨(TH), 3 = 已出貨(TH), 4 = 已到貨(TW)
  }[];
}
