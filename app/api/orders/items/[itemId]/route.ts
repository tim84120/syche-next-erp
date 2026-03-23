import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const { itemId } = await params;

    await prisma.orderItem.delete({
      where: { id: parseInt(itemId) },
    });

    return NextResponse.json({ message: "刪除成功" }, { status: 200 });
  } catch (error) {
    console.error("刪除明細失敗:", error);
    return NextResponse.json({ error: "無法刪除明細" }, { status: 500 });
  }
}
