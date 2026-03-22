import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 1. 取得所有訂單 (GET)
export async function GET() {
  try {
    // 透過 Prisma 抓取所有訂單，並透過 include 順便把關聯的「商品明細 (items)」一起抓出來
    const orders = await prisma.order.findMany({});
    return NextResponse.json(orders);
  } catch (error) {
    console.error("取得訂單失敗:", error);
    return NextResponse.json({ error: "無法取得訂單" }, { status: 500 });
  }
}

// 2. 新增訂單 (POST)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 產生自訂訂單編號
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const randomNum = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    const orderId = `ORD-${dateStr}-${randomNum}`;

    // 這裡展示了 Prisma 超強的「巢狀寫入 (Nested Writes)」功能
    // 我們可以同時建立 Order (主表) 與 OrderItem (明細表)，完全不需要寫複雜的關聯 SQL

    const newOrder = await prisma.order.create({
      data: {
        id: orderId,
        customerName: body.customerName,
        totalAmount: body.totalAmount,
        status: "placed",
        items: {
          create: body.items.map((item: any) => ({
            productName: item.productName,
            quantity: Number(item.quantity),
            sellPriceTwd: Number(item.sellPriceTwd),
          })),
        },
      },
      include: { items: true }, // 寫入完成後，連同明細一起回傳給前端
    });

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    console.error("新增訂單失敗:", error);
    return NextResponse.json({ error: "無法新增訂單" }, { status: 500 });
  }
}

// 3. 批次/單一更新訂單狀態 (PATCH)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { orderIds, status } = body; // 預期前端會傳來 { orderIds: ['ORD-xxx', ...], status: 'paid' }
    // 使用 updateMany 一次更新多筆資料的狀態
    await prisma.order.updateMany({
      where: {
        id: { in: orderIds },
      },
      data: {
        status: status,
      },
    });
    return NextResponse.json({ message: "狀態更新成功" });
  } catch (error) {
    console.error("更新狀態失敗:", error);
    return NextResponse.json({ error: "無法更新訂單狀態" }, { status: 500 });
  }
}
