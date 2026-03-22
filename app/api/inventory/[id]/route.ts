import { NextResponse } from "next/server";
import { updateInventoryItemStatus } from "../../../../lib/services/inventoryService";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const updatedItem = await updateInventoryItemStatus(request, { params });
    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("更新庫存狀態失敗:", error);
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }
}
