"use client";

import { useEffect, useState, useCallback, useMemo } from "react";

type ExpenseType = "shipping" | "misc";

interface Expense {
  id: number;
  type: ExpenseType;
  title: string;
  amountThb: number;
  amountTwd: number;
  appliedRate: number;
  paymentMethod: string;
  date: string;
  createdAt: string;
}

const typeMap: Record<
  ExpenseType,
  { label: string; icon: string; colorClass: string }
> = {
  shipping: {
    label: "運費",
    icon: "🚚",
    colorClass: "bg-blue-100 text-blue-700 border-blue-200",
  },
  misc: {
    label: "雜支",
    icon: "🧾",
    colorClass: "bg-amber-100 text-amber-700 border-amber-200",
  },
};

function getTodayLocalDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [type, setType] = useState<ExpenseType>("shipping");
  const [title, setTitle] = useState("");
  const [currency, setCurrency] = useState<"thb" | "twd">("thb");
  const [amountThb, setAmountThb] = useState("");
  const [directAmountTwd, setDirectAmountTwd] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cardAmountTwd, setCardAmountTwd] = useState("");
  const [date, setDate] = useState(getTodayLocalDate());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter State
  const [typeFilter, setTypeFilter] = useState<"all" | ExpenseType>("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "cash" | "card">(
    "all",
  );
  const [searchTitle, setSearchTitle] = useState("");

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/expenses");
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountValid = currency === "thb" ? !!amountThb : !!directAmountTwd;
    if (!title.trim() || !date || !amountValid) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: title.trim(),
          amountThb: currency === "thb" ? Number(amountThb) : 0,
          paymentMethod,
          date,
          cardAmountTwd:
            currency === "thb" && paymentMethod === "card" && cardAmountTwd
              ? Number(cardAmountTwd)
              : 0,
          directAmountTwd: currency === "twd" ? Number(directAmountTwd) : 0,
        }),
      });

      if (res.ok) {
        alert("新增成功！如果是現金方式，將會自動由資金池依批次扣除。");
        setTitle("");
        setAmountThb("");
        setDirectAmountTwd("");
        setCardAmountTwd("");
        setDate(getTodayLocalDate());

        // Refresh exchanges if any caching was used or trigger full inventory recalculate to be safe?
        // Let's call /api/inventory/recalculate to be consistent with purchases
        await fetch("/api/inventory/recalculate", { method: "POST" });
        await fetchExpenses();
      } else {
        const err = await res.json();
        alert(`新增失敗：${err.error}`);
      }
    } catch {
      alert("發生不可預期的錯誤");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("確定要刪除這筆支出紀錄嗎？")) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (res.ok) {
        alert("刪除成功！");
        await fetch("/api/inventory/recalculate", { method: "POST" });
        await fetchExpenses();
      } else {
        alert("刪除失敗");
      }
    } catch {
      alert("發生不可預期的錯誤");
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const matchType = typeFilter === "all" || exp.type === typeFilter;
      const matchPayment =
        paymentFilter === "all" || exp.paymentMethod === paymentFilter;
      const matchTitle =
        !searchTitle ||
        exp.title.toLowerCase().includes(searchTitle.toLowerCase());
      return matchType && matchPayment && matchTitle;
    });
  }, [expenses, typeFilter, paymentFilter, searchTitle]);

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 animate-fade-in pb-24">
      <div className="mb-8 p-6 bg-linear-to-r from-blue-600 to-indigo-700 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 rounded-full bg-white opacity-10 blur-2xl pointer-events-none"></div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight relative z-10 flex items-center gap-3">
          💸 運費與雜支管理
        </h1>
        <p className="mt-3 text-blue-100 text-lg font-medium relative z-10">
          管理並記錄各項泰國進貨相關支出，現金付款將依批次扣除泰銖資金池！
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="p-6 sm:p-8">
          <form className="max-w-4xl" onSubmit={handleSubmit}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl">
                ➕
              </div>
              <h2 className="text-xl font-bold text-slate-800">新增支出紀錄</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  支出類型
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`cursor-pointer border rounded-xl p-3 flex items-center justify-center gap-2 font-medium transition-all ${type === "shipping" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      checked={type === "shipping"}
                      onChange={() => setType("shipping")}
                    />
                    <span>🚚 運費</span>
                  </label>
                  <label
                    className={`cursor-pointer border rounded-xl p-3 flex items-center justify-center gap-2 font-medium transition-all ${type === "misc" ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      checked={type === "misc"}
                      onChange={() => setType("misc")}
                    />
                    <span>🧾 雜支</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  標題/說明
                </label>
                <input
                  type="text"
                  required
                  placeholder="如：1月份海運費、紙箱"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  支出日期
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              {currency === "thb" && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    扣款方式
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className={`cursor-pointer border rounded-xl p-3 flex justify-center gap-2 font-medium transition-all items-center ${paymentMethod === "cash" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        checked={paymentMethod === "cash"}
                        onChange={() => setPaymentMethod("cash")}
                      />
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <span>現金 (THB資金池)</span>
                    </label>
                    <label
                      className={`cursor-pointer border rounded-xl p-3 flex justify-center gap-2 font-medium transition-all items-center ${paymentMethod === "card" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        checked={paymentMethod === "card"}
                        onChange={() => setPaymentMethod("card")}
                      />
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                        />
                      </svg>
                      <span>信用卡</span>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  付款幣別
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`cursor-pointer border rounded-xl p-3 flex items-center justify-center gap-2 font-medium transition-all ${
                      currency === "thb"
                        ? "border-orange-500 bg-orange-50 text-orange-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      checked={currency === "thb"}
                      onChange={() => {
                        setCurrency("thb");
                        setPaymentMethod("cash");
                      }}
                    />
                    <span>🇹🇭 泰銖 (THB)</span>
                  </label>
                  <label
                    className={`cursor-pointer border rounded-xl p-3 flex items-center justify-center gap-2 font-medium transition-all ${
                      currency === "twd"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      checked={currency === "twd"}
                      onChange={() => {
                        setCurrency("twd");
                        setPaymentMethod("card");
                      }}
                    />
                    <span>🇹🇼 台幣 (TWD)</span>
                  </label>
                </div>
              </div>

              {currency === "thb" ? (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    泰銖金額 (THB)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-slate-400 font-medium">฿</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={amountThb}
                      onChange={(e) => setAmountThb(e.target.value)}
                      placeholder="0"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    台幣金額 (TWD)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-slate-400 font-medium">NT$</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={directAmountTwd}
                      onChange={(e) => setDirectAmountTwd(e.target.value)}
                      placeholder="0"
                      className="w-full pl-14 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              )}

              {currency === "thb" && paymentMethod === "card" && (
                <div className="animate-fade-in">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    台幣刷卡金額 (TWD){" "}
                    <span className="text-slate-400 font-normal text-xs ml-1">
                      選填
                    </span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-slate-400 font-medium">NT$</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={cardAmountTwd}
                      onChange={(e) => setCardAmountTwd(e.target.value)}
                      placeholder="不填則直接換算"
                      className="w-full pl-14 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-blue-700 shadow-sm transition-all focus:ring-4 focus:ring-blue-500/30 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? "新增中..." : "新增支出"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800">歷史支出</h2>
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-md">
              共 {filteredExpenses.length} 筆
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative max-w-50 w-full">
              <input
                type="text"
                placeholder="搜尋標題..."
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {searchTitle && (
                <button
                  type="button"
                  onClick={() => setSearchTitle("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              )}
            </div>

            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as "all" | ExpenseType)
              }
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">所有類別</option>
              <option value="shipping">運費</option>
              <option value="misc">雜支</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) =>
                setPaymentFilter(e.target.value as "all" | "cash" | "card")
              }
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">所有付款方式</option>
              <option value="cash">現金 (THB)</option>
              <option value="card">信用卡 (TWD)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 font-bold text-slate-500 text-sm whitespace-nowrap">
                  日期
                </th>
                <th className="px-6 py-4 font-bold text-slate-500 text-sm whitespace-nowrap">
                  類型 / 標題
                </th>
                <th className="px-6 py-4 font-bold text-slate-500 text-sm whitespace-nowrap text-right">
                  泰銖金額 (THB)
                </th>
                <th className="px-6 py-4 font-bold text-slate-500 text-sm whitespace-nowrap text-right">
                  台幣成本 (TWD)
                </th>
                <th className="px-6 py-4 font-bold text-slate-500 text-sm whitespace-nowrap text-center">
                  換算匯率
                </th>
                <th className="px-6 py-4 font-bold text-slate-500 text-sm whitespace-nowrap text-center">
                  付款方式
                </th>
                <th className="px-6 py-4 font-bold text-slate-500 text-sm whitespace-nowrap text-right">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    載入中...
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    目前沒有符合的支出紀錄
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr
                    key={exp.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {new Date(exp.date).toLocaleDateString("zh-TW", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-1 border rounded-md text-xs font-bold whitespace-nowrap ${typeMap[exp.type].colorClass}`}
                        >
                          {typeMap[exp.type].icon} {typeMap[exp.type].label}
                        </span>
                        <span className="font-semibold text-slate-800">
                          {exp.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <span className="font-mono font-medium text-slate-600">
                        ฿ {exp.amountThb.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <span className="font-bold text-blue-950 font-mono">
                        NT$ {exp.amountTwd.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-slate-500">
                      {exp.paymentMethod === "cash"
                        ? exp.appliedRate.toFixed(4)
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      {exp.paymentMethod === "cash" ? (
                        <div
                          title="現金從資金池扣除"
                          className="inline-flex text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md"
                        >
                          <svg
                            className="w-5 h-5 mx-auto"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                        </div>
                      ) : (
                        <div
                          title="刷卡付款"
                          className="inline-flex text-blue-600 bg-blue-50 px-2 py-1 rounded-md"
                        >
                          <svg
                            className="w-5 h-5 mx-auto"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                            />
                          </svg>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                        title="刪除紀錄"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
