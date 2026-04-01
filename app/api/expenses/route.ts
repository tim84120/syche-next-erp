import { NextResponse } from "next/server";
import { getExpenses, addExpense } from "@/lib/services/expenseService";

export async function GET() {
  try {
    const expenses = await getExpenses();
    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Failed to fetch expenses:", error);
    return NextResponse.json({ error: "取得支出紀錄失敗" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, title, amountThb, paymentMethod, date, cardAmountTwd } = body;

    if (!type || !title || !amountThb || !date) {
      return NextResponse.json({ error: "缺少必要參數" }, { status: 400 });
    }

    const expense = await addExpense(
      type,
      title,
      Number(amountThb),
      paymentMethod || "cash",
      new Date(date),
      cardAmountTwd ? Number(cardAmountTwd) : 0,
    );

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Failed to create expense:", error);
    if (error instanceof Error && error.message === "INSUFFICIENT_FUNDS") {
      return NextResponse.json(
        { error: "泰銖資金池餘額不足" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "新增支出紀錄失敗" }, { status: 500 });
  }
}
