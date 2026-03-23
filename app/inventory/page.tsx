"use client";

import { useState, useEffect } from "react";
import { InventoryItem, ExchangeRecord } from "../types/index";
import InventoryTable from "../../components/InventoryTable";

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [, setExchangeRecords] = useState<ExchangeRecord[]>([]);

  useEffect(() => {
    let ignore = false;

    const fetchInitialData = async () => {
      try {
        const [invRes, excRes] = await Promise.all([
          fetch("/api/inventory"),
          fetch("/api/exchanges"),
        ]);

        if (invRes.ok) {
          const invData = await invRes.json();
          if (!ignore) setInventory(invData);
        }
        if (excRes.ok) {
          const excData = await excRes.json();
          if (!ignore) setExchangeRecords(excData);
        }
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
      }
    };

    fetchInitialData();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <>
      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-8">
        <InventoryTable inventory={inventory} />
      </main>
    </>
  );
}
