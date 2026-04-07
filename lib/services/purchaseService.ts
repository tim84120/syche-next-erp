import { prisma } from "@/lib/prisma";

export async function getPurchaseOrders(startDate?: Date, endDate?: Date) {
  return await prisma.purchaseOrder.findMany({
    where:
      startDate && endDate
        ? {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }
        : undefined,
    include: {
      inventoryItems: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPurchaseOrder(request: Request) {
  const body = await request.json();
  const { brand, name, style, size, quantity, link, note, orderedBy } = body;

  const allowedOrderers = new Set(["WangNa", "Shu", "Tim"]);
  const safeOrderedBy =
    typeof orderedBy === "string" && allowedOrderers.has(orderedBy)
      ? orderedBy
      : "WangNa";

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  const orderNumber = `PO-${dateStr}-${randomSuffix}`;

  const newOrder = await prisma.purchaseOrder.create({
    data: {
      orderNumber,
      orderedBy: safeOrderedBy,
      brand,
      name,
      style,
      size,
      quantity: quantity ? Number(quantity) : 1,
      link,
      note,
    },
  });
  return newOrder;
}

export async function updatePurchaseOrderNote(id: number, note: string | null) {
  return await prisma.purchaseOrder.update({
    where: { id },
    data: { note },
  });
}
