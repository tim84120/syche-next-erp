import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { recalculateAllInventoryCosts } from "@/lib/services/inventoryService";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "admin") {
      return NextResponse.json({ error: "尚未授權" }, { status: 403 });
    }

    // 重新計算所有庫存的鎖定匯率 (FIFO)
    await recalculateAllInventoryCosts();

    return NextResponse.json({ message: "重新計算成功" }, { status: 200 });
  } catch (error) {
    console.error("重新計算庫存匯率失敗:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
