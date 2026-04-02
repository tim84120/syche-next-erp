import React, { useState } from "react";
import type { PurchaseOrder } from "~/types/index";
import { useI18n } from "@/lib/i18n";

export default function PurchaseOrderTable({
  purchaseOrders,
  onImportSelected,
  onItemStatusChange,
}: {
  purchaseOrders: PurchaseOrder[];
  onImportSelected: (orders: PurchaseOrder[]) => void;
  onItemStatusChange?: (itemId: number, newStatus: 1 | 2 | 3 | 4) => void;
}) {
  const { t } = useI18n();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [orderedByFilter, setOrderedByFilter] = useState<
    "all" | "WangNa" | "Shu" | "Tim"
  >("all");

  const filteredOrders = purchaseOrders.filter((order) =>
    orderedByFilter === "all" ? true : order.orderedBy === orderedByFilter,
  );

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(
        new Set(filteredOrders.filter((o) => o.status === 0).map((o) => o.id)),
      );
    } else {
      setSelectedIds(new Set());
    }
  };
  // 進貨的部分幫我加上幾個狀態，["已下單", "已到貨(TH)", "已出貨(TH)", "已到貨(TW)"]

  const handleSelectOne = (id: number, checked: boolean) => {
    const newSaved = new Set(selectedIds);
    if (checked) {
      newSaved.add(id);
    } else {
      newSaved.delete(id);
    }
    setSelectedIds(newSaved);
  };

  const handleImport = () => {
    const selectedOrders = filteredOrders.filter((o) => selectedIds.has(o.id));
    onImportSelected(selectedOrders);
    setSelectedIds(new Set()); // Reset selection after import
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (purchaseOrders.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center text-slate-500">
        {t("purchaseOrderTable.empty", "目前沒有任何採購訂單")}
      </div>
    );
  }

  const pendingCount = filteredOrders.filter((o) => o.status === 0).length;
  const statusMap = [
    {
      value: 0,
      label: t("status.0", "待處理"),
      color: "bg-amber-100 text-amber-700",
    },
    {
      value: 1,
      label: t("status.1", "已下單"),
      color: "bg-amber-100 text-amber-700",
    },
    {
      value: 2,
      label: t("status.2", "已到貨(TH)"),
      color: "bg-blue-100 text-blue-700",
    },
    {
      value: 3,
      label: t("status.3", "已出貨(TH)"),
      color: "bg-blue-100 text-blue-700",
    },
    {
      value: 4,
      label: t("status.4", "已到貨(TW)"),
      color: "bg-green-100 text-green-700",
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <h2 className="text-xl font-bold text-slate-800">
          {t("purchaseOrderTable.title", "採購訂單列表")}
        </h2>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <select
            value={orderedByFilter}
            onChange={(e) => {
              setOrderedByFilter(
                e.target.value as "all" | "WangNa" | "Shu" | "Tim",
              );
              setSelectedIds(new Set());
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
          >
            <option value="all">
              {t("purchaseOrderTable.allOrderers", "全部下單人")}
            </option>
            <option value="WangNa">WangNa</option>
            <option value="Shu">Shu</option>
            <option value="Tim">Tim</option>
          </select>
          <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-medium">
            {t("purchaseOrderTable.total", "共")} {filteredOrders.length}{" "}
            {t("purchaseOrderTable.records", "筆")}
          </span>
          {selectedIds.size > 0 && (
            <button
              onClick={handleImport}
              className="bg-amber-500 text-white px-4 py-1 rounded-lg text-sm font-bold shadow-sm hover:bg-amber-600 transition-colors"
            >
              {t("purchaseOrderTable.importSelected", "匯入勾選項至進貨扣款")} (
              {selectedIds.size})
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto whitespace-pre break-keep">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="w-12 px-3 py-3 text-center text-sm font-semibold text-slate-600 sm:px-6 sm:py-4">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                  onChange={handleSelectAll}
                  checked={
                    selectedIds.size > 0 && selectedIds.size === pendingCount
                  }
                />
              </th>
              <th className="px-3 py-3 text-sm font-semibold text-slate-600 sm:px-6 sm:py-4">
                {t("purchaseOrderTable.status", "狀態")}
              </th>
              <th className="px-3 py-3 text-sm font-semibold text-slate-600 sm:px-6 sm:py-4">
                {t("purchaseOrderTable.orderDate", "單號 / 日期")}
              </th>
              <th className="px-3 py-3 text-sm font-semibold text-slate-600 sm:px-6 sm:py-4">
                {t("purchaseOrderForm.orderedBy", "下單人")}
              </th>
              <th className="px-3 py-3 text-sm font-semibold text-slate-600 sm:px-6 sm:py-4">
                {t("purchaseOrderTable.product", "品牌 / 品名")}
              </th>
              <th className="px-3 py-3 text-sm font-semibold text-slate-600 sm:px-6 sm:py-4">
                {t("purchaseOrderTable.styleSize", "款式 / 尺寸")}
              </th>
              <th className="px-3 py-3 text-sm font-semibold text-slate-600 sm:px-6 sm:py-4">
                {t("purchaseOrderForm.qty", "數量")}
              </th>
              <th className="px-3 py-3 text-sm font-semibold text-slate-600 sm:px-6 sm:py-4">
                {t("purchaseOrderForm.link", "連結")}
              </th>
              <th className="px-3 py-3 text-sm font-semibold text-slate-600 sm:px-6 sm:py-4">
                {t("common.note", "備註")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredOrders.map((order) => (
              <React.Fragment key={order.id}>
                <tr
                  onClick={() => toggleExpand(order.id)}
                  className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${
                    selectedIds.has(order.id) ? "bg-amber-50/30" : ""
                  }`}
                >
                  <td
                    className="px-3 py-3 text-center sm:px-6 sm:py-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                      checked={selectedIds.has(order.id)}
                      onChange={(e) =>
                        handleSelectOne(order.id, e.target.checked)
                      }
                      disabled={order.status !== 0}
                    />
                  </td>
                  <td className="px-3 py-3 sm:px-6 sm:py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusMap.find((s) => s.value === order.status)?.color || ""}`}
                    >
                      {statusMap.find((s) => s.value === order.status)?.label ||
                        "-"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 sm:px-6 sm:py-4">
                    <div className="font-mono text-xs text-slate-600 font-bold mb-1">
                      {order.orderNumber || "-"}
                    </div>
                    <div className="text-sm text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-slate-700 font-medium">
                    {order.orderedBy || "-"}
                  </td>
                  <td className="px-3 py-3 sm:px-6 sm:py-4">
                    <div className="font-medium text-slate-900">
                      {order.brand}
                    </div>
                    <div className="text-sm text-slate-500">{order.name}</div>
                  </td>
                  <td className="px-3 py-3 sm:px-6 sm:py-4">
                    <div className="text-sm text-slate-800">{order.style}</div>
                    <div className="text-sm text-slate-500">
                      {t("common.size", "Size")}: {order.size}
                    </div>
                  </td>
                  <td className="px-3 py-3 sm:px-6 sm:py-4">
                    <div className="text-sm text-slate-500">
                      {order.quantity}
                    </div>
                  </td>
                  <td
                    className="px-3 py-3 sm:px-6 sm:py-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a
                      href={order.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium underline underline-offset-2"
                    >
                      {t("purchaseOrderTable.viewProduct", "查看此商品")}
                    </a>
                  </td>
                  <td className="max-w-xs truncate px-3 py-3 text-sm text-slate-600 sm:px-6 sm:py-4">
                    {order.note || "-"}
                  </td>
                </tr>
                {expandedId === order.id &&
                  order.inventoryItems &&
                  order.inventoryItems.length > 0 && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={9} className="px-3 py-3 sm:px-6 sm:py-4">
                        <div className="pl-2 sm:pl-12">
                          <h4 className="text-sm font-semibold text-slate-700 mb-2">
                            {t("purchaseOrderTable.importDetail", "進貨明細")}
                          </h4>
                          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                <tr>
                                  <th className="px-4 py-2">商品 ID</th>
                                  <th className="px-4 py-2">
                                    {t("purchaseOrderForm.qty", "數量")}
                                  </th>
                                  <th className="px-4 py-2">
                                    {t("purchaseOrderTable.status", "狀態")}
                                  </th>
                                  <th className="px-4 py-2">
                                    {t(
                                      "purchaseOrderTable.thbCost",
                                      "進價 (THB)",
                                    )}
                                  </th>
                                  <th className="px-4 py-2">
                                    {t("purchaseOrderTable.rate", "換算匯率")}
                                  </th>
                                  <th className="px-4 py-2">
                                    {t(
                                      "purchaseOrderTable.totalCost",
                                      "總成本 (TWD)",
                                    )}
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {order.inventoryItems.map((item) => (
                                  <tr
                                    key={item.id}
                                    className="hover:bg-slate-50"
                                  >
                                    <td className="px-4 py-2 text-slate-600 font-mono">
                                      #{item.id}
                                    </td>
                                    <td className="px-4 py-2 text-slate-600 font-mono">
                                      {item.quantity}
                                    </td>
                                    <td className="px-4 py-2 text-slate-600">
                                      <select
                                        className="bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                                        value={item.status || 1}
                                        onChange={(e) =>
                                          onItemStatusChange?.(
                                            item.id,
                                            Number(e.target.value) as
                                              | 1
                                              | 2
                                              | 3
                                              | 4,
                                          )
                                        }
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {statusMap
                                          .filter(
                                            (status) => status.value !== 0,
                                          )
                                          .map((status) => (
                                            <option
                                              key={status.value}
                                              value={status.value}
                                            >
                                              {status.label}
                                            </option>
                                          ))}
                                      </select>
                                    </td>
                                    <td className="px-4 py-2 text-amber-600 font-medium">
                                      {item.foreignCost}
                                    </td>
                                    <td className="px-4 py-2 text-slate-500">
                                      {item.appliedRate.toFixed(4)}
                                    </td>
                                    <td className="px-4 py-2 text-slate-800 font-medium">
                                      {item.twdCost}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                {expandedId === order.id &&
                  (!order.inventoryItems ||
                    order.inventoryItems.length === 0) && (
                    <tr className="bg-slate-50/50">
                      <td
                        colSpan={9}
                        className="px-6 py-4 text-center text-sm text-slate-500"
                      >
                        {t(
                          "purchaseOrderTable.noLinked",
                          "尚未有關聯的進貨紀錄",
                        )}
                      </td>
                    </tr>
                  )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
