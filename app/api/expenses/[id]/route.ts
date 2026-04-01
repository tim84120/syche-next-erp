import { NextResponse } from "next/server";
import { deleteExpense } from "@/lib/services/expenseService";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await deleteExpense(Number(id));
    return NextResponse.json({ message: "刪除成功" });
  } catch (error) {
    console.error("Failed to delete expense:", error);
    return NextResponse.json({ error: "刪除失敗" }, { status: 500 });
  }
}
