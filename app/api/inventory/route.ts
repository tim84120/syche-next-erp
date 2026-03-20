// app/api/inventory/route.ts
import { NextResponse } from "next/server";
import {
  getInventoryItems,
  addInventoryItem,
} from "../../../lib/services/inventoryService";

// 取得庫存列表 (GET /api/inventory)
export async function GET() {
  try {
    const inventoryItems = await getInventoryItems();
    return NextResponse.json(inventoryItems);
  } catch (error) {
    console.error("取得訂單失敗:", error);
    return NextResponse.json({ error: "無法取得訂單" }, { status: 500 });
  }
}

// 新增庫存 (POST /api/inventory)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 簡單的資料驗證
    if (
      !body.name ||
      !body.brand ||
      !body.style ||
      !body.size ||
      body.foreignCost == null ||
      body.quantity == null
    ) {
      return NextResponse.json({ error: "請填寫完整資訊" }, { status: 400 });
    }

    try {
      const newItem = await addInventoryItem(
        body.name,
        body.brand,
        body.style,
        body.size,
        Number(body.foreignCost),
        Number(body.quantity),
      );

      return NextResponse.json(
        { message: "新增成功", item: newItem },
        { status: 201 },
      );
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "INSUFFICIENT_FUNDS") {
        return NextResponse.json(
          { error: "資金池外幣餘額不足，無法完全扣款 (FIFO 餘額不足)" },
          { status: 400 },
        );
      }
      throw e;
    }
  } catch (error) {
    console.error("新增失敗:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
