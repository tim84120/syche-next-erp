"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";

// --- 型別定義 (確保這些都有保留) ---
export type OrderStatus =
  | "placed"
  | "pending"
  | "paid"
  | "shipped"
  | "completed"
  | "cancelled";
export type FilterStatus = "all" | OrderStatus;

interface OrderItem {
  productName: string;
  quantity: number;
  sellPriceTwd: number;
}

export interface Order {
  id: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
}

// 狀態對應的 UI 設定
const statusConfig: Record<OrderStatus, { label: string; colorClass: string }> =
  {
    placed: {
      label: "已下單",
      colorClass: "bg-purple-100 text-purple-700 border-purple-200",
    },
    pending: {
      label: "待處理",
      colorClass: "bg-amber-100 text-amber-700 border-amber-200",
    },
    paid: {
      label: "已付款",
      colorClass: "bg-blue-100 text-blue-700 border-blue-200",
    },
    shipped: {
      label: "已出貨",
      colorClass: "bg-indigo-100 text-indigo-700 border-indigo-200",
    },
    completed: {
      label: "已完成",
      colorClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
    },
    cancelled: {
      label: "已取消",
      colorClass: "bg-slate-100 text-slate-600 border-slate-200",
    },
  };

export default function OrdersPage() {
  // 1. 初始化變成空陣列，等待從 API 抓資料
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [form, setForm] = useState({
    customerName: "",
    productName: "",
    quantity: "1",
    sellPriceTwd: "",
  });
  const [currentFilter, setCurrentFilter] = useState<FilterStatus>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchTargetStatus, setBatchTargetStatus] = useState<OrderStatus | "">(
    "",
  );

  // --- 從後端 API 抓取資料 ---
  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(`API 發生錯誤，狀態碼：${res.status}`);
      }

      const formattedData = data.map((order: any) => ({
        ...order,
        createdAt: new Date(order.createdAt).toLocaleString(),
      }));
      setOrders(formattedData);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    if (currentFilter === "all") return orders;
    return orders.filter((order) => order.status === currentFilter);
  }, [orders, currentFilter]);

  const handleFilterChange = (filter: FilterStatus) => {
    setCurrentFilter(filter);
    setSelectedIds([]);
    setBatchTargetStatus("");
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(filteredOrders.map((order) => order.id));
    else setSelectedIds([]);
  };

  const handleSelectOne = (orderId: string, checked: boolean) => {
    if (checked) setSelectedIds([...selectedIds, orderId]);
    else setSelectedIds(selectedIds.filter((id) => id !== orderId));
  };

  // --- 串接更新狀態的 API ---
  const handleBatchStatusUpdate = async () => {
    if (!batchTargetStatus || selectedIds.length === 0) return;

    try {
      await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderIds: selectedIds,
          status: batchTargetStatus,
        }),
      });

      await fetchOrders();
      setSelectedIds([]);
      setBatchTargetStatus("");
    } catch (error) {
      alert("狀態更新失敗");
    }
  };

  const handleStatusChange = async (
    orderId: string,
    newStatus: OrderStatus,
  ) => {
    setOrders(
      orders.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order,
      ),
    );

    try {
      await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: [orderId], status: newStatus }),
      });
    } catch (error) {
      fetchOrders();
    }
  };

  // --- 串接新增訂單的 API ---
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName || !form.productName || !form.sellPriceTwd) return;

    const qty = Number(form.quantity);
    const price = Number(form.sellPriceTwd);
    const totalAmount = qty * price;

    const payload = {
      customerName: form.customerName,
      totalAmount: totalAmount,
      items: [
        { productName: form.productName, quantity: qty, sellPriceTwd: price },
      ],
    };

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchOrders();
        setForm({
          customerName: "",
          productName: "",
          quantity: "1",
          sellPriceTwd: "",
        });
      }
    } catch (error) {
      alert("新增訂單發生錯誤");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-12">
      {/* 導覽列 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <span className="text-2xl">🇹🇭</span> THAITAI{" "}
              <span className="text-slate-400 font-normal text-lg ml-2">
                進銷存管理
              </span>
            </h1>
            <nav className="hidden md:flex gap-4 ml-4">
              <Link
                href="/"
                className="text-slate-500 hover:text-blue-600 font-medium transition-colors"
              >
                庫存管理
              </Link>
              <Link
                href="/orders"
                className="text-blue-600 font-bold border-b-2 border-blue-600 pb-1"
              >
                訂單管理
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-8">
        {/* 新增訂單區塊 (與之前相同) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-xl">
              📝
            </div>
            <h2 className="text-xl font-bold text-slate-800">建立新訂單</h2>
          </div>

          <form
            onSubmit={handleCreateOrder}
            className="grid grid-cols-1 md:grid-cols-5 gap-5 items-end"
          >
            <div className="md:col-span-1">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                客戶名稱
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.customerName}
                onChange={(e) =>
                  setForm({ ...form, customerName: e.target.value })
                }
                key="customerName"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                商品名稱
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.productName}
                onChange={(e) =>
                  setForm({ ...form, productName: e.target.value })
                }
                key="productName"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                銷售單價
              </label>
              <input
                type="number"
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.sellPriceTwd}
                onChange={(e) =>
                  setForm({ ...form, sellPriceTwd: e.target.value })
                }
                key="sellPriceTwd"
              />
            </div>
            <div className="md:col-span-1">
              <button
                type="submit"
                className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 transition-all"
              >
                新增訂單
              </button>
            </div>
          </form>
        </div>

        {/* 訂單管理核心區塊 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* 1. 狀態分類頁籤 (Tabs) */}
          <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50 px-4 pt-4 hide-scrollbar">
            <button
              onClick={() => handleFilterChange("all")}
              className={`px-5 py-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
                currentFilter === "all"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              全部訂單 ({orders.length})
            </button>
            {Object.entries(statusConfig).map(([key, config]) => {
              const count = orders.filter((o) => o.status === key).length;
              return (
                <button
                  key={key}
                  onClick={() => handleFilterChange(key as OrderStatus)}
                  className={`px-5 py-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                    currentFilter === key
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {config.label}
                  <span className="bg-slate-200 text-slate-600 py-0.5 px-2 rounded-full text-xs">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 2. 批次操作工具列 (只有在有勾選項目時顯示) */}
          {selectedIds.length > 0 && (
            <div className="bg-blue-50 border-b border-blue-100 px-6 py-3 flex items-center justify-between animate-fade-in">
              <span className="text-sm font-bold text-blue-800">
                已選擇 {selectedIds.length} 筆訂單
              </span>
              <div className="flex items-center gap-3">
                <select
                  className="px-3 py-1.5 text-sm border border-blue-200 rounded-lg outline-none text-slate-700"
                  value={batchTargetStatus}
                  onChange={(e) =>
                    setBatchTargetStatus(e.target.value as OrderStatus | "")
                  }
                >
                  <option value="">-- 選擇更改狀態 --</option>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleBatchStatusUpdate}
                  disabled={!batchTargetStatus}
                  className="bg-blue-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  套用變更
                </button>
              </div>
            </div>
          )}

          {/* 3. 訂單表格 */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-4 w-12 text-center">
                    {/* 全選 Checkbox */}
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      checked={
                        filteredOrders.length > 0 &&
                        selectedIds.length === filteredOrders.length
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      key="selectAll_checkbox"
                    />
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    訂單編號 / 時間
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    客戶
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    商品內容
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    總金額
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    訂單狀態
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-8 py-16 text-center text-slate-400 font-medium"
                    >
                      此分類下尚無訂單資料
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className={`transition-colors ${selectedIds.includes(order.id) ? "bg-blue-50/50" : "hover:bg-slate-50/80"}`}
                    >
                      <td className="px-6 py-4 text-center">
                        {/* 單選 Checkbox */}
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={selectedIds.includes(order.id)}
                          onChange={(e) =>
                            handleSelectOne(order.id, e.target.checked)
                          }
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-slate-800">
                          {order.id}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {order.createdAt}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                        {order.customerName}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                        {/* {order.items.map((item, idx) => (
                          <div key={idx}>
                            {item.productName} x {item.quantity}
                          </div>
                        ))} */}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-blue-950">
                        NT$ {order.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {/* 單一狀態切換 (保留) */}
                        <select
                          value={order.status}
                          onChange={(e) =>
                            handleStatusChange(
                              order.id,
                              e.target.value as OrderStatus,
                            )
                          }
                          className={`text-sm font-semibold px-3 py-1.5 rounded-full border outline-none cursor-pointer appearance-none text-center ${statusConfig[order.status].colorClass}`}
                        >
                          {Object.entries(statusConfig).map(([key, config]) => (
                            <option
                              key={key}
                              value={key}
                              className="bg-white text-slate-800"
                            >
                              {config.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
