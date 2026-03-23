import { prisma } from "../prisma";

export async function getExchanges() {
  const records = await prisma.exchangeRecord.findMany({
    orderBy: { createdAt: "desc" },
  });

  return records.map((record) => ({
    id: record.id,
    twdSpent: record.twdSpent,
    thbReceived: record.thbReceived,
    date: new Date(record.createdAt).toLocaleString(),
  }));
}

export async function createExchange(twdSpent: number, thbReceived: number) {
  const newRecord = await prisma.exchangeRecord.create({
    data: {
      twdSpent,
      thbReceived,
    },
  });

  return {
    id: newRecord.id,
    twdSpent: newRecord.twdSpent,
    thbReceived: newRecord.thbReceived,
    date: new Date(newRecord.createdAt).toLocaleString(),
  };
}

export async function updateExchange(
  id: number,
  twdSpent: number,
  thbReceived: number,
) {
  const updated = await prisma.exchangeRecord.update({
    where: { id },
    data: {
      twdSpent,
      thbReceived,
    },
  });

  return {
    id: updated.id,
    twdSpent: updated.twdSpent,
    thbReceived: updated.thbReceived,
    date: new Date(updated.createdAt).toLocaleString(),
  };
}
