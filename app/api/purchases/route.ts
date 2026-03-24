import { NextResponse } from "next/server";
import {
  getPurchaseOrders,
  createPurchaseOrder,
} from "@/lib/services/purchaseService";

const getRangeDate = (value: string | null, fallback: Date, isEnd: boolean) => {
  if (!value) {
    return new Date(
      `${fallback.toISOString().slice(0, 10)}T${isEnd ? "23:59:59.999" : "00:00:00.000"}`,
    );
  }

  return new Date(`${value}T${isEnd ? "23:59:59.999" : "00:00:00.000"}`);
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const today = new Date();
    const startDate = getRangeDate(searchParams.get("startDate"), today, false);
    const endDate = getRangeDate(searchParams.get("endDate"), today, true);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "日期格式錯誤" }, { status: 400 });
    }

    const orders = await getPurchaseOrders(startDate, endDate);
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
