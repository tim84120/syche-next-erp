"use client";

import type { InventoryItem } from "@/app/types/index";
import { statusMap } from "@/constants";
import { useSession } from "next-auth/react";
import { useState } from "react";

export default function InventoryTable({
  inventory,
  onRefresh,
}: {
  inventory: InventoryItem[];
  onRefresh?: () => void;
}) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleRecalculate = async () => {
    if (
      !confirm(
        "確定要重新計算所有進貨商品的鎖定匯率嗎？\n這將會根據最新的換匯紀錄重新分配所有商品的台幣成本。",
      )
    ) {
      return;
    }

    setIsRecalculating(true);
    try {
      const res = await fetch("/api/inventory/recalculate", {
        method: "POST",
      });
      if (res.ok) {
        alert("重新計算完成！");
        if (onRefresh) onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || "重新計算失敗");
      }
    } catch (error) {
      console.error(error);
      alert("重新計算發生錯誤");
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-4">
          進貨/庫存
          {isAdmin && (
            <button
              onClick={handleRecalculate}
              disabled={isRecalculating}
              aria-label={isRecalculating ? "計算中" : "重新整理匯率成本"}
              title={isRecalculating ? "計算中" : "重新整理匯率成本"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100 disabled:opacity-50"
            >
              {isRecalculating ? (
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    className="stroke-current opacity-25"
                    strokeWidth="3"
                  />
                  <path
                    d="M21 12a9 9 0 0 0-9-9"
                    className="stroke-current"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M20 4v6h-6"
                    className="stroke-current"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 20v-6h6"
                    className="stroke-current"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M20 10a8 8 0 0 0-14-3M4 14a8 8 0 0 0 14 3"
                    className="stroke-current"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          )}
        </h2>
        <span className="text-sm text-slate-500 font-medium">
          共 {inventory.length} 筆紀錄
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th
                scope="col"
                className="px-4 py-2 lg:px-8 lg:py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider"
              >
                ID
              </th>
              <th
                scope="col"
                className="px-4 py-2 lg:px-8 lg:py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider"
              >
                品牌 / 品名
              </th>
              <th
                scope="col"
                className="px-4 py-2 lg:px-8 lg:py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-24"
              >
                庫存數量
              </th>
              <th
                scope="col"
                className="px-4 py-2 lg:px-8 lg:py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-24"
              >
                進貨數量
              </th>
              <th
                scope="col"
                className="px-4 py-2 lg:px-8 lg:py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider"
              >
                外幣進價
              </th>
              <th
                scope="col"
                className="px-4 py-2 lg:px-8 lg:py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider"
              >
                鎖定匯率
              </th>
              <th
                scope="col"
                className="px-4 py-2 lg:px-8 lg:py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider"
              >
                狀態
              </th>
              <th
                scope="col"
                className="px-4 py-2 lg:px-8 lg:py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider"
              >
                台幣單件成本
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {inventory.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-8 py-12 text-center text-slate-400 font-medium"
                >
                  尚無進貨紀錄，請先登錄換匯後再進行商品進貨。
                </td>
              </tr>
            ) : (
              inventory.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-4 py-2 lg:px-8 lg:py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                    #{item.id}
                  </td>
                  <td className="px-4 py-2 lg:px-8 lg:py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                    <div className="font-medium text-slate-900">
                      {item.brand}
                    </div>
                    <div className="text-sm text-slate-500">{item.name}</div>
                  </td>
                  <td className="px-4 py-2 lg:px-8 lg:py-4 whitespace-nowrap text-sm text-center text-slate-600">
                    <span className="bg-slate-100 px-2.5 py-1 rounded-md font-semibold">
                      {item.stockQuantity}
                    </span>
                  </td>
                  <td className="px-4 py-2 lg:px-8 lg:py-4 whitespace-nowrap text-sm text-center text-slate-600">
                    <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md font-semibold">
                      {item.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-2 lg:px-8 lg:py-4 whitespace-nowrap text-sm font-medium text-teal-600">
                    {item.foreignCost?.toLocaleString()} THB
                  </td>
                  <td className="px-4 py-2 lg:px-8 lg:py-4 whitespace-nowrap text-sm text-slate-400 font-mono">
                    {item.appliedRate?.toFixed(4)}
                  </td>
                  <td className="px-4 py-2 lg:px-8 lg:py-4 whitespace-nowrap text-sm text-slate-500">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusMap.find((status) => status.value === item.status)?.color}`}
                    >
                      {statusMap.find((status) => status.value === item.status)
                        ?.label || "已下單"}
                    </span>
                  </td>
                  <td className="px-4 py-2 lg:px-8 lg:py-4 whitespace-nowrap text-sm font-bold text-slate-800">
                    NT$ {item.twdCost?.toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
