"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import ProductForm, { ProductFormRef } from "../../components/ProductForm";
import PurchaseOrderForm from "../../components/PurchaseOrderForm";
import PurchaseOrderTable from "../../components/PurchaseOrderTable";
import { InventoryItem, ExchangeRecord } from "../types/index";

export default function PurchasesPage() {
  const { data: session } = useSession();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [exchangeRecords, setExchangeRecords] = useState<ExchangeRecord[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [, setIsLoading] = useState(true);

  const productFormRef = useRef<ProductFormRef>(null);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [invRes, excRes, poRes] = await Promise.all([
        fetch("/api/inventory"),
        fetch("/api/exchanges"),
        fetch("/api/purchases"),
      ]);

      if (invRes.ok) {
        const invData = await invRes.json();
        setInventory(invData);
      }
      if (excRes.ok) {
        const excData = await excRes.json();
        setExchangeRecords(excData);
      }
      if (poRes.ok) {
        const poData = await poRes.json();
        setPurchaseOrders(poData);
      }
    } catch (error) {
      console.error("Failed to fetch initial data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

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

    return {
      balance: currentThbBalance,
      avgRate: averageRate,
      exchangeRecords,
    };
  }, [exchangeRecords, inventory]);

  const handleAddProducts = async (
    products: {
      brand: string;
      name: string;
      style: string;
      size: string;
      foreignCost: number;
      quantity: number;
      purchaseOrderId?: number;
    }[],
  ) => {
    let hasError = false;
    const addedItems: InventoryItem[] = [];

    for (const p of products) {
      try {
        const res = await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(p),
        });
        if (res.ok) {
          const { item } = await res.json();
          addedItems.push(item);
        } else {
          const err = await res.json();
          alert(`新增 ${p.name} 失敗: ` + (err.error || ""));
          hasError = true;
          break; // 若其中一筆失敗，就中止後續新增
        }
      } catch (error) {
        console.error("Failed to add inventory:", error);
        hasError = true;
        break;
      }
    }

    if (addedItems.length > 0) {
      await fetchInitialData();
    }
    return !hasError;
  };

  const handleItemStatusChange = async (itemId: number, newStatus: number) => {
    try {
      const res = await fetch(`/api/inventory/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchInitialData();
      } else {
        alert("更新狀態失敗");
      }
    } catch (error) {
      console.error("更新狀態失敗:", error);
      alert("更新狀態失敗");
    }
  };

  if (!session?.user) {
    return (
      <div className="p-8 text-center text-gray-500">請先登入以檢視此頁面</div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">採購管理</h1>
          <p className="text-gray-600">管理採購訂單需求、實體進貨入庫</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <PurchaseOrderForm onOrderAdded={fetchInitialData} />

        <ProductForm
          ref={productFormRef}
          walletStats={walletStats}
          onAddProducts={handleAddProducts}
        />
        <PurchaseOrderTable
          purchaseOrders={purchaseOrders}
          onImportSelected={(selectedOrders) => {
            if (productFormRef.current) {
              productFormRef.current.importProducts(selectedOrders);
            }
          }}
          onItemStatusChange={handleItemStatusChange}
        />
      </div>
    </div>
  );
}
