"use client";

import { useState, useMemo, useEffect } from "react";

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
  id: number;
  orderId: string;
  brand?: string | null;
  name?: string | null;
  style?: string | null;
  size?: string | null;
  sellPriceTwd: number;
  quantity: number;
  inventoryItemId?: number | null;
}

export interface Order {
  id: string;
  customerName: string;
  storeNumber?: string | null;
  storeName?: string | null;
  transferCode?: string | null;
  totalAmount: number;
  note?: string | null;
  detail?: string | null;
  lineName?: string | null;
  email?: string | null;
  items: OrderItem[];
  status: OrderStatus;
  isDeducted?: boolean;
  createdAt: string;
}

type ImportOrderPayload = {
  time?: string | null;
  customerName: string;
  storeNumber?: string | null;
  storeName?: string | null;
  transferCode?: string | null;
  totalAmount: number;
  note?: string | null;
  detail?: string | null;
  lineName?: string | null;
  email?: string | null;
  status?: OrderStatus;
};

function normalizeHeader(value: string): string {
  return value
    .replace(/\uFEFF/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function findHeaderIndex(headers: string[], candidates: string[]): number {
  const normalizedCandidates = candidates.map(normalizeHeader);
  return headers.findIndex((header) =>
    normalizedCandidates.some(
      (candidate) => header === candidate || header.includes(candidate),
    ),
  );
}

function parseTaiwanTimestamp(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;

  const matched = raw.match(
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(上午|下午)\s+(\d{1,2}):(\d{2}):(\d{2})$/,
  );

  if (matched) {
    const [, y, m, d, period, hh, mm, ss] = matched;
    let hour = Number(hh);
    if (period === "下午" && hour < 12) hour += 12;
    if (period === "上午" && hour === 12) hour = 0;

    return new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      hour,
      Number(mm),
      Number(ss),
    ).toISOString();
  }

  const fallback = new Date(raw);
  if (!Number.isNaN(fallback.getTime())) return fallback.toISOString();

  return null;
}

function mapImportedStatus(value: string): OrderStatus {
  const normalized = value.trim();

  if (normalized === "已出貨") return "shipped";
  if (normalized === "已付款") return "paid";
  if (normalized === "待處理") return "pending";
  if (normalized === "已完成") return "completed";
  if (normalized === "已取消") return "cancelled";

  return "placed";
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

// import InventoryItem if available, else define simple type
interface LocalInventoryItem {
  id: number;
  brand: string;
  name: string;
  style: string;
  size: string;
  quantity: number;
  stockQuantity: number;
  twdCost: number;
}

export default function OrdersPage() {
  // 1. 初始化變成空陣列，等待從 API 抓資料
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventoryItems, setInventoryItems] = useState<LocalInventoryItem[]>(
    [],
  );
  const [, setIsLoading] = useState(true);

  const [form, setForm] = useState({
    customerName: "",
    storeNumber: "",
    storeName: "",
    transferCode: "",
    totalAmount: "",
    note: "",
    detail: "",
    lineName: "",
    email: "",
  });
  const [currentFilter, setCurrentFilter] = useState<FilterStatus>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchTargetStatus, setBatchTargetStatus] = useState<OrderStatus | "">(
    "",
  );
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [expandedDetails, setExpandedDetails] = useState<
    Record<string, boolean>
  >({});

  const toggleDetail = (orderId: string) => {
    setExpandedDetails((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  // --- 從後端 API 抓取資料 ---
  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(`API 發生錯誤，狀態碼：${res.status}`);
      }

      const formattedData = data.map((order: Order) => ({
        ...order,
        createdAt: new Date(order.createdAt).toLocaleString(),
      }));
      setOrders(formattedData);
    } catch (error) {
    } finally {
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch("/api/inventory");
      const data = await res.json();
      if (res.ok) {
        setInventoryItems(data);
      }
    } catch (error) {}
  };

  useEffect(() => {
    fetchOrders();
    fetchInventory();
  }, []);

  // --- 管理訂單與庫存的連動 ---
  const handleAddLinkItem = async (
    orderId: string,
    inventoryItemId: number,
    quantity: number,
    sellPriceTwd: number,
  ) => {
    if (!inventoryItemId || quantity <= 0) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryItemId,
          quantity,
          sellPriceTwd,
        }),
      });
      if (res.ok) {
        alert("已成功關聯庫存商品！");
        await fetchOrders(); // 重新抓取包含明細的訂單
        await fetchInventory(); // 更新庫存下拉單
      } else {
        const err = await res.json();
        alert(`關聯失敗：${err.error}`);
      }
    } catch (e) {
      alert("關聯發生錯誤");
    }
  };

  const handleRemoveLinkItem = async (itemId: number) => {
    if (!confirm("確定要解除關聯此商品嗎？")) return;
    try {
      const res = await fetch(`/api/orders/items/${itemId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert("已解除關聯！");
        await fetchOrders();
        await fetchInventory(); // 更新庫存下拉單
      } else {
        alert("解除關聯失敗");
      }
    } catch (e) {
      alert("解除發生錯誤");
    }
  };

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
    if (!form.customerName || !form.totalAmount) return;

    const payload = {
      customerName: form.customerName,
      storeNumber: form.storeNumber || null,
      storeName: form.storeName || null,
      transferCode: form.transferCode || null,
      totalAmount: Number(form.totalAmount),
      note: form.note || null,
      detail: form.detail || null,
      lineName: form.lineName || null,
      email: form.email || null,
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
          storeNumber: "",
          storeName: "",
          transferCode: "",
          totalAmount: "",
          note: "",
          detail: "",
          lineName: "",
          email: "",
        });
      }
    } catch (error) {
      alert("新增訂單發生錯誤");
    }
  };

  const handleBatchImport = async () => {
    if (!importFile) {
      alert("請先選擇 CSV 檔案");
      return;
    }

    try {
      setIsImporting(true);

      const csvText = await importFile.text();
      const rows = parseCsvRows(csvText);

      if (rows.length < 2) {
        alert("CSV 內容不足，至少需要標題列與一筆資料");
        return;
      }

      const rawHeaders = rows[0];
      const headers = rawHeaders.map((h) => normalizeHeader(h));

      const idxTime = findHeaderIndex(headers, ["時間戳記", "時間"]);
      const idxName = findHeaderIndex(headers, ["姓名", "第7欄"]);
      const idxStoreNumber = findHeaderIndex(headers, [
        "取件超商（7-11店號）",
        "店號",
      ]);
      const idxStoreName = findHeaderIndex(headers, [
        "取件超商（7-11店名）",
        "店名",
      ]);
      const idxTransferCode = findHeaderIndex(headers, ["匯款後五碼"]);
      const idxAmount = findHeaderIndex(headers, ["匯款金額", "金額"]);
      const idxDetail = findHeaderIndex(headers, ["訂單明細"]);
      const idxLineName = findHeaderIndex(headers, [
        "群組內的名字",
        "Line名字",
      ]);
      const idxEmail = findHeaderIndex(headers, ["電子郵件地址", "Email"]);
      const idxStatus = findHeaderIndex(headers, ["訂單狀況", "狀態"]);
      const noteIndexes = headers.reduce<number[]>((acc, header, index) => {
        if (header === "備註") acc.push(index);
        return acc;
      }, []);

      if (idxName < 0 || idxAmount < 0) {
        alert("CSV 缺少必要欄位：姓名 或 金額");
        return;
      }

      const payloadOrders: ImportOrderPayload[] = rows
        .slice(1)
        .map((cols) => {
          const customerName = (cols[idxName] || "").trim();
          const amountRaw = (cols[idxAmount] || "").replace(/,/g, "").trim();
          const totalAmount = Number(amountRaw);
          const note = noteIndexes
            .map((i) => cols[i]?.trim() || "")
            .filter(Boolean)
            .join(" / ");
          const timeRaw = idxTime >= 0 ? cols[idxTime] || "" : "";
          const statusRaw = idxStatus >= 0 ? cols[idxStatus] || "" : "";

          return {
            time: parseTaiwanTimestamp(timeRaw),
            customerName,
            storeNumber:
              idxStoreNumber >= 0 ? cols[idxStoreNumber]?.trim() || null : null,
            storeName:
              idxStoreName >= 0 ? cols[idxStoreName]?.trim() || null : null,
            transferCode:
              idxTransferCode >= 0
                ? cols[idxTransferCode]?.trim() || null
                : null,
            totalAmount,
            note: note || null,
            detail: idxDetail >= 0 ? cols[idxDetail]?.trim() || null : null,
            lineName:
              idxLineName >= 0 ? cols[idxLineName]?.trim() || null : null,
            email: idxEmail >= 0 ? cols[idxEmail]?.trim() || null : null,
            status: mapImportedStatus(statusRaw),
          };
        })
        .filter((row) => row.customerName && !Number.isNaN(row.totalAmount));

      if (payloadOrders.length === 0) {
        alert("找不到可匯入資料，請確認 CSV 欄位與內容");
        return;
      }

      const res = await fetch("/api/orders/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders: payloadOrders }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result?.error || "匯入失敗");
      }

      await fetchOrders();
      setImportFile(null);
      setFileInputKey((prev) => prev + 1);

      alert(
        `匯入完成：成功 ${result.createdCount} 筆，失敗 ${result.failedCount} 筆`,
      );
    } catch (error) {
      alert("批次匯入失敗，請確認檔案格式");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-8">
        {/* 新增訂單區塊 (與之前相同) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-xl">
              📝
            </div>
            <h2 className="text-xl font-bold text-slate-800">建立新訂單</h2>
          </div>

          <form onSubmit={handleCreateOrder} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={form.customerName}
                  onChange={(e) =>
                    setForm({ ...form, customerName: e.target.value })
                  }
                  placeholder="輸入客戶姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  店號
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={form.storeNumber}
                  onChange={(e) =>
                    setForm({ ...form, storeNumber: e.target.value })
                  }
                  placeholder="輸入店號"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  店名
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={form.storeName}
                  onChange={(e) =>
                    setForm({ ...form, storeName: e.target.value })
                  }
                  placeholder="輸入店名"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  匯款後五碼
                </label>
                <input
                  type="text"
                  maxLength={5}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={form.transferCode}
                  onChange={(e) =>
                    setForm({ ...form, transferCode: e.target.value })
                  }
                  placeholder="例：12345"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  金額 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={form.totalAmount}
                  onChange={(e) =>
                    setForm({ ...form, totalAmount: e.target.value })
                  }
                  placeholder="輸入金額"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Line名字
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={form.lineName}
                  onChange={(e) =>
                    setForm({ ...form, lineName: e.target.value })
                  }
                  placeholder="輸入 Line 名字"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="輸入 Email"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  備註
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="選填備註"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                訂單明細
              </label>
              <textarea
                rows={3}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                value={form.detail}
                onChange={(e) => setForm({ ...form, detail: e.target.value })}
                placeholder="輸入訂單商品明細"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 text-white font-medium px-8 py-2.5 rounded-lg hover:bg-blue-700 transition-all"
              >
                新增訂單
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 text-xl">
              📥
            </div>
            <h2 className="text-xl font-bold text-slate-800">批次匯入訂單</h2>
          </div>

          <p className="text-sm text-slate-500 mb-4">
            支援 Google 表單回覆
            CSV，會自動對應：時間、姓名、店號、店名、匯款後五碼、金額、備註、訂單明細、Line名字、Email。
          </p>

          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <input
              key={fileInputKey}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-emerald-700 file:font-medium hover:file:bg-emerald-100"
            />
            <button
              type="button"
              onClick={handleBatchImport}
              disabled={!importFile || isImporting}
              className="shrink-0 bg-emerald-600 text-white font-medium px-6 py-2.5 rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? "匯入中..." : "批次匯入"}
            </button>
          </div>
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
          <div className="overflow-y-auto max-h-150">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-white sticky top-0 z-10 shadow-[inset_0_-1px_0_0_#e2e8f0]">
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
                    狀態
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    訂單號 / 時間
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    訂單明細
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    姓名 / Line
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    店號 / 店名
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    匯款後五碼
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    金額
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Email
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
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
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-xs font-bold text-slate-700">
                          {order.id}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {order.createdAt}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600 max-w-50 relative group">
                        <div
                          className={`${expandedDetails[order.id] ? "whitespace-pre-wrap wrap-break-word" : "truncate"}`}
                          title="點擊展開/收合明細"
                        >
                          {order.detail || "-"}
                        </div>
                        {order.note && (
                          <div
                            className={`text-xs text-slate-400 mt-0.5 ${expandedDetails[order.id] ? "whitespace-pre-wrap wrap-break-word" : "truncate"}`}
                            title="點擊展開/收合備註"
                          >
                            備註：{order.note}
                          </div>
                        )}
                        {/* 提示展開的小圖示，在滑過時顯示 (或根據狀態顯示) */}
                        {(order.detail || order.note || true) && (
                          <div
                            className="absolute right-0 top-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-blue-500 text-xs bg-white/80 rounded px-1 border"
                            onClick={() => toggleDetail(order.id)}
                          >
                            {expandedDetails[order.id] ? "收合" : "展開"}
                          </div>
                        )}

                        {/* 顯示關聯庫存區塊 - 當狀態為 expanded 時顯示 */}
                        {expandedDetails[order.id] && (
                          <div
                            className="mt-4 pt-3 border-t border-slate-100 cursor-default"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <h4 className="font-bold text-xs text-slate-700 mb-2 flex items-center justify-between">
                              關聯庫存商品
                              {order.isDeducted && (
                                <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                                  已扣減庫存
                                </span>
                              )}
                            </h4>

                            {order.items && order.items.length > 0 ? (
                              <ul className="space-y-1.5 mb-3">
                                {order.items.map((item) => (
                                  <li
                                    key={item.id}
                                    className="flex items-center justify-between text-xs bg-slate-50 p-1.5 rounded border border-slate-100"
                                  >
                                    <span
                                      className="truncate pr-2"
                                      title={`${item.brand || ""} ${item.name || ""}`}
                                    >
                                      {item.brand || ""} {item.name || ""}{" "}
                                      {item.style ? `(${item.style})` : ""} -{" "}
                                      {item.size}{" "}
                                      <strong className="text-blue-600 ml-1">
                                        x{item.quantity}
                                      </strong>
                                    </span>
                                    {(!order.isDeducted ||
                                      order.status !== "completed") && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveLinkItem(item.id);
                                        }}
                                        className="text-red-500 hover:text-red-700 opacity-60 hover:opacity-100 shrink-0"
                                      >
                                        移除
                                      </button>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="text-xs text-slate-400 mb-3 italic">
                                尚無關聯商品
                              </div>
                            )}

                            {(!order.isDeducted ||
                              order.status !== "completed") && (
                              <div className="flex flex-col gap-2 mt-2">
                                <select
                                  id={`select-inv-${order.id}`}
                                  className="w-full text-xs border border-slate-200 rounded p-1.5 bg-white outline-none focus:border-blue-400"
                                >
                                  <option value="">-- 選擇庫存商品 --</option>
                                  {inventoryItems.map((inv) => {
                                    if (inv.stockQuantity > 0) {
                                      return (
                                        <option key={inv.id} value={inv.id}>
                                          {inv.brand} {inv.name} {inv.style}{" "}
                                          {inv.size} (餘: {inv.stockQuantity})
                                        </option>
                                      );
                                    }
                                    return null;
                                  })}
                                </select>
                                <div className="flex gap-2">
                                  <input
                                    type="number"
                                    id={`qty-inv-${order.id}`}
                                    defaultValue={1}
                                    min={1}
                                    className="w-16 text-xs border border-slate-200 rounded p-1.5 outline-none focus:border-blue-400"
                                    placeholder="數量"
                                  />
                                  <input
                                    type="number"
                                    id={`price-inv-${order.id}`}
                                    defaultValue={0}
                                    min={0}
                                    className="flex-1 text-xs border border-slate-200 rounded p-1.5 outline-none focus:border-blue-400"
                                    placeholder="銷售金額 (TWD)"
                                  />
                                  <button
                                    type="button"
                                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 text-xs px-3 py-1.5 rounded font-medium transition-colors whitespace-nowrap"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const invId = (
                                        document.getElementById(
                                          `select-inv-${order.id}`,
                                        ) as HTMLSelectElement
                                      ).value;
                                      const qty = (
                                        document.getElementById(
                                          `qty-inv-${order.id}`,
                                        ) as HTMLInputElement
                                      ).value;
                                      const price = (
                                        document.getElementById(
                                          `price-inv-${order.id}`,
                                        ) as HTMLInputElement
                                      ).value;
                                      if (invId)
                                        handleAddLinkItem(
                                          order.id,
                                          Number(invId),
                                          Number(qty),
                                          Number(price),
                                        );
                                    }}
                                  >
                                    加入關聯
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                        <div>{order.customerName}</div>
                        <div className="text-green-600 font-bold text-5">
                          {order.lineName}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {order.storeNumber && (
                          <div className="text-xs font-semibold text-slate-700">
                            # {order.storeNumber}
                          </div>
                        )}
                        {order.storeName && (
                          <div className="text-xs text-slate-500">
                            {order.storeName}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700 font-mono">
                        {order.transferCode || "-"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-blue-950">
                        NT$ {order.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {order.email && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            ✉️ {order.email}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
