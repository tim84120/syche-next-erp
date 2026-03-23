import { useState } from "react";

interface Props {
  onAddRecord: (twd: number, thb: number, date: string) => void;
}

const getTodayLocalDate = () => new Date().toLocaleDateString("en-CA");

export default function ExchangeForm({ onAddRecord }: Props) {
  const [form, setForm] = useState({
    twd: "",
    thb: "",
    date: getTodayLocalDate(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.twd || !form.thb || !form.date) return;

    // 將整理好的資料傳給父元件
    onAddRecord(Number(form.twd), Number(form.thb), form.date);
    setForm({ twd: "", thb: "", date: getTodayLocalDate() }); // 清空表單
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-xl">
          💱
        </div>
        <h2 className="text-xl font-bold text-slate-800">登錄換匯紀錄</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            換匯日期
          </label>
          <input
            type="date"
            required
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            支付總台幣 (TWD)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
              NT$
            </span>
            <input
              type="number"
              required
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none"
              value={form.twd}
              onChange={(e) => setForm({ ...form, twd: e.target.value })}
              placeholder="例如: 10000"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            換得總泰銖 (THB)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
              ฿
            </span>
            <input
              type="number"
              required
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none"
              value={form.thb}
              onChange={(e) => setForm({ ...form, thb: e.target.value })}
              placeholder="例如: 11200"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full bg-slate-900 text-white font-medium py-3 rounded-lg hover:bg-slate-800 active:scale-[0.98] transition-all mt-2"
        >
          存入資金池
        </button>
      </form>
    </div>
  );
}
