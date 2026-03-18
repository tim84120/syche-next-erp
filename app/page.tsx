"use client";

import { useState, useMemo, useEffect } from "react";
import { InventoryItem, ExchangeRecord } from "./types/index";
import WalletCard from "../components/WalletCard";
import ExchangeForm from "../components/ExchangeForm";
import ProductForm from "../components/ProductForm";
import InventoryTable from "../components/InventoryTable";
import Link from "next/link";

export default function SYCHE_ERP() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [exchangeRecords, setExchangeRecords] = useState<ExchangeRecord[]>([]);

  useEffect(() => {
    let ignore = false;

    const fetchInitialData = async () => {
      try {
        const [invRes, excRes] = await Promise.all([
          fetch("/api/inventory"),
          fetch("/api/exchanges"),
        ]);

        if (invRes.ok) {
          const invData = await invRes.json();
          if (!ignore) setInventory(invData);
        }
        if (excRes.ok) {
          const excData = await excRes.json();
          if (!ignore) setExchangeRecords(excData);
        }
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
      }
    };

    fetchInitialData();

    return () => {
      ignore = true;
    };
  }, []);
  // 計算資金池現況
  const walletStats = useMemo(() => {
    const totalThbIn = exchangeRecords.reduce(
      (sum, record) => sum + record.thbReceived,
      0,
    );
    const totalTwdSpent = exchangeRecords.reduce(
      (sum, record) => sum + record.twdSpent,
      0,
    );
    const totalThbOut = inventory.reduce(
      (sum, item) => sum + item.foreignCost * item.quantity,
      0,
    );
    const totalTwdOut = inventory.reduce(
      (sum, item) => sum + item.twdCost * item.quantity,
      0,
    );

    const currentThbBalance = totalThbIn - totalThbOut;
    const currentTwdCostPool = totalTwdSpent - totalTwdOut;
    const averageRate =
      currentThbBalance > 0 ? currentTwdCostPool / currentThbBalance : 0;

    return { balance: currentThbBalance, avgRate: averageRate };
  }, [exchangeRecords, inventory]);

  // 處理新增換匯
  const handleAddExchange = async (twd: number, thb: number) => {
    try {
      const res = await fetch("/api/exchanges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ twdSpent: twd, thbReceived: thb }),
      });
      if (res.ok) {
        const { item } = await res.json();
        setExchangeRecords([item, ...exchangeRecords]);
      }
    } catch (error) {
      console.error("Failed to add exchange:", error);
    }
  };

  // 處理新增商品
  const handleAddProduct = async (
    name: string,
    foreignCost: number,
    quantity: number,
  ) => {
    const appliedRate = walletStats.avgRate;
    const twdCost = Math.round(foreignCost * appliedRate);

    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          foreignCost,
          appliedRate,
          twdCost,
          quantity,
        }),
      });
      if (res.ok) {
        const { item } = await res.json();
        setInventory([item, ...inventory]);
      }
    } catch (error) {
      console.error("Failed to add inventory:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-12">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <span className="text-2xl">🇹🇭</span> SYCHE{" "}
              <span className="text-slate-400 font-normal text-lg ml-2">
                進銷存管理
              </span>
            </h1>
            <nav className="hidden md:flex gap-4 ml-4">
              <Link
                href="/"
                className="text-blue-600 font-bold border-b-2 border-blue-600 pb-1"
              >
                庫存管理
              </Link>
              <Link
                href="/orders"
                className="text-slate-500 hover:text-blue-600 font-medium transition-colors"
              >
                訂單管理
              </Link>
            </nav>
          </div>
          <div className="text-sm text-slate-500 hidden sm:block">v1.2.0</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-8">
        <WalletCard stats={walletStats} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ExchangeForm onAddRecord={handleAddExchange} />
          <ProductForm
            walletStats={walletStats}
            onAddProduct={handleAddProduct}
          />
        </div>

        <InventoryTable inventory={inventory} />
      </main>
    </div>
  );
}
