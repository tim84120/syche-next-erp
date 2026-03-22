import { prisma } from "@/lib/prisma";

export async function getPurchaseOrders() {
  return await prisma.purchaseOrder.findMany({
    include: {
      inventoryItems: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPurchaseOrder(request: Request) {
  const body = await request.json();
  const { brand, name, style, size, quantity, link, note } = body;

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  const orderNumber = `PO-${dateStr}-${randomSuffix}`;

  const newOrder = await prisma.purchaseOrder.create({
    data: {
      orderNumber,
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
