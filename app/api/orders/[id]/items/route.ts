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

    const parsedQuantity = parseInt(quantity);

    // Fetch inventory info to copy brand, name, style, size
    const invItem = await prisma.inventoryItem.findUnique({
      where: { id: parseInt(inventoryItemId) },
    });

    if (!invItem) {
      return NextResponse.json({ error: "找不到該庫存商品" }, { status: 404 });
    }

    // Check if inventory has enough stock
    if (invItem.stockQuantity < parsedQuantity) {
      return NextResponse.json(
        { error: `庫存不足。目前有 ${invItem.stockQuantity} 件` },
        { status: 400 },
      );
    }

    // Use transaction to ensure both OrderItem creation and inventory update happen together
    const newOrderItem = await prisma.$transaction(async (tx) => {
      // Create order item first
      const orderItem = await tx.orderItem.create({
        data: {
          orderId: id,
          inventoryItemId: invItem.id,
          quantity: parsedQuantity,
          sellPriceTwd: parseInt(sellPriceTwd),
          brand: invItem.brand,
          name: invItem.name,
          style: invItem.style,
          size: invItem.size,
        },
      });

      // Deduct inventory immediately
      await tx.inventoryItem.update({
        where: { id: invItem.id },
        data: { stockQuantity: { decrement: parsedQuantity } },
      });

      return orderItem;
    });

    return NextResponse.json(newOrderItem, { status: 201 });
  } catch (error) {
    console.error("新增明細失敗:", error);
    return NextResponse.json({ error: "無法新增明細" }, { status: 500 });
  }
}
