import { NextResponse } from "next/server";
import {
  getPurchaseOrders,
  createPurchaseOrder,
} from "@/lib/services/purchaseService";

export async function GET() {
  try {
    const orders = await getPurchaseOrders();
    return NextResponse.json(orders);
  } catch (error) {
    console.error("Failed to fetch purchase orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase orders" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const newOrder = await createPurchaseOrder(request);
    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    console.error("Error creating purchase order:", error);
    return NextResponse.json({ error: "儲存失敗" }, { status: 500 });
  }
}
