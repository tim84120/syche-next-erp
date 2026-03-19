interface PurchaseOrder {
  id: number;
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
}: {
  purchaseOrders: PurchaseOrder[];
}) {
  if (purchaseOrders.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center text-slate-500">
        目前沒有任何採購訂單
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">採購訂單列表</h2>
        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-medium">
          共 {purchaseOrders.length} 筆
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                日期
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
                className="hover:bg-slate-50/50 transition-colors"
              >
                <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                  {new Date(order.createdAt).toLocaleDateString()}
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
                  <div className="text-sm text-slate-500">
                    數量: {order.quantity}
                  </div>
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
