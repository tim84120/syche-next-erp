"use client";

import { useState } from "react";
import { ExchangeRecord } from "../app/types/index";
import { useSession } from "next-auth/react";
import { useI18n } from "@/lib/i18n";

interface ExchangeTableProps {
  records: ExchangeRecord[];
  onUpdateRecord: (
    id: number,
    twdSpent: number,
    thbReceived: number,
  ) => Promise<void>;
  onDeleteRecord: (id: number) => Promise<void>;
}

export default function ExchangeTable({
  records,
  onUpdateRecord,
  onDeleteRecord,
}: ExchangeTableProps) {
  const { t } = useI18n();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ twdSpent: 0, thbReceived: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEditClick = (record: ExchangeRecord) => {
    setEditingId(record.id);
    setEditForm({ twdSpent: record.twdSpent, thbReceived: record.thbReceived });
  };

  const handleCancelClick = () => {
    setEditingId(null);
  };

  const handleSaveClick = async (id: number) => {
    setIsSubmitting(true);
    try {
      await onUpdateRecord(id, editForm.twdSpent, editForm.thbReceived);
      setEditingId(null);
    } catch (error) {
      console.error("Failed to update record:", error);
      alert(t("exchangeTable.updateFailed", "更新失敗"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = async (id: number) => {
    if (
      !confirm(t("exchangeTable.deleteConfirm", "確定要刪除這筆換匯紀錄嗎？"))
    )
      return;
    setIsSubmitting(true);
    try {
      await onDeleteRecord(id);
    } catch (error) {
      console.error("Failed to delete record:", error);
      alert(t("exchangeTable.deleteFailed", "刪除失敗"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!records || records.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-8">
      <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-blue-500 rounded-full inline-block"></span>
            {t("exchangeTable.title", "換匯紀錄明細")}
          </h2>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t("exchangeTable.date", "日期")}
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t("exchangeTable.twd", "花費台幣 (TWD)")}
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t("exchangeTable.thb", "獲得泰銖 (THB)")}
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t("exchangeTable.rate", "單次匯率")}
              </th>
              {isAdmin && (
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("exchangeTable.actions", "操作")}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((record) => {
              const isEditing = editingId === record.id;
              const rate = record.twdSpent / record.thbReceived;

              return (
                <tr
                  key={record.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {record.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                    {isEditing ? (
                      <input
                        type="number"
                        className="w-24 px-2 py-1 border border-slate-300 rounded"
                        value={editForm.twdSpent}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            twdSpent: Number(e.target.value),
                          })
                        }
                      />
                    ) : (
                      `NT$ ${record.twdSpent.toLocaleString()}`
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                    {isEditing ? (
                      <input
                        type="number"
                        className="w-24 px-2 py-1 border border-slate-300 rounded"
                        value={editForm.thbReceived}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            thbReceived: Number(e.target.value),
                          })
                        }
                      />
                    ) : (
                      `฿ ${record.thbReceived.toLocaleString()}`
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                    {rate.toFixed(4)}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      {isEditing ? (
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleSaveClick(record.id)}
                            disabled={isSubmitting}
                            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition disabled:opacity-50"
                          >
                            {t("common.save", "儲存")}
                          </button>
                          <button
                            onClick={handleCancelClick}
                            disabled={isSubmitting}
                            className="bg-slate-200 text-slate-700 px-3 py-1 rounded hover:bg-slate-300 transition disabled:opacity-50"
                          >
                            {t("common.cancel", "取消")}
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleEditClick(record)}
                            className="text-blue-500 hover:text-blue-700 font-medium px-2 py-1"
                          >
                            {t("common.edit", "編輯")}
                          </button>
                          <button
                            onClick={() => handleDeleteClick(record.id)}
                            className="text-red-500 hover:text-red-700 font-medium px-2 py-1"
                          >
                            {t("common.delete", "刪除")}
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
