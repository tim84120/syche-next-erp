// app/api/inventory/route.ts
import { NextResponse } from "next/server";

// 模擬資料庫 (注意：伺服器重啟後資料會重置，實戰中需改為串接真實資料庫)
const inventoryDb = [
  {
    id: 1,
    name: "曼谷設計款帆布包",
    currency: "THB",
    exchangeRate: 0.92,
    foreignCost: 850,
    quantity: 5,
  },
];

// 取得庫存列表 (GET /api/inventory)
export async function GET() {
  return NextResponse.json(inventoryDb);
}

// 新增庫存 (POST /api/inventory)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 簡單的資料驗證
    if (!body.name || !body.foreignCost) {
      return NextResponse.json({ error: "請填寫完整資訊" }, { status: 400 });
    }

    const newItem = {
      id: Date.now(), // 產生簡易的唯一 ID
      name: body.name,
      currency: body.currency,
      exchangeRate: Number(body.exchangeRate),
      foreignCost: Number(body.foreignCost),
      quantity: Number(body.quantity),
    };

    inventoryDb.push(newItem);

    return NextResponse.json(
      { message: "新增成功", item: newItem },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
