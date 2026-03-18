import { useState } from 'react';
import { WalletStats } from '../app/types';

interface Props {
  walletStats: WalletStats;
  onAddProduct: (name: string, foreignCost: number, quantity: number) => void;
}

export default function ProductForm({ walletStats, onAddProduct }: Props) {
  const [form, setForm] = useState({ name: '', foreignCost: '', quantity: '1' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.foreignCost) return;
    
    const costThb = Number(form.foreignCost);
    const qty = Number(form.quantity);
    
    if (walletStats.balance < (costThb * qty)) {
      return alert('餘額不足，請先新增換匯紀錄！');
    }

    onAddProduct(form.name, costThb, qty);
    setForm({ name: '', foreignCost: '', quantity: '1' });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 text-xl">📦</div>
        <h2 className="text-xl font-bold text-slate-800">商品進貨扣款</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">商品名稱</label>
          <input type="text" required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" 
            value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="輸入商品名稱或型號" />
        </div>
        
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">單件進價 (THB)</label>
            <input type="number" required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" 
              value={form.foreignCost} onChange={e => setForm({...form, foreignCost: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">進貨數量</label>
            <input type="number" min="1" required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" 
              value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
          </div>
        </div>
        
        <div className="bg-slate-50 rounded-lg p-4 flex justify-between items-center border border-slate-100">
          <span className="text-sm font-medium text-slate-500">預估單件台幣成本</span>
          <span className="text-lg font-bold text-slate-800">
            NT$ {form.foreignCost ? Math.round(Number(form.foreignCost) * walletStats.avgRate).toLocaleString() : 0}
          </span>
        </div>

        <button type="submit" disabled={walletStats.balance <= 0} className="w-full bg-amber-500 text-white font-medium py-3 rounded-lg hover:bg-amber-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2">
          確認進貨並扣除餘額
        </button>
      </form>
    </div>
  );
}