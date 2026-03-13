import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface Props {
  categories: { id: number; name: string }[];
  payees: { id: number; name: string }[];
  onClose: () => void;
  onRefreshOptions: () => void;
}

export default function SettingsModal({ categories = [], payees = [], onClose, onRefreshOptions }: Props) {
  const [newCategory, setNewCategory] = useState("");
  const [newPayee, setNewPayee] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/categories`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategory.trim() })
      });
      setNewCategory("");
      onRefreshOptions();
    } catch (e) { console.error(e); }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Delete this category?")) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/categories/${id}`, { method: "DELETE" });
      onRefreshOptions();
    } catch (e) { console.error(e); }
  };

  const handleAddPayee = async () => {
    if (!newPayee.trim()) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payees`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPayee.trim() })
      });
      setNewPayee("");
      onRefreshOptions();
    } catch (e) { console.error(e); }
  };

  const handleDeletePayee = async (id: number) => {
    if (!confirm("Delete this payee?")) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payees/${id}`, { method: "DELETE" });
      onRefreshOptions();
    } catch (e) { console.error(e); }
  };

  if (!mounted) return null;

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
