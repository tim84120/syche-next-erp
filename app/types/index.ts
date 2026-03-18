// types.ts
export interface InventoryItem {
  id: number;
  name: string;
  foreignCost: number;
  appliedRate: number;
  twdCost: number;
  quantity: number;
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
