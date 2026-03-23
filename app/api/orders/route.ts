import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 1. 取得所有訂單 (GET)
export async function GET() {
  try {
    // 透過 Prisma 抓取所有訂單，並透過 include 順便把關聯的「商品明細 (items)」一起抓出來
    const orders = await prisma.order.findMany({
      include: {
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });
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
        storeNumber: body.storeNumber || null,
        storeName: body.storeName || null,
        transferCode: body.transferCode || null,
        totalAmount: body.totalAmount,
        note: body.note || null,
        detail: body.detail || null,
        lineName: body.lineName || null,
        email: body.email || null,
        status: "placed",
      },
      include: { items: true },
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
    const { orderIds, status } = body;

    // 找出這些訂單與其明細
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: { items: true },
    });

    for (const order of orders) {
      await prisma.$transaction(async (tx) => {
        if (status === "completed" && !order.isDeducted) {
          // 狀態變更為「已完成」且尚未扣庫存 -> 扣減庫存
          for (const item of order.items) {
            if (item.inventoryItemId) {
              await tx.inventoryItem.update({
                where: { id: item.inventoryItemId },
                data: { quantity: { decrement: item.quantity } },
              });
            }
          }
          // 更新訂單
          await tx.order.update({
            where: { id: order.id },
            data: { status, isDeducted: true },
          });
        } else if (status !== "completed" && order.isDeducted) {
          // 狀態從「已完成」改為其他，且已經扣過庫存 -> 把庫存加回來
          for (const item of order.items) {
            if (item.inventoryItemId) {
              await tx.inventoryItem.update({
                where: { id: item.inventoryItemId },
                data: { quantity: { increment: item.quantity } },
              });
            }
          }
          // 更新訂單
          await tx.order.update({
            where: { id: order.id },
            data: { status, isDeducted: false },
          });
        } else {
          // 沒有庫存變動的純狀態更新
          await tx.order.update({
            where: { id: order.id },
            data: { status },
          });
        }
      });
    }

    return NextResponse.json({ message: "狀態更新成功" });
  } catch (error) {
    console.error("更新狀態失敗:", error);
    return NextResponse.json({ error: "無法更新訂單狀態" }, { status: 500 });
  }
}
