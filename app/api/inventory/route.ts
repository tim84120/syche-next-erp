// app/api/inventory/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 模擬資料庫 (注意：伺服器重啟後資料會重置，實戰中需改為串接真實資料庫)

// 取得庫存列表 (GET /api/inventory)
export async function GET() {
  try {
    // 透過 Prisma 抓取所有訂單，並透過 include 順便把關聯的「商品明細 (items)」一起抓出來
    console.log("正在取得訂單...", prisma);
    const inventoryItems = await prisma.inventoryItem.findMany({});
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
      body.foreignCost == null ||
      body.appliedRate == null ||
      body.twdCost == null ||
      body.quantity == null
    ) {
      return NextResponse.json({ error: "請填寫完整資訊" }, { status: 400 });
    }

    const newItem = await prisma.inventoryItem.create({
      data: {
        name: body.name,
        foreignCost: Number(body.foreignCost),
        appliedRate: Number(body.appliedRate),
        twdCost: Number(body.twdCost),
        quantity: Number(body.quantity),
      },
    });

    return NextResponse.json(
      { message: "新增成功", item: newItem },
      { status: 201 },
    );
  } catch (error) {
    console.error("新增失敗:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
