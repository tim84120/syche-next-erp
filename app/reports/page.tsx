"use client";

import { useEffect, useMemo, useState } from "react";

type OrderStatus =
  | "placed"
  | "pending"
  | "paid"
  | "shipped"
  | "completed"
  | "cancelled";

interface InventoryItem {
  id: number;
  brand: string;
  name: string;
  style: string;
  size: string;
  twdCost: number;
  quantity: number;
  stockQuantity: number;
  paymentMethod?: string;
}

type PaymentFilter = "all" | "cash" | "card";

interface OrderItem {
  id: number;
  orderId: string;
  inventoryItemId?: number | null;
  brand?: string | null;
  name?: string | null;
  style?: string | null;
  size?: string | null;
  sellPriceTwd: number;
  quantity: number;
}

interface Order {
  id: string;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  customerName: string;
  items: OrderItem[];
}

interface ExchangeRecord {
  id: number;
  twdSpent: number;
  thbReceived: number;
}

interface OrderProfitRow {
  id: string;
  date: Date;
  customerName: string;
  status: OrderStatus;
  revenue: number;
  cogs: number;
  profit: number;
  margin: number;
  matchedItemCount: number;
}

const salesStatus: OrderStatus = "completed";

const statusText: Record<OrderStatus, string> = {
  placed: "已下單",
  pending: "待處理",
  paid: "已付款",
  shipped: "已出貨",
  completed: "已完成",
  cancelled: "已取消",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(value);

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const toDateInputValue = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function FinancialReportsPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [exchanges, setExchanges] = useState<ExchangeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [startDate, setStartDate] = useState(toDateInputValue(defaultStart));
  const [endDate, setEndDate] = useState(toDateInputValue(today));
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");

  useEffect(() => {
    let ignore = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [invRes, ordRes, excRes] = await Promise.all([
          fetch("/api/inventory"),
          fetch("/api/orders"),
          fetch("/api/exchanges"),
        ]);

        if (!ignore && invRes.ok) {
          setInventory(await invRes.json());
        }
        if (!ignore && ordRes.ok) {
          setOrders(await ordRes.json());
        }
        if (!ignore && excRes.ok) {
          setExchanges(await excRes.json());
        }
      } catch (error) {
        console.error("Failed to load report data:", error);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchData();

    return () => {
      ignore = true;
    };
  }, []);

  const inventoryMap = useMemo(
    () => new Map(inventory.map((item) => [item.id, item])),
    [inventory],
  );

  const orderProfitRows = useMemo<OrderProfitRow[]>(() => {
    return orders.map((order) => {
      const date = new Date(order.createdAt);
      const filteredItems =
        paymentFilter === "all"
          ? order.items
          : order.items.filter((item) => {
              if (!item.inventoryItemId) return false;
              const inv = inventoryMap.get(item.inventoryItemId);
              return inv?.paymentMethod === paymentFilter;
            });

      const revenue = filteredItems.length
        ? filteredItems.reduce(
            (sum, item) => sum + item.sellPriceTwd * item.quantity,
            0,
          )
        : paymentFilter === "all"
          ? order.totalAmount
          : 0;

      const cogs = filteredItems.reduce((sum, item) => {
        if (!item.inventoryItemId) return sum;
        const inv = inventoryMap.get(item.inventoryItemId);
        if (!inv) return sum;
        return sum + inv.twdCost * item.quantity;
      }, 0);

      const profit = revenue - cogs;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        id: order.id,
        date,
        customerName: order.customerName,
        status: order.status,
        revenue,
        cogs,
        profit,
        margin,
        matchedItemCount: filteredItems.length,
      };
    });
  }, [orders, inventoryMap, paymentFilter]);

  const filteredRows = useMemo(() => {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59`);

    return orderProfitRows.filter((row) => {
      const inDateRange = row.date >= start && row.date <= end;
      if (!inDateRange) return false;
      if (row.status !== salesStatus) return false;
      if (paymentFilter !== "all" && row.matchedItemCount === 0) return false;
      return true;
    });
  }, [orderProfitRows, startDate, endDate, paymentFilter]);

  const summary = useMemo(() => {
    const totalRevenue = filteredRows.reduce(
      (sum, row) => sum + row.revenue,
      0,
    );
    const totalCogs = filteredRows.reduce((sum, row) => sum + row.cogs, 0);
    const grossProfit = totalRevenue - totalCogs;
    const grossMargin =
      totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const inventoryValue = inventory.reduce(
      (sum, item) => sum + item.stockQuantity * item.twdCost,
      0,
    );

    const historicalPurchaseCost = inventory.reduce(
      (sum, item) => sum + item.quantity * item.twdCost,
      0,
    );

    const exchangeTwd = exchanges.reduce(
      (sum, record) => sum + record.twdSpent,
      0,
    );
    const exchangeThb = exchanges.reduce(
      (sum, record) => sum + record.thbReceived,
      0,
    );

    return {
      totalRevenue,
      totalCogs,
      grossProfit,
      grossMargin,
      inventoryValue,
      historicalPurchaseCost,
      exchangeRate: exchangeThb > 0 ? exchangeTwd / exchangeThb : 0,
      orderCount: filteredRows.length,
    };
  }, [filteredRows, inventory, exchanges]);

  const monthlyReports = useMemo(() => {
    const bucket = new Map<
      string,
      { revenue: number; cogs: number; profit: number; orders: number }
    >();

    for (const row of filteredRows) {
      const key = `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, "0")}`;
      const current = bucket.get(key) ?? {
        revenue: 0,
        cogs: 0,
        profit: 0,
        orders: 0,
      };
      current.revenue += row.revenue;
      current.cogs += row.cogs;
      current.profit += row.profit;
      current.orders += 1;
      bucket.set(key, current);
    }

    return Array.from(bucket.entries())
      .map(([month, data]) => ({
        month,
        ...data,
        margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
      }))
      .sort((a, b) => (a.month < b.month ? 1 : -1));
  }, [filteredRows]);

  const productReports = useMemo(() => {
    const bucket = new Map<
      string,
      {
        product: string;
        soldQty: number;
        revenue: number;
        cogs: number;
        profit: number;
      }
    >();

    for (const order of orders) {
      if (order.status !== salesStatus) continue;

      const createdAt = new Date(order.createdAt);
      const start = new Date(`${startDate}T00:00:00`);
      const end = new Date(`${endDate}T23:59:59`);
      if (createdAt < start || createdAt > end) continue;

      for (const item of order.items) {
        if (paymentFilter !== "all") {
          if (!item.inventoryItemId) continue;
          const inv = inventoryMap.get(item.inventoryItemId);
          if (inv?.paymentMethod !== paymentFilter) continue;
        }

        const key = item.inventoryItemId
          ? `id-${item.inventoryItemId}`
          : `${item.brand ?? ""}-${item.name ?? ""}-${item.style ?? ""}-${item.size ?? ""}`;

        const productName =
          [item.brand, item.name, item.style, item.size]
            .filter(Boolean)
            .join(" ") || "未命名商品";

        const inv = item.inventoryItemId
          ? inventoryMap.get(item.inventoryItemId)
          : undefined;
        const revenue = item.sellPriceTwd * item.quantity;
        const cogs = (inv?.twdCost ?? 0) * item.quantity;
        const profit = revenue - cogs;

        const current = bucket.get(key) ?? {
          product: productName,
          soldQty: 0,
          revenue: 0,
          cogs: 0,
          profit: 0,
        };

        current.soldQty += item.quantity;
        current.revenue += revenue;
        current.cogs += cogs;
        current.profit += profit;
        bucket.set(key, current);
      }
    }

    return Array.from(bucket.values())
      .map((row) => ({
        ...row,
        margin: row.revenue > 0 ? (row.profit / row.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 12);
  }, [orders, inventoryMap, startDate, endDate, paymentFilter]);

  return (
    <main className="max-w-6xl mx-auto px-6 mt-8 space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">財務報表中心</h1>
            <p className="text-slate-500 mt-1">
              即時計算成本、營收與毛利，協助你檢查商品與訂單獲利。
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <label className="text-sm text-slate-600">
              起始日
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-700"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label className="text-sm text-slate-600">
              結束日
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-700"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
            <div className="text-sm text-slate-600">
              銷售狀態
              <div className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-700 bg-slate-50">
                僅計算已完成訂單
              </div>
            </div>
            <label className="text-sm text-slate-600">
              付款方式
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-700 bg-white"
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
              >
                <option value="all">全部</option>
                <option value="cash">現金</option>
                <option value="card">信用卡</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">總營收</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {formatCurrency(summary.totalRevenue)}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">總成本 (COGS)</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {formatCurrency(summary.totalCogs)}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">毛利</p>
          <p
            className={`text-2xl font-bold mt-2 ${summary.grossProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}
          >
            {formatCurrency(summary.grossProfit)}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            毛利率 {formatPercent(summary.grossMargin)}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">區間訂單數</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {summary.orderCount} 筆
          </p>
          <p className="text-sm text-slate-500 mt-1">
            平均匯率 {summary.exchangeRate.toFixed(3)} TWD/THB
          </p>
        </article>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">目前庫存資產</p>
          <p className="text-xl font-bold text-slate-900 mt-2">
            {formatCurrency(summary.inventoryValue)}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">歷史進貨總成本</p>
          <p className="text-xl font-bold text-slate-900 mt-2">
            {formatCurrency(summary.historicalPurchaseCost)}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">資料狀態</p>
          <p className="text-xl font-semibold text-slate-900 mt-2">
            {loading ? "資料載入中..." : "已更新"}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            資料來源: 訂單 / 庫存 / 換匯
          </p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm overflow-auto">
        <h2 className="text-lg font-bold text-slate-900 mb-4">月度毛利報表</h2>
        <table className="w-full min-w-160 text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-2">月份</th>
              <th className="py-2">訂單數</th>
              <th className="py-2">營收</th>
              <th className="py-2">成本</th>
              <th className="py-2">毛利</th>
              <th className="py-2">毛利率</th>
            </tr>
          </thead>
          <tbody>
            {monthlyReports.map((row) => (
              <tr
                key={row.month}
                className="border-b border-slate-100 last:border-b-0"
              >
                <td className="py-2 font-medium text-slate-800">{row.month}</td>
                <td className="py-2 text-slate-600">{row.orders}</td>
                <td className="py-2 text-slate-600">
                  {formatCurrency(row.revenue)}
                </td>
                <td className="py-2 text-slate-600">
                  {formatCurrency(row.cogs)}
                </td>
                <td
                  className={`py-2 ${row.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {formatCurrency(row.profit)}
                </td>
                <td className="py-2 text-slate-600">
                  {formatPercent(row.margin)}
                </td>
              </tr>
            ))}
            {monthlyReports.length === 0 && (
              <tr>
                <td className="py-4 text-slate-400" colSpan={6}>
                  目前區間沒有可分析資料
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm overflow-auto">
        <h2 className="text-lg font-bold text-slate-900 mb-4">訂單利潤明細</h2>
        <table className="w-full min-w-225 text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-2">訂單編號</th>
              <th className="py-2">日期</th>
              <th className="py-2">客戶</th>
              <th className="py-2">狀態</th>
              <th className="py-2">營收</th>
              <th className="py-2">成本</th>
              <th className="py-2">毛利</th>
              <th className="py-2">毛利率</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-slate-100 last:border-b-0"
              >
                <td className="py-2 font-medium text-slate-800">{row.id}</td>
                <td className="py-2 text-slate-600">
                  {row.date.toLocaleDateString("zh-TW")}
                </td>
                <td className="py-2 text-slate-600">{row.customerName}</td>
                <td className="py-2 text-slate-600">
                  {statusText[row.status]}
                </td>
                <td className="py-2 text-slate-600">
                  {formatCurrency(row.revenue)}
                </td>
                <td className="py-2 text-slate-600">
                  {formatCurrency(row.cogs)}
                </td>
                <td
                  className={`py-2 ${row.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {formatCurrency(row.profit)}
                </td>
                <td className="py-2 text-slate-600">
                  {formatPercent(row.margin)}
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td className="py-4 text-slate-400" colSpan={8}>
                  目前條件沒有符合的訂單
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm overflow-auto">
        <h2 className="text-lg font-bold text-slate-900 mb-4">商品利潤排行</h2>
        <table className="w-full min-w-190 text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-2">商品</th>
              <th className="py-2">銷售數量</th>
              <th className="py-2">營收</th>
              <th className="py-2">成本</th>
              <th className="py-2">毛利</th>
              <th className="py-2">毛利率</th>
            </tr>
          </thead>
          <tbody>
            {productReports.map((row) => (
              <tr
                key={row.product}
                className="border-b border-slate-100 last:border-b-0"
              >
                <td className="py-2 font-medium text-slate-800">
                  {row.product}
                </td>
                <td className="py-2 text-slate-600">{row.soldQty}</td>
                <td className="py-2 text-slate-600">
                  {formatCurrency(row.revenue)}
                </td>
                <td className="py-2 text-slate-600">
                  {formatCurrency(row.cogs)}
                </td>
                <td
                  className={`py-2 ${row.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {formatCurrency(row.profit)}
                </td>
                <td className="py-2 text-slate-600">
                  {formatPercent(row.margin)}
                </td>
              </tr>
            ))}
            {productReports.length === 0 && (
              <tr>
                <td className="py-4 text-slate-400" colSpan={6}>
                  目前區間沒有可分析商品
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
