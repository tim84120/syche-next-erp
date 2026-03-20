import { useState, forwardRef, useImperativeHandle } from "react";
import { WalletStats } from "../app/types";

export interface ProductItem {
  id: string;
  brand: string;
  name: string;
  style: string;
  size: string;
  foreignCost: string;
  quantity: string;
}

interface Props {
  walletStats: WalletStats;
  onAddProducts: (
    products: { name: string; foreignCost: number; quantity: number }[],
  ) => Promise<boolean>;
}

export interface ProductFormRef {
  importProducts: (
    products: {
      brand: string;
      name: string;
      style: string;
      size: string;
      quantity: number;
    }[],
  ) => void;
}

const ProductForm = forwardRef<ProductFormRef, Props>(
  ({ walletStats, onAddProducts }, ref) => {
    const [items, setItems] = useState<ProductItem[]>([
      {
        id: "1",
        name: "",
        brand: "",
        style: "",
        size: "",
        foreignCost: "",
        quantity: "1",
      },
    ]);
    const [discount, setDiscount] = useState("");
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
          quantity: p.quantity.toString(),
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

      // 計算總價
      const totalOriginalThb = items.reduce(
        (sum, item) => sum + Number(item.foreignCost) * Number(item.quantity),
        0,
      );
      const discountThb = Number(discount) || 0;
      const totalFinalThb = totalOriginalThb - discountThb;

      if (walletStats.balance < totalFinalThb) {
        return alert("餘額不足，請先新增換匯紀錄！");
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
        quantity: Number(item.quantity),
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
            quantity: "1",
          },
        ]);
        setDiscount("");
      }
    };

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 text-xl">
              📦
            </div>
            <h2 className="text-xl font-bold text-slate-800">商品進貨扣款</h2>
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="px-4 py-2 text-sm font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
          >
            + 新增一筆商品
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
                  Item {index + 1}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      品牌
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                      value={item.brand}
                      onChange={(e) =>
                        updateItem(item.id, "brand", e.target.value)
                      }
                      placeholder="輸入品牌名稱"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      品名
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                      value={item.name}
                      onChange={(e) =>
                        updateItem(item.id, "name", e.target.value)
                      }
                      placeholder="輸入商品名稱或型號"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      款式
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                      value={item.style}
                      onChange={(e) =>
                        updateItem(item.id, "style", e.target.value)
                      }
                      placeholder="輸入商品款式"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      尺寸
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                      value={item.size}
                      onChange={(e) =>
                        updateItem(item.id, "size", e.target.value)
                      }
                      placeholder="輸入商品尺寸"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      進貨數量
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
                      單件進價 (THB)
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
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row gap-4 items-end justify-between">
            <div className="w-full md:w-1/2">
              <label className="flex text-sm font-semibold text-slate-700 mb-1.5 items-center gap-2">
                <span>折價券抵扣 (THB)</span>
                <span className="text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                  選填
                </span>
              </label>
              <input
                type="number"
                min="0"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="輸入折抵金額"
              />
            </div>

            <div className="bg-amber-50/50 rounded-lg p-4 w-full md:w-1/2 flex justify-between items-center border border-amber-100">
              <span className="text-sm font-medium text-amber-800">
                總結抵扣後金額
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
            disabled={isSubmitting || walletStats.balance <= 0}
            className="w-full bg-amber-500 text-white font-medium py-3 rounded-lg hover:bg-amber-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isSubmitting ? "處理中..." : "確認進貨並扣除餘額"}
          </button>
        </form>
      </div>
    );
  },
);

ProductForm.displayName = "ProductForm";

export default ProductForm;
