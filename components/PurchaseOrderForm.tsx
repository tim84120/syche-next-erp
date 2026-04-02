import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export default function PurchaseOrderForm({
  onOrderAdded,
}: {
  onOrderAdded: () => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    brand: "",
    name: "",
    style: "",
    size: "",
    quantity: 1,
    link: "",
    note: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setForm({
          brand: "",
          name: "",
          style: "",
          size: "",
          quantity: 1,
          link: "",
          note: "",
        });
        onOrderAdded(); // 重新拉取資料或更新畫面
      } else {
        alert(t("purchaseOrderForm.addFailed", "新增失敗"));
      }
    } catch (err) {
      console.error(err);
      alert(t("common.unexpected", "發生錯誤"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:mb-8 sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-xl">
          🛒
        </div>
        <h2 className="text-xl font-bold text-slate-800">
          {t("purchaseOrderForm.title", "建立採購訂單")}
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            {t("product.brand", "品牌")}
          </label>
          <input
            type="text"
            required
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
            placeholder={t(
              "purchaseOrderForm.brandPlaceholder",
              "例如: Uniqlo",
            )}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            {t("product.name", "品名")}
          </label>
          <input
            type="text"
            required
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t(
              "purchaseOrderForm.namePlaceholder",
              "例如: 素色短T",
            )}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            {t("product.style", "款式")}
          </label>
          <input
            type="text"
            required
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            value={form.style}
            onChange={(e) => setForm({ ...form, style: e.target.value })}
            placeholder={t("purchaseOrderForm.stylePlaceholder", "例如: 黑色")}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            {t("product.size", "尺寸")}
          </label>
          <input
            type="text"
            required
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            value={form.size}
            onChange={(e) => setForm({ ...form, size: e.target.value })}
            placeholder={t("purchaseOrderForm.sizePlaceholder", "例如: M")}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            {t("purchaseOrderForm.qty", "數量")}
          </label>
          <input
            type="number"
            required
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            value={form.quantity}
            onChange={(e) =>
              setForm({ ...form, quantity: Number(e.target.value) })
            }
            placeholder={t("purchaseOrderForm.qtyPlaceholder", "例如: 1")}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            {t("purchaseOrderForm.link", "連結")}
          </label>
          <input
            type="url"
            required
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            value={form.link}
            onChange={(e) => setForm({ ...form, link: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div className="md:col-span-2 lg:col-span-3">
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            {t("purchaseOrderForm.note", "備註 (選填)")}
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder={t(
              "purchaseOrderForm.notePlaceholder",
              "其他事項填寫這裡...",
            )}
          />
        </div>

        <div className="mt-2 flex md:col-span-2 lg:col-span-3 md:justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-indigo-600 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 md:w-auto"
          >
            {isSubmitting
              ? t("purchaseOrderForm.submitting", "建立中...")
              : t("purchaseOrderForm.submit", "送出採購訂單")}
          </button>
        </div>
      </form>
    </div>
  );
}
