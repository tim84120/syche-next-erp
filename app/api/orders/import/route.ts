import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const allowedStatuses = new Set([
  "placed",
  "pending",
  "paid",
  "shipped",
  "completed",
  "cancelled",
]);

type ImportOrderInput = {
  time?: string | null;
  customerName: string;
  storeNumber?: string | null;
  storeName?: string | null;
  transferCode?: string | null;
  totalAmount: number;
  note?: string | null;
  detail?: string | null;
  lineName?: string | null;
  email?: string | null;
  status?: string | null;
};

function createOrderId(index: number): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const randomNum = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return `ORD-${dateStr}-${randomNum}-${index}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const orders = Array.isArray(body?.orders) ? body.orders : [];

    if (orders.length === 0) {
      return NextResponse.json(
        { error: "請提供要匯入的 orders 陣列" },
        { status: 400 },
      );
    }

    const failures: { index: number; reason: string }[] = [];
    let createdCount = 0;

    for (let i = 0; i < orders.length; i += 1) {
      const row = orders[i] as ImportOrderInput;

      try {
        if (!row.customerName || Number.isNaN(Number(row.totalAmount))) {
          failures.push({ index: i + 1, reason: "姓名或金額缺失" });
          continue;
        }

        const normalizedStatus =
          typeof row.status === "string" && allowedStatuses.has(row.status)
            ? row.status
            : "placed";

        await prisma.order.create({
          data: {
            id: createOrderId(i + 1),
            customerName: row.customerName,
            storeNumber: row.storeNumber || null,
            storeName: row.storeName || null,
            transferCode: row.transferCode || null,
            totalAmount: Number(row.totalAmount),
            note: row.note || null,
            detail: row.detail || null,
            lineName: row.lineName || null,
            email: row.email || null,
            status: normalizedStatus,
            createdAt: row.time ? new Date(row.time) : undefined,
          },
        });

        createdCount += 1;
      } catch {
        failures.push({ index: i + 1, reason: "寫入失敗" });
      }
    }

    return NextResponse.json({
      createdCount,
      failedCount: failures.length,
      failures,
    });
  } catch (error) {
    console.error("批次匯入訂單失敗:", error);
    return NextResponse.json({ error: "無法批次匯入訂單" }, { status: 500 });
  }
}
