import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const records = await prisma.exchangeRecord.findMany({
      orderBy: { createdAt: "desc" },
    });

    const mappedRecords = records.map((record) => ({
      id: record.id,
      twdSpent: record.twdSpent,
      thbReceived: record.thbReceived,
      date: new Date(record.createdAt).toLocaleString(),
    }));

    return NextResponse.json(mappedRecords);
  } catch (error) {
    console.error("GET Exchange Error:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.twdSpent == null || body.thbReceived == null) {
      return NextResponse.json({ error: "請填寫完整資訊" }, { status: 400 });
    }

    const newRecord = await prisma.exchangeRecord.create({
      data: {
        twdSpent: Number(body.twdSpent),
        thbReceived: Number(body.thbReceived),
      },
    });

    return NextResponse.json(
      {
        message: "新增成功",
        item: {
          id: newRecord.id,
          twdSpent: newRecord.twdSpent,
          thbReceived: newRecord.thbReceived,
          date: new Date(newRecord.createdAt).toLocaleString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST Exchange Error:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
