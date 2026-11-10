import { useState } from "react";
import { createPortal } from "react-dom";
import { api, jsonInit } from "@/lib/api";
import type { Option } from "@/lib/types";

interface Props {
  categories: Option[];
  payees: Option[];
  onClose: () => void;
  onRefreshOptions: () => void;
}

export default function SettingsModal({ categories = [], payees = [], onClose, onRefreshOptions }: Props) {
  const [newCategory, setNewCategory] = useState("");
  const [newPayee, setNewPayee] = useState("");
  const run = async (action: () => Promise<unknown>, failMsg: string) => {
    try {
      await action();
      onRefreshOptions();
    } catch (e) {
      console.error(failMsg, e);
      alert(e instanceof Error && e.message ? `${failMsg} (${e.message})` : failMsg);
    }
  };

  const handleAddCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    await run(() => api("/categories", jsonInit("POST", { name })), "카테고리 추가에 실패했습니다.");
    setNewCategory("");
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Delete this category?")) return;
    await run(() => api(`/categories/${id}`, { method: "DELETE" }), "카테고리 삭제에 실패했습니다.");
  };

  const handleAddPayee = async () => {
    const name = newPayee.trim();
    if (!name) return;
    await run(() => api("/payees", jsonInit("POST", { name })), "지급처 추가에 실패했습니다.");
    setNewPayee("");
  };

  const handleDeletePayee = async (id: number) => {
    if (!confirm("Delete this payee?")) return;
    await run(() => api(`/payees/${id}`, { method: "DELETE" }), "지급처 삭제에 실패했습니다.");
  };

  // 설정 모달은 클릭 후에만 렌더링되므로 서버 렌더링 대상이 아니다.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center backdrop-blur-md" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.95)' }}>
      <div className="border border-gray-600 p-4 pt-12 rounded-xl shadow-2xl flex flex-col md:flex-row gap-4 relative m-4 overflow-y-auto custom-scrollbar" style={{ width: '100%', maxWidth: '550px', maxHeight: '70vh', backgroundColor: '#111827', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)' }}>
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-900 hover:bg-gray-700 rounded-full w-8 h-8 flex items-center justify-center font-bold"
        >
          ✕
        </button>
        <div className="flex-1 space-y-3">
          <h4 className="text-lg font-bold text-indigo-400 border-b border-gray-700 pb-2">📂 Categories</h4>
          <div className="flex gap-2">
            <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} 
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
              placeholder="New Category..." 
              className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white outline-none focus:border-indigo-500" />
            <button onClick={handleAddCategory} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded font-bold transition-colors">Add</button>
          </div>
          <ul className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {categories.map((c) => (
              <li key={c.id} className="flex justify-between items-center bg-gray-900/50 p-2 rounded border border-gray-700/50">
                <span className="text-gray-300">{c.name}</span>
                <button onClick={() => handleDeleteCategory(c.id)} className="text-rose-500 hover:text-rose-400 bg-rose-900/20 px-2 py-1 rounded text-xs font-bold">Delete</button>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1 space-y-3 md:border-l md:border-gray-700 md:pl-4">
          <h4 className="text-lg font-bold text-emerald-400 border-b border-gray-700 pb-2">🏢 Payees</h4>
          <div className="flex gap-2">
            <input type="text" value={newPayee} onChange={(e) => setNewPayee(e.target.value)} 
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddPayee(); }}
              placeholder="New Payee..." 
              className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white outline-none focus:border-emerald-500" />
            <button onClick={handleAddPayee} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded font-bold transition-colors">Add</button>
          </div>
          <ul className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {payees.map((p) => (
              <li key={p.id} className="flex justify-between items-center bg-gray-900/50 p-2 rounded border border-gray-700/50">
                <span className="text-gray-300">{p.name}</span>
                <button onClick={() => handleDeletePayee(p.id)} className="text-rose-500 hover:text-rose-400 bg-rose-900/20 px-2 py-1 rounded text-xs font-bold">Delete</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>,
    document.body
  );
}
