"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import ProductForm, { ProductFormRef } from "@/components/ProductForm";
import PurchaseOrderForm from "@/components/PurchaseOrderForm";
import PurchaseOrderTable from "@/components/PurchaseOrderTable";
import type {
  PurchaseOrder,
  InventoryItem,
  ExchangeRecord,
} from "~/types/index";

type MobileSectionKey = "purchase-order" | "product-import" | "purchase-list";

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function PurchasesPage() {
  const { data: session } = useSession();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [exchangeRecords, setExchangeRecords] = useState<ExchangeRecord[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] =
    useState<MobileSectionKey>("purchase-order");
  const today = new Date();
  const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [startDate, setStartDate] = useState(toDateInputValue(defaultStart));
  const [endDate, setEndDate] = useState(toDateInputValue(today));

  const productFormRef = useRef<ProductFormRef>(null);

  const fetchInitialData = useCallback(
    async (rangeStart = startDate, rangeEnd = endDate) => {
      setIsLoading(true);
      try {
        const purchaseQuery = new URLSearchParams({
          startDate: rangeStart,
          endDate: rangeEnd,
        });

        const [invRes, excRes, poRes] = await Promise.all([
          fetch("/api/inventory"),
          fetch("/api/exchanges"),
          fetch(`/api/purchases?${purchaseQuery.toString()}`),
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
    },
    [startDate, endDate],
  );

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

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
      (sum, item) => sum + item.foreignCost * item.stockQuantity,
      0,
    );
    const totalTwdOut = cashInventory.reduce(
      (sum, item) => sum + item.twdCost * item.stockQuantity,
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
      paymentMethod: string;
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

  const mobileSections: {
    key: MobileSectionKey;
    label: string;
    description: string;
  }[] = [
    {
      key: "purchase-order",
      label: "建立採購單",
      description: "新增採購需求",
    },
    {
      key: "product-import",
      label: "商品進貨",
      description: "批次入庫與扣款",
    },
    {
      key: "purchase-list",
      label: "訂單列表",
      description: "查看與更新狀態",
    },
  ];

  const activeSectionMeta =
    mobileSections.find((section) => section.key === activeSection) ??
    mobileSections[0];

  const purchaseOrderSection = (
    <PurchaseOrderForm onOrderAdded={fetchInitialData} />
  );

  const productImportSection = (
    <ProductForm
      ref={productFormRef}
      walletStats={walletStats}
      onAddProducts={handleAddProducts}
    />
  );

  const purchaseListSection = (
    <PurchaseOrderTable
      purchaseOrders={purchaseOrders}
      onImportSelected={(selectedOrders) => {
        if (productFormRef.current) {
          productFormRef.current.importProducts(selectedOrders);
          setActiveSection("product-import");
        }
      }}
      onItemStatusChange={handleItemStatusChange}
    />
  );

  if (!session?.user) {
    return (
      <div className="p-8 text-center text-gray-500">請先登入以檢視此頁面</div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-4 flex flex-col gap-4 lg:gap-10 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-bold sm:text-3xl">採購管理</h1>
          <p className="text-gray-600 whitespace-pre">
            管理採購訂單需求、實體進貨入庫
          </p>
        </div>
        <div className="grid w-full min-w-0 grid-cols-2 gap-3 overflow-hidden sm:grid-cols-2">
          <label className="w-full min-w-0 overflow-hidden text-sm text-slate-600">
            起始日
            <input
              type="date"
              className="mt-1 block w-full min-w-0 max-w-full appearance-none rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-700"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="w-full min-w-0 overflow-hidden text-sm text-slate-600">
            結束日
            <input
              type="date"
              className="mt-1 block w-full min-w-0 max-w-full appearance-none rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-700"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="md:hidden">
        <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {activeSectionMeta.label}
              </p>
              <p className="text-xs text-slate-500">
                {activeSectionMeta.description}
              </p>
            </div>
            <button
              type="button"
              aria-label="切換採購功能"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700"
            >
              <span className="flex flex-col gap-1.5">
                <span className="block h-0.5 w-5 rounded-full bg-current" />
                <span className="block h-0.5 w-5 rounded-full bg-current" />
                <span className="block h-0.5 w-5 rounded-full bg-current" />
              </span>
            </button>
          </div>
          {mobileMenuOpen && (
            <div className="absolute left-4 right-4 top-[calc(100%+0.75rem)] z-20 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
              {mobileSections.map((section) => (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => {
                    setActiveSection(section.key);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors ${
                    activeSection === section.key
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="font-medium">{section.label}</span>
                  <span className="text-xs text-slate-400">
                    {section.description}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 space-y-0">
          <div
            className={
              activeSection === "purchase-order" ? undefined : "hidden"
            }
          >
            {purchaseOrderSection}
          </div>
          <div
            className={
              activeSection === "product-import" ? undefined : "hidden"
            }
          >
            {productImportSection}
          </div>
          <div
            className={activeSection === "purchase-list" ? undefined : "hidden"}
          >
            {purchaseListSection}
          </div>
        </div>
      </div>

      <div className="hidden grid-cols-1 gap-8 md:grid">
        {purchaseOrderSection}
        {productImportSection}
        {purchaseListSection}
      </div>
    </div>
  );
}
