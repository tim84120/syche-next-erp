import { useState } from "react";

export interface PurchaseOrder {
  id: number;
  orderNumber: string;
  brand: string;
  name: string;
  style: string;
  size: string;
  quantity: number;
  link: string;
  note: string | null;
  status: string;
  createdAt: string;
}

export default function PurchaseOrderTable({
  purchaseOrders,
  onImportSelected,
}: {
  purchaseOrders: PurchaseOrder[];
  onImportSelected: (orders: PurchaseOrder[]) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(
        new Set(
          purchaseOrders.filter((o) => o.status === "pending").map((o) => o.id),
        ),
      );
    } else {
      setSelectedIds(new Set());
    }
  };

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
    const selectedOrders = purchaseOrders.filter((o) => selectedIds.has(o.id));
    onImportSelected(selectedOrders);
    setSelectedIds(new Set()); // Reset selection after import
  };

  if (purchaseOrders.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center text-slate-500">
        目前沒有任何採購訂單
      </div>
    );
  }

  const pendingCount = purchaseOrders.filter(
    (o) => o.status === "pending",
  ).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">採購訂單列表</h2>
        <div className="flex items-center gap-4">
          <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-medium">
            共 {purchaseOrders.length} 筆
          </span>
          {selectedIds.size > 0 && (
            <button
              onClick={handleImport}
              className="bg-amber-500 text-white px-4 py-1 rounded-lg text-sm font-bold shadow-sm hover:bg-amber-600 transition-colors"
            >
              匯入勾選項至進貨扣款 ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 w-12 text-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                  onChange={handleSelectAll}
                  checked={
                    selectedIds.size > 0 && selectedIds.size === pendingCount
                  }
                />
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                單號 / 日期
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                品牌 / 品名
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                款式 / 尺寸
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                數量
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                連結
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                備註
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                狀態
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {purchaseOrders.map((order) => (
              <tr
                key={order.id}
                className={`hover:bg-slate-50/50 transition-colors ${selectedIds.has(order.id) ? "bg-amber-50/30" : ""}`}
              >
                <td className="px-6 py-4 text-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                    checked={selectedIds.has(order.id)}
                    onChange={(e) =>
                      handleSelectOne(order.id, e.target.checked)
                    }
                    disabled={order.status !== "pending"}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-mono text-xs text-slate-600 font-bold mb-1">
                    {order.orderNumber || "-"}
                  </div>
                  <div className="text-sm text-slate-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900">
                    {order.brand}
                  </div>
                  <div className="text-sm text-slate-500">{order.name}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-800">{order.style}</div>
                  <div className="text-sm text-slate-500">
                    Size: {order.size}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-500">{order.quantity}</div>
                </td>
                <td className="px-6 py-4">
                  <a
                    href={order.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium underline underline-offset-2"
                  >
                    查看此商品
                  </a>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                  {order.note || "-"}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                      order.status === "pending"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {order.status === "pending" ? "待處理" : order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
