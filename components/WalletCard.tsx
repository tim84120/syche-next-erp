import { WalletStats } from "../app/types/index";

export default function WalletCard({ stats }: { stats: WalletStats }) {
  return (
    <div className="bg-linear-to-br from-blue-600 to-indigo-800 rounded-2xl shadow-lg p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
      {/* 裝飾背景圈圈 */}
      <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-white opacity-10 rounded-full blur-2xl pointer-events-none"></div>

      <div className="relative">
        <h2 className="text-blue-100 text-sm font-medium mb-2 uppercase tracking-wider">
          泰銖資金池可用餘額
        </h2>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-extrabold tracking-tight">
            {stats.balance.toLocaleString()}
          </span>
          <span className="text-xl font-medium text-blue-100">THB</span>
        </div>
      </div>

      <div className="relative w-full md:w-auto bg-black/10 backdrop-blur-sm rounded-xl p-5 border border-white/30 text-right">
        <p className="text-blue-100 text-sm font-medium mb-1">
          系統動態平均匯率
        </p>
        <div className="text-3xl font-bold">{stats.avgRate.toFixed(4)}</div>
        <p className="text-xs text-blue-100 mt-1 opacity-80">
          進貨將自動套用此基準
        </p>
      </div>
    </div>
  );
}
