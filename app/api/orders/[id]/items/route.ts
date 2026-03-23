import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { inventoryItemId, quantity, sellPriceTwd } = body;

    // Validate
    if (!inventoryItemId || !quantity || sellPriceTwd == null) {
      return NextResponse.json({ error: "參數不齊全" }, { status: 400 });
    }

    // Fetch inventory info to copy brand, name, style, size
    const invItem = await prisma.inventoryItem.findUnique({
      where: { id: parseInt(inventoryItemId) },
    });

    if (!invItem) {
      return NextResponse.json({ error: "找不到該庫存商品" }, { status: 404 });
    }

    // Check order status, optionally prevent if already completed/deducted?
    // We allow it, but maybe warn if isDeducted? Let's just create it.

    const newOrderItem = await prisma.orderItem.create({
      data: {
        orderId: id,
        inventoryItemId: invItem.id,
        quantity: parseInt(quantity),
        sellPriceTwd: parseInt(sellPriceTwd),
        brand: invItem.brand,
        name: invItem.name,
        style: invItem.style,
        size: invItem.size,
      },
    });

    return NextResponse.json(newOrderItem, { status: 201 });
  } catch (error) {
    console.error("新增明細失敗:", error);
    return NextResponse.json({ error: "無法新增明細" }, { status: 500 });
  }
}
