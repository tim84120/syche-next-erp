"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { InventoryItem, ExchangeRecord } from "./types/index";
import WalletCard from "../components/WalletCard";
import ExchangeForm from "../components/ExchangeForm";
import ExchangeTable from "../components/ExchangeTable";
import InventoryTable from "../components/InventoryTable";
import { useI18n } from "@/lib/i18n";

interface ExpenseRecord {
  id: number;
  amountThb: number;
  amountTwd: number;
  paymentMethod: string;
}

export default function SYCHE_ERP() {
  const { t } = useI18n();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [exchangeRecords, setExchangeRecords] = useState<ExchangeRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const fetchInitialData = async () => {
    try {
      const [invRes, excRes, expRes] = await Promise.all([
        fetch("/api/inventory"),
        fetch("/api/exchanges"),
        fetch("/api/expenses"),
      ]);

      if (invRes.ok) {
        const invData = await invRes.json();
        setInventory(invData);
      }
      if (excRes.ok) {
        const excData = await excRes.json();
        setExchangeRecords(excData);
      }
      if (expRes.ok) {
        const expData = await expRes.json();
        setExpenses(expData);
      }
    } catch (error) {
      console.error("Failed to fetch initial data:", error);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);
  // 計算資金池現況
  const walletStats = useMemo(() => {
    const cashInventory = inventory.filter(
      (record) => record.paymentMethod === "cash",
    );
    const cashExpenses = expenses.filter(
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
    const totalThbOut =
      cashInventory.reduce(
        (sum, item) => sum + item.foreignCost * item.stockQuantity,
        0,
      ) + cashExpenses.reduce((sum, item) => sum + item.amountThb, 0);
    const totalTwdOut =
      cashInventory.reduce(
        (sum, item) => sum + item.twdCost * item.stockQuantity,
        0,
      ) + cashExpenses.reduce((sum, item) => sum + item.amountTwd, 0);

    const currentThbBalance = totalThbIn - totalThbOut;
    const currentTwdCostPool = totalTwdSpent - totalTwdOut;
    const averageRate =
      currentThbBalance > 0 ? currentTwdCostPool / currentThbBalance : 0;

    return {
      balance: currentThbBalance,
      avgRate: averageRate,
      exchangeRecords,
    };
  }, [exchangeRecords, inventory, expenses]);

  const handleRecalculate = async () => {
    if (
      !confirm(
        t(
          "home.recalculateConfirm",
          "確定要重新計算所有現金進貨、商品支出、運費與雜支的成本嗎？\n系統會依照時間順序重新扣除泰銖資金池。",
        ),
      )
    ) {
      return;
    }

    setIsRecalculating(true);
    try {
      const res = await fetch("/api/inventory/recalculate", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          data.error || t("home.recalculateFailed", "重新計算失敗"),
        );
      }

      await fetchInitialData();
      alert(
        t(
          "home.recalculateSuccess",
          "重新計算完成，已依時間順序重建商品與支出成本。",
        ),
      );
    } catch (error) {
      console.error("Failed to recalculate costs:", error);
      alert(
        error instanceof Error
          ? error.message
          : t("home.recalculateError", "重新計算發生錯誤"),
      );
    } finally {
      setIsRecalculating(false);
    }
  };

  // 處理新增換匯
  const handleAddExchange = async (twd: number, thb: number, date: string) => {
    try {
      const res = await fetch("/api/exchanges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          twdSpent: twd,
          thbReceived: thb,
          createdAt: date,
        }),
      });
      if (res.ok) {
        const { item } = await res.json();
        setExchangeRecords([item, ...exchangeRecords]);
      }
    } catch (error) {
      console.error("Failed to add exchange:", error);
    }
  };

  const handleUpdateExchange = async (
    id: number,
    twdSpent: number,
    thbReceived: number,
  ) => {
    try {
      const res = await fetch(`/api/exchanges/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ twdSpent, thbReceived }),
      });
      if (res.ok) {
        const { item } = await res.json();
        setExchangeRecords((prev) => prev.map((r) => (r.id === id ? item : r)));
      } else {
        throw new Error("Update failed");
      }
    } catch (error) {
      console.error("Failed to update exchange:", error);
      throw error;
    }
  };

  const handleDeleteExchange = async (id: number) => {
    try {
      const res = await fetch(`/api/exchanges/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setExchangeRecords((prev) => prev.filter((r) => r.id !== id));
      } else {
        throw new Error("Delete failed");
      }
    } catch (error) {
      console.error("Failed to delete exchange:", error);
      throw error;
    }
  };

  return (
    <>
      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-8">
        <WalletCard stats={walletStats} />
        {isAdmin && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {t("home.recalculateTitle", "全站成本重新計算")}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {t(
                    "home.recalculateDesc",
                    "依時間順序重新計算所有現金進貨、商品支出、運費與雜支的台幣成本。",
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRecalculate}
                disabled={isRecalculating}
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRecalculating
                  ? t("home.recalculating", "重新計算中...")
                  : t("home.recalculateBtn", "重新計算所有成本")}
              </button>
            </div>
          </section>
        )}
        <ExchangeForm onAddRecord={handleAddExchange} />
        <ExchangeTable
          records={exchangeRecords}
          onUpdateRecord={handleUpdateExchange}
          onDeleteRecord={handleDeleteExchange}
        />
        <InventoryTable inventory={inventory} onRefresh={fetchInitialData} />
      </main>
    </>
  );
}
