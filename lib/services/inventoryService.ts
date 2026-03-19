import { prisma } from "../prisma";

export async function getInventoryItems() {
  return await prisma.inventoryItem.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function addInventoryItem(
  name: string,
  foreignCost: number,
  quantity: number,
) {
  const totalThbNeeded = foreignCost * quantity;

  // --- FIFO 成本計算 ---
  // 1. 計算所有過去商品已經消耗了多少 THB
  const pastItems = await prisma.inventoryItem.findMany();
  const usedThbHistory = pastItems.reduce(
    (acc, item) => acc + item.foreignCost * item.quantity,
    0,
  );

  // 2. 取得所有換匯紀錄（先進先出，依 ID 由小到大排）
  const batches = await prisma.exchangeRecord.findMany({
    orderBy: { id: "asc" },
  });

  let thbToSkip = usedThbHistory;
  let remainingToCost = totalThbNeeded;
  let totalCostTwd = 0;

  for (const batch of batches) {
    if (remainingToCost <= 0) break;

    let batchThb = batch.thbReceived;
    let batchTwd = batch.twdSpent;

    // 如果這個批次已經被歷史庫存完全消耗完了，就跳過
    if (thbToSkip >= batchThb) {
      thbToSkip -= batchThb;
      continue;
    }

    // 如果歷史庫存消耗了這個批次的一部分，我們扣除已被消耗的量
    if (thbToSkip > 0) {
      const consumedRatio = thbToSkip / batchThb;
      batchThb -= thbToSkip;
      batchTwd -= batch.twdSpent * consumedRatio;
      thbToSkip = 0; // 歷史消耗已經抵扣完畢
    }

    // 開始用剩下的批次額度來購買本次商品
    if (batchThb >= remainingToCost) {
      // 批次餘額充足，部分消耗
      const costForPart = (batchTwd / batchThb) * remainingToCost;
      totalCostTwd += costForPart;
      remainingToCost = 0;
    } else {
      // 批次餘額不足，全部消耗這批，剩下的繼續找下一批
      totalCostTwd += batchTwd;
      remainingToCost -= batchThb;
    }
  }

  // 若算完後發現還要付的 THB 卻大於 0，代表資金池餘額不足
  if (remainingToCost > 0.001) {
    throw new Error("INSUFFICIENT_FUNDS");
  }

  // 結算單件商品的 TWD 成本與換算匯率
  const singleTwdCost = Math.round(totalCostTwd / quantity);
  const singleAppliedRate = singleTwdCost / foreignCost;

  const newItem = await prisma.inventoryItem.create({
    data: {
      name,
      foreignCost,
      appliedRate: singleAppliedRate,
      twdCost: singleTwdCost,
      quantity,
    },
  });

  return newItem;
}
