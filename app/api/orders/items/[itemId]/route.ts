import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const { itemId } = await params;

    // Use transaction to ensure both deletion and inventory restoration happen together
    await prisma.$transaction(async (tx) => {
      // First, fetch the order item to get its inventory info
      const orderItem = await tx.orderItem.findUnique({
        where: { id: parseInt(itemId) },
      });

      if (!orderItem) {
        throw new Error("訂單項目不存在");
      }

      // Delete the order item
      await tx.orderItem.delete({
        where: { id: parseInt(itemId) },
      });

      // Restore inventory if it was linked
      if (orderItem.inventoryItemId) {
        await tx.inventoryItem.update({
          where: { id: orderItem.inventoryItemId },
          data: { stockQuantity: { increment: orderItem.quantity } },
        });
      }
    });

    return NextResponse.json({ message: "刪除成功" }, { status: 200 });
  } catch (error) {
    console.error("刪除明細失敗:", error);
    return NextResponse.json({ error: "無法刪除明細" }, { status: 500 });
  }
}
