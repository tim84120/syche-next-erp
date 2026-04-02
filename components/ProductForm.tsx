import { useState, forwardRef, useImperativeHandle } from "react";
import { WalletStats } from "../app/types";
import { useI18n } from "@/lib/i18n";

export interface ProductItem {
  id: string;
  brand: string;
  name: string;
  style: string;
  size: string;
  foreignCost: string;
  twdCost: string;
  quantity: string;
  purchaseOrderId?: number;
}

interface Props {
  walletStats: WalletStats;
  onAddProducts: (
    products: {
      brand: string;
      name: string;
      style: string;
      size: string;
      foreignCost: number;
      twdCost?: number;
      quantity: number;
      purchaseOrderId?: number;
      paymentMethod: string;
    }[],
  ) => Promise<boolean>;
}

export interface ProductFormRef {
  importProducts: (
    products: {
      id?: number;
      brand: string;
      name: string;
      style: string;
      size: string;
      quantity: number;
      twdCost?: number;
    }[],
  ) => void;
}

const ProductForm = forwardRef<ProductFormRef, Props>(
  ({ walletStats, onAddProducts }, ref) => {
    const { t } = useI18n();
    const [items, setItems] = useState<ProductItem[]>([
      {
        id: "1",
        name: "",
        brand: "",
        style: "",
        size: "",
        foreignCost: "",
        twdCost: "",
        quantity: "1",
      },
    ]);
    const [discount, setDiscount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useImperativeHandle(ref, () => ({
      importProducts: (incomingProducts) => {
        // Filter out the initial empty item if it's there and empty
        const currentItems = items.filter((i) => i.name || i.foreignCost);
        const newItems = incomingProducts.map((p, index) => ({
          id: `imported-${Date.now()}-${index}`,
          brand: p.brand,
          style: p.style,
          size: p.size,
          name: p.name,
          foreignCost: "", // Leave blank for the user to fill
          twdCost: "",
          quantity: p.quantity.toString(),
          purchaseOrderId: p.id,
        }));
        setItems([...currentItems, ...newItems]);
        // Also scroll slightly to this form
        window.scrollTo({ top: 300, behavior: "smooth" });
      },
    }));

    const handleAddItem = () => {
      setItems([
        ...items,
        {
          id: Date.now().toString(),
          name: "",
          brand: "",
          style: "",
          size: "",
          foreignCost: "",
          twdCost: "",
          quantity: "1",
        },
      ]);
    };

    const handleRemoveItem = (id: string) => {
      if (items.length > 1) {
        setItems(items.filter((i) => i.id !== id));
      }
    };

    const updateItem = (
      id: string,
      field: keyof ProductItem,
      value: string,
    ) => {
      setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (items.some((i) => !i.name || !i.foreignCost)) return;
      if (paymentMethod === "card" && items.some((i) => !i.twdCost)) {
        alert(
          t("product.cardTwdRequired", "刷卡進貨請填寫每項商品的台幣單件成本"),
        );
        return;
      }

      // 計算總價
      const totalOriginalThb = items.reduce(
        (sum, item) => sum + Number(item.foreignCost) * Number(item.quantity),
        0,
      );
      const discountThb = Number(discount) || 0;
      const totalFinalThb = totalOriginalThb - discountThb;

      if (walletStats.balance < totalFinalThb && paymentMethod === "cash") {
        return alert(
          t("product.insufficientBalance", "餘額不足，請先新增換匯紀錄！"),
        );
      }

      // 計算折價比例並準備送出資料
      const discountRatio =
        totalOriginalThb > 0 ? totalFinalThb / totalOriginalThb : 1;

      const productsToSubmit = items.map((item) => ({
        brand: item.brand,
        style: item.style,
        size: item.size,
        name: item.name,
        // 將折扣按比例分配到每個商品的單價，並可以接受小數點保留
        foreignCost: Number(
          (Number(item.foreignCost) * discountRatio).toFixed(2),
        ),
        twdCost:
          paymentMethod === "card"
            ? Number((Number(item.twdCost) * discountRatio).toFixed(2))
            : undefined,
        quantity: Number(item.quantity),
        purchaseOrderId: item.purchaseOrderId,
        paymentMethod,
      }));

      setIsSubmitting(true);
      const success = await onAddProducts(productsToSubmit);
      setIsSubmitting(false);

      if (success) {
        setItems([
          {
            id: Date.now().toString(),
            brand: "",
            style: "",
            size: "",
            name: "",
            foreignCost: "",
            twdCost: "",
            quantity: "1",
          },
        ]);
        setDiscount("");
        setPaymentMethod("cash");
      }
    };

    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 text-xl">
              📦
            </div>
            <h2 className="text-xl font-bold text-slate-800">
              {t("product.title", "商品進貨扣款")}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="w-full rounded-lg bg-amber-50 px-4 py-2 text-sm font-medium text-amber-600 transition-colors hover:bg-amber-100 sm:w-auto"
          >
            {t("product.addItem", "+ 新增一筆商品")}
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="p-4 bg-slate-50 border border-slate-100 rounded-xl relative"
              >
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                  >
                    ✕
                  </button>
                )}
                <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
                  {t("product.item", "項目")} {index + 1}
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      {t("product.brand", "品牌")}
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                      value={item.brand}
                      onChange={(e) =>
                        updateItem(item.id, "brand", e.target.value)
                      }
                      placeholder={t(
                        "product.brandPlaceholder",
                        "輸入品牌名稱",
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
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                      value={item.name}
                      onChange={(e) =>
                        updateItem(item.id, "name", e.target.value)
                      }
                      placeholder={t(
                        "product.namePlaceholder",
                        "輸入商品名稱或型號",
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
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                      value={item.style}
                      onChange={(e) =>
                        updateItem(item.id, "style", e.target.value)
                      }
                      placeholder={t(
                        "product.stylePlaceholder",
                        "輸入商品款式",
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      {t("product.size", "尺寸")}
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                      value={item.size}
                      onChange={(e) =>
                        updateItem(item.id, "size", e.target.value)
                      }
                      placeholder={t("product.sizePlaceholder", "輸入商品尺寸")}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      {t("product.quantity", "進貨數量")}
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, "quantity", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      {t("product.costThb", "單件進價 (THB)")}
                    </label>
                    <input
                      type="number"
                      required
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                      value={item.foreignCost}
                      onChange={(e) =>
                        updateItem(item.id, "foreignCost", e.target.value)
                      }
                    />
                  </div>
                  {paymentMethod === "card" && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        {t("product.costTwd", "單件成本 (TWD)")}
                      </label>
                      <input
                        type="number"
                        required
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                        value={item.twdCost}
                        onChange={(e) =>
                          updateItem(item.id, "twdCost", e.target.value)
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4 border-t border-slate-100 pt-4 md:flex-row md:items-end md:justify-between">
            <div className="w-full md:w-1/2">
              <label className="flex text-sm font-semibold text-slate-700 mb-1.5 items-center gap-2">
                <span>{t("product.discount", "折價券抵扣 (THB)")}</span>
                <span className="text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                  {t("product.optional", "選填")}
                </span>
              </label>
              <input
                type="number"
                min="0"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder={t("product.discountPlaceholder", "輸入折抵金額")}
              />
            </div>

            <div className="w-full md:w-1/2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                {t("product.paymentMethod", "扣款方式")}
              </label>
              <div className="flex rounded-lg overflow-hidden border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cash")}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    paymentMethod === "cash"
                      ? "bg-amber-500 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  💵 {t("product.cash", "現金")}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors border-l border-slate-200 ${
                    paymentMethod === "card"
                      ? "bg-amber-500 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  💳 {t("product.card", "刷卡")}
                </button>
              </div>
            </div>

            <div className="flex w-full items-center justify-between rounded-lg border border-amber-100 bg-amber-50/50 p-4 md:w-1/2">
              <span className="text-sm font-medium text-amber-800">
                {t("product.total", "總結抵扣後金額")}
              </span>
              <span className="text-lg font-bold text-amber-600">
                {(() => {
                  const total = items.reduce(
                    (sum, item) =>
                      sum + Number(item.foreignCost) * Number(item.quantity),
                    0,
                  );
                  const final = total - (Number(discount) || 0);
                  return `${final > 0 ? final : 0} THB`;
                })()}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={
              isSubmitting ||
              (paymentMethod === "cash" && walletStats.balance <= 0)
            }
            className="w-full bg-amber-500 text-white font-medium py-3 rounded-lg hover:bg-amber-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isSubmitting
              ? t("product.submitting", "處理中...")
              : t("product.submit", "確認進貨並扣除餘額")}
          </button>
        </form>
      </div>
    );
  },
);

ProductForm.displayName = "ProductForm";

export default ProductForm;
