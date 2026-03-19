import { NextResponse } from "next/server";
import {
  getExchanges,
  createExchange,
} from "../../../lib/services/exchangeService";

export async function GET() {
  try {
    const records = await getExchanges();

    return NextResponse.json(records);
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

    const item = await createExchange(
      Number(body.twdSpent),
      Number(body.thbReceived),
    );

    return NextResponse.json({ message: "新增成功", item }, { status: 201 });
  } catch (error) {
    console.error("POST Exchange Error:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
