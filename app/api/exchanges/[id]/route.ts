import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { updateExchange } from "../../../lib/services/exchangeService";
import { prisma } from "../../../lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }, // In Next.js 14/15 app router, params needs to be awaited if used dynamically, or type can just be { params: { id: string } } but standard suggests checking framework version. Let's use standard { params: { id: string } } for compatibility unless Next.js 15 is explicitly used. I'll await it to be safe if Next 15.
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "admin") {
      return NextResponse.json({ error: "尚未授權" }, { status: 403 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const numericId = parseInt(id, 10);
    const body = await request.json();

    if (body.twdSpent == null || body.thbReceived == null) {
      return NextResponse.json({ error: "請填寫完整資訊" }, { status: 400 });
    }

    const updated = await updateExchange(
      numericId,
      Number(body.twdSpent),
      Number(body.thbReceived),
    );

    return NextResponse.json(
      { message: "更新成功", item: updated },
      { status: 200 },
    );
  } catch (error) {
    console.error("PATCH Exchange Error:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "admin") {
      return NextResponse.json({ error: "尚未授權" }, { status: 403 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const numericId = parseInt(id, 10);

    await prisma.exchangeRecord.delete({
      where: { id: numericId },
    });

    return NextResponse.json({ message: "刪除成功" }, { status: 200 });
  } catch (error) {
    console.error("DELETE Exchange Error:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
