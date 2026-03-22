"use client";

import { useState, useMemo, useEffect } from "react";
import { InventoryItem, ExchangeRecord } from "./types/index";
import WalletCard from "../components/WalletCard";
import ExchangeForm from "../components/ExchangeForm";
import ProductForm from "../components/ProductForm";
import InventoryTable from "../components/InventoryTable";

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
    const cashInventory = inventory.filter(
      (record) => record.paymentMethod === "cash",
    );
    const totalThbIn = exchangeRecords.reduce(
      (sum, record) => sum + record.thbReceived,
      0,
    );
    const totalTwdSpent = exchangeRecords.reduce(
      (sum, record) => sum + record.twdSpent,
      0,
    );
    const totalThbOut = cashInventory.reduce(
      (sum, item) => sum + item.foreignCost * item.quantity,
      0,
    );
    const totalTwdOut = cashInventory.reduce(
      (sum, item) => sum + item.twdCost * item.quantity,
      0,
    );

    const currentThbBalance = totalThbIn - totalThbOut;
    const currentTwdCostPool = totalTwdSpent - totalTwdOut;
    const averageRate =
      currentThbBalance > 0 ? currentTwdCostPool / currentThbBalance : 0;

    return {
      balance: currentThbBalance,
      avgRate: averageRate,
      exchangeRecords,
    };
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

  return (
    <>
      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-8">
        <WalletCard stats={walletStats} />
        <ExchangeForm onAddRecord={handleAddExchange} />
        <InventoryTable inventory={inventory} />
      </main>
    </>
  );
}
