import { prisma } from "../prisma";

export async function getInventoryItems() {
  return await prisma.inventoryItem.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function recalculateAllInventoryCosts() {
  // 1. 取得所有現金付款的進貨紀錄 (依建立時間由舊到新)
  const items = await prisma.inventoryItem.findMany({
    where: { paymentMethod: "cash" },
    orderBy: { createdAt: "asc" },
  });

  // 2. 取得所有換匯紀錄 (依 ID/建立時間由舊到新)
  const batches = await prisma.exchangeRecord.findMany({
    orderBy: { id: "asc" },
  });

  let currentBatchIndex = 0;
  // 複製一份 batches 的可用金額，用來追蹤扣款進度
  const batchState = batches.map((b) => ({
    id: b.id,
    thbReceived: b.thbReceived,
    twdSpent: b.twdSpent,
    thbRemaining: b.thbReceived,
    twdRemaining: b.twdSpent,
  }));

  const updates = [];

  for (const item of items) {
    // 重算歷史成本時要用原始進貨量，不能用目前剩餘庫存量
    const totalThbNeeded = item.foreignCost * item.stockQuantity;
    let remainingToCost = totalThbNeeded;
    let totalCostTwd = 0;

    // 用同樣的 FIFO 邏輯
    while (remainingToCost > 0 && currentBatchIndex < batchState.length) {
      const batch = batchState[currentBatchIndex];

      if (batch.thbRemaining <= 0) {
        currentBatchIndex++;
        continue;
      }

      if (batch.thbRemaining >= remainingToCost) {
        // 這批夠扣
        const costForPart =
          (batch.twdSpent / batch.thbReceived) * remainingToCost;
        totalCostTwd += costForPart;
        batch.thbRemaining -= remainingToCost;
        remainingToCost = 0;
      } else {
        // 這批不夠扣，全扣完然後換下一批
        const costForPart =
          (batch.twdSpent / batch.thbReceived) * batch.thbRemaining;
        totalCostTwd += costForPart;
        remainingToCost -= batch.thbRemaining;
        batch.thbRemaining = 0;
        currentBatchIndex++;
      }
    }

    if (remainingToCost > 0.001) {
      // 這裡會有問題：如果把匯率改小了，導致資金池不足以支付歷史進貨，就會卡住
      // 為了不讓系統崩潰，如果 THB 不足，就直接按最近一次的或 1 來算
      totalCostTwd += remainingToCost * 1.0;
    }

    // 更新此 Item 的成本
    const singleTwdCost =
      item.stockQuantity > 0
        ? Math.round(totalCostTwd / item.stockQuantity)
        : 0;
    const singleAppliedRate =
      item.foreignCost > 0 ? singleTwdCost / item.foreignCost : 1;

    // 取出並推入更新陣列
    updates.push(
      prisma.inventoryItem.update({
        where: { id: item.id },
        data: {
          twdCost: singleTwdCost,
          appliedRate: singleAppliedRate,
        },
      }),
    );
  }

  // 執行批次更新
  await prisma.$transaction(updates);
}

export async function addInventoryItem(
  name: string,
  brand: string,
  style: string,
  size: string,
  foreignCost: number,
  quantity: number,
  paymentMethod: string = "cash",
  purchaseOrderId?: number,
) {
  const totalThbNeeded = foreignCost * quantity;

  let singleTwdCost = foreignCost;
  let singleAppliedRate = 1;

  if (paymentMethod === "cash") {
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
    singleTwdCost = Math.round(totalCostTwd / quantity);
    singleAppliedRate = singleTwdCost / foreignCost;
  }

  const newItem = await prisma.inventoryItem.create({
    data: {
      brand,
      name,
      style,
      size,
      foreignCost,
      appliedRate: singleAppliedRate,
      twdCost: singleTwdCost,
      quantity,
      stockQuantity: quantity,
      paymentMethod,
      purchaseOrderId,
    },
  });
  if (purchaseOrderId) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: {
        inventoryItems: true,
      },
    });
    const inventoryCountForPO = po?.inventoryItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    if (po && (inventoryCountForPO ?? 0) >= po.quantity) {
      await prisma.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { status: 1 },
      });
    }
  }

  return newItem;
}

export async function updateInventoryItemStatus(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);
  const body = await request.json();
  const { status } = body;

  const updatedItem = await prisma.inventoryItem.update({
    where: { id: id },
    data: { status: Number(status) as 1 | 2 | 3 | 4 }, // 確保寫入數字
  });
  if (updatedItem.purchaseOrderId) {
    // 找出該採購單底下所有的進貨商品
    const allItems = await prisma.inventoryItem.findMany({
      where: { purchaseOrderId: updatedItem.purchaseOrderId },
    });

    // 直接用 Math.min 找出所有商品中「進度最慢的」那一個狀態數字
    const minStatus = Math.min(...allItems.map((item) => item.status));

    // 將最小狀態同步回採購單
    await prisma.purchaseOrder.update({
      where: { id: updatedItem.purchaseOrderId },
      data: { status: minStatus as 0 | 1 | 2 | 3 | 4 },
    });
  }
  return updatedItem;
}
