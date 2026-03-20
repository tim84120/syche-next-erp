import type { InventoryItemMaxAggregateOutputType } from "@/generated/prisma/models/InventoryItem";

export default function InventoryTable({
  inventory,
}: {
  inventory: InventoryItemMaxAggregateOutputType[];
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h2 className="text-lg font-bold text-slate-800">庫存與精準成本明細</h2>
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
                className="px-8 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider"
              >
                品牌 / 品名
              </th>
              <th
                scope="col"
                className="px-8 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider"
              >
                進貨數量
              </th>
              <th
                scope="col"
                className="px-8 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider"
              >
                外幣進價
              </th>
              <th
                scope="col"
                className="px-8 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider"
              >
                鎖定匯率
              </th>
              <th
                scope="col"
                className="px-8 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider"
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
                  <td className="px-8 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                    <div className="font-medium text-slate-900">
                      {item.brand}
                    </div>
                    <div className="text-sm text-slate-500">{item.name}</div>
                  </td>
                  <td className="px-8 py-4 whitespace-nowrap text-sm text-slate-600">
                    <span className="bg-slate-100 px-2.5 py-1 rounded-md font-semibold">
                      {item.quantity}
                    </span>
                  </td>
                  <td className="px-8 py-4 whitespace-nowrap text-sm font-medium text-teal-600">
                    {item.foreignCost?.toLocaleString()} THB
                  </td>
                  <td className="px-8 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">
                    {item.appliedRate?.toFixed(4)}
                  </td>
                  <td className="px-8 py-4 whitespace-nowrap text-sm font-bold text-slate-800">
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
