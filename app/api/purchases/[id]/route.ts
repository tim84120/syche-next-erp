import { NextResponse } from "next/server";
import { updatePurchaseOrderNote } from "@/lib/services/purchaseService";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const orderId = Number(id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ error: "無效的採購單 ID" }, { status: 400 });
    }

    const body = await request.json();
    const note = typeof body.note === "string" ? body.note.trim() : "";

    const updatedOrder = await updatePurchaseOrderNote(
      orderId,
      note.length > 0 ? note : null,
    );

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Error updating purchase order note:", error);
    return NextResponse.json({ error: "更新備註失敗" }, { status: 500 });
  }
}
