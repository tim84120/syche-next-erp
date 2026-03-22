import { NextResponse } from "next/server";
import {
  getInventoryItems,
  addInventoryItem,
} from "../../../lib/services/inventoryService";
import { prisma } from "@/lib/prisma";

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
        body.purchaseOrderId ? Number(body.purchaseOrderId) : undefined,
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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseInt(params.id, 10);
    const body = await request.json();
    const { status } = body;

    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: { status: Number(status) as 1 | 2 | 3 | 4 }, // 確保寫入數字
    });
    if (updatedItem.purchaseOrderId) {
      // 找出該採購單底下所有的進貨商品
      const allItems = await prisma.inventoryItem.findMany({
        where: { purchaseOrderId: updatedItem.purchaseOrderId },
      });

      // 直接用 Math.min 找出所有商品中「進度最慢的」那一個狀態數字
      const minStatus = Math.min(...allItems.map((item) => item.status));

      // 將最小狀態同步回採購單
      await prisma.purchaseOrder.update({
        where: { id: updatedItem.purchaseOrderId },
        data: { status: minStatus as 0 | 1 | 2 | 3 | 4 },
      });
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("更新庫存狀態失敗:", error);
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }
}
