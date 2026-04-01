import { prisma } from "../prisma";

export async function getExpenses() {
  return await prisma.expense.findMany({
    orderBy: { date: "desc" },
  });
}

export async function addExpense(
  type: string, // "shipping" 或 "misc"
  title: string,
  amountThb: number,
  paymentMethod: string = "cash",
  date: Date,
  cardAmountTwd: number = 0, // 信用卡或非現金需手動輸入的台幣金額
  directAmountTwd: number = 0, // 直接輸入台幣（不需泰銖換算）
) {
  let amountTwd = 0;
  let appliedRate = 1;

  if (directAmountTwd > 0) {
    // 直接以台幣計價，不扣除泰銖資金池
    amountTwd = directAmountTwd;
    appliedRate = 1;
  } else if (paymentMethod === "cash") {
    // --- FIFO 成本計算 ---
    const pastItems = await prisma.inventoryItem.findMany({
      where: { paymentMethod: "cash" },
    });
    const pastExpenses = await prisma.expense.findMany({
      where: { paymentMethod: "cash" },
    });
    const usedThbHistory =
      pastItems.reduce(
        (acc, item) => acc + item.foreignCost * item.quantity,
        0,
      ) + pastExpenses.reduce((acc, e) => acc + e.amountThb, 0);

    const batches = await prisma.exchangeRecord.findMany({
      orderBy: { id: "asc" },
    });

    let thbToSkip = usedThbHistory;
    let remainingToCost = amountThb;

    for (const batch of batches) {
      if (remainingToCost <= 0) break;

      let batchThb = batch.thbReceived;
      let batchTwd = batch.twdSpent;

      if (thbToSkip >= batchThb) {
        thbToSkip -= batchThb;
        continue;
      }

      if (thbToSkip > 0) {
        const consumedRatio = thbToSkip / batchThb;
        batchThb -= thbToSkip;
        batchTwd -= batch.twdSpent * consumedRatio;
        thbToSkip = 0;
      }

      if (batchThb >= remainingToCost) {
        const costForPart = (batchTwd / batchThb) * remainingToCost;
        amountTwd += costForPart;
        remainingToCost = 0;
      } else {
        amountTwd += batchTwd;
        remainingToCost -= batchThb;
      }
    }

    if (remainingToCost > 0.001) {
      throw new Error("INSUFFICIENT_FUNDS");
    }

    amountTwd = Math.round(amountTwd);
    appliedRate = amountThb > 0 ? amountTwd / amountThb : 1;
  } else {
    // 若為信用卡支付，不扣除泰銖餘額，直接將指定的台幣設為成本
    amountTwd = cardAmountTwd > 0 ? cardAmountTwd : Math.round(amountThb);
    appliedRate = amountThb > 0 ? amountTwd / amountThb : 1;
  }
  // 注意：directAmountTwd > 0 的分支已在最上方處理

  const newExpense = await prisma.expense.create({
    data: {
      type,
      title,
      amountThb,
      amountTwd,
      appliedRate,
      paymentMethod,
      date,
    },
  });

  return newExpense;
}

export async function deleteExpense(id: number) {
  return await prisma.expense.delete({
    where: { id },
  });
}
