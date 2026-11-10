"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, errorMessage, jsonInit } from "@/lib/api";
import type { ListResponse, PurchaseItem, Vendor, VendorPrice } from "@/lib/types";

const inputCls = "bg-gray-900 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-white outline-none focus:border-indigo-500";

/** 품목 추가/수정/삭제와 구매처별 가격 입력, 구매처 관리. */
export default function ItemsPrices() {
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [prices, setPrices] = useState<VendorPrice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState({ name: "", category: "", order_unit: "case", pack_size: "", default_vendor_id: "" });
  const [newVendor, setNewVendor] = useState("");

  const load = useCallback(async () => {
    try {
      const [i, v, p] = await Promise.all([
        api<ListResponse<PurchaseItem>>("/purchasing/items"),
        api<ListResponse<Vendor>>("/purchasing/vendors"),
        api<ListResponse<VendorPrice>>("/purchasing/prices"),
      ]);
      setItems(i.data);
      setVendors(v.data);
      setPrices(p.data);
      setError(null);
    } catch (e) {
      setError(errorMessage(e, "Failed to load items."));
    }
  }, []);

  useEffect(() => {
    // 마운트/날짜 변경 시 서버 데이터를 불러온다 (상태 설정은 await 이후에 일어난다)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const run = async (action: () => Promise<unknown>, fail: string) => {
    try {
      await action();
      await load();
    } catch (e) {
      setError(errorMessage(e, fail));
      await load();
    }
  };

  const activeVendors = useMemo(() => vendors.filter((v) => v.active), [vendors]);
  const priceOf = (itemId: number, vendorId: number) => prices.find((p) => p.item_id === itemId && p.vendor_id === vendorId);
  const categories = useMemo(() => [...new Set(items.map((i) => i.category).filter(Boolean))].sort(), [items]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => !q || i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
  }, [items, search]);

  const addItem = async () => {
    if (!draft.name.trim()) return;
    await run(() => api("/purchasing/items", jsonInit("POST", {
      ...draft,
      name: draft.name.trim(),
      default_vendor_id: draft.default_vendor_id ? Number(draft.default_vendor_id) : null,
    })), "Could not add item.");
    setDraft({ name: "", category: draft.category, order_unit: "case", pack_size: "", default_vendor_id: "" });
  };

  const savePrice = (item: PurchaseItem, vendor: Vendor, raw: string) => {
    const text = raw.replace(/[^0-9.]/g, "");
    const current = priceOf(item.id, vendor.id);
    if (text === "") {
      if (current) return run(() => api(`/purchasing/prices?item_id=${item.id}&vendor_id=${vendor.id}`, { method: "DELETE" }), "Could not clear price.");
      return;
    }
    const value = parseFloat(text);
    if (Number.isNaN(value) || value === current?.price) return;
    return run(() => api("/purchasing/prices", jsonInit("PUT", {
      item_id: item.id, vendor_id: vendor.id, price: value, note: current?.note ?? "", vendor_code: current?.vendor_code ?? "",
    })), "Could not save price.");
  };

  const updateItem = (item: PurchaseItem, field: keyof PurchaseItem, value: string) => {
    if (String(item[field] ?? "") === value) return;
    return run(() => api(`/purchasing/items/${item.id}`, jsonInit("PUT", {
      [field]: field === "default_vendor_id" ? (value ? Number(value) : null) : value,
    })), "Could not update item.");
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-rose-300 text-sm font-medium">⚠️ {error}</div>
      )}

      {/* 품목 추가 */}
      <section className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3">
        <h3 className="font-bold text-gray-200">Add item</h3>
        <div className="flex flex-wrap gap-2 items-end">
          <input className={`${inputCls} w-56`} placeholder="Item name" value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && addItem()} />
          <input className={`${inputCls} w-40`} placeholder="Category" list="purchasing-categories" value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
          <datalist id="purchasing-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          <input className={`${inputCls} w-24`} placeholder="Unit" value={draft.order_unit}
            onChange={(e) => setDraft({ ...draft, order_unit: e.target.value })} />
          <input className={`${inputCls} w-32`} placeholder="Pack size" value={draft.pack_size}
            onChange={(e) => setDraft({ ...draft, pack_size: e.target.value })} />
          <select className={`${inputCls} w-44`} value={draft.default_vendor_id}
            onChange={(e) => setDraft({ ...draft, default_vendor_id: e.target.value })}>
            <option value="">Default vendor…</option>
            {activeVendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <button onClick={addItem} className="bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 rounded-lg font-bold text-sm">Add</button>
        </div>
      </section>

      {/* 품목 × 구매처 가격 */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-bold text-gray-200">Items &amp; vendor prices ({visible.length})</h3>
          <input className={`${inputCls} w-56`} placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <p className="text-xs text-gray-500">Price per order unit. Leave blank if the vendor doesn&apos;t sell it.</p>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-900/50 text-gray-300">
              <tr>
                <th className="px-2 py-3 text-left">Item</th>
                <th className="px-2 py-3 text-left">Category</th>
                <th className="px-2 py-3 text-left">Unit</th>
                <th className="px-2 py-3 text-left">Pack</th>
                <th className="px-2 py-3 text-left">Default</th>
                {activeVendors.map((v) => <th key={v.id} className="px-2 py-3 text-right whitespace-nowrap">{v.name}</th>)}
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {visible.map((it) => (
                <tr key={it.id}>
                  <td className="px-2 py-1"><input aria-label={`Name of ${it.name}`} className={`${inputCls} w-56`} defaultValue={it.name} onBlur={(e) => e.target.value.trim() && updateItem(it, "name", e.target.value.trim())} /></td>
                  <td className="px-2 py-1"><input className={`${inputCls} w-36`} defaultValue={it.category} list="purchasing-categories" onBlur={(e) => updateItem(it, "category", e.target.value.trim())} /></td>
                  <td className="px-2 py-1"><input className={`${inputCls} w-20`} defaultValue={it.order_unit} onBlur={(e) => e.target.value.trim() && updateItem(it, "order_unit", e.target.value.trim())} /></td>
                  <td className="px-2 py-1"><input className={`${inputCls} w-28`} defaultValue={it.pack_size} onBlur={(e) => updateItem(it, "pack_size", e.target.value.trim())} /></td>
                  <td className="px-2 py-1">
                    <select className={`${inputCls} w-36`} value={it.default_vendor_id ?? ""} onChange={(e) => updateItem(it, "default_vendor_id", e.target.value)}>
                      <option value="">—</option>
                      {activeVendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </td>
                  {activeVendors.map((v) => {
                    const p = priceOf(it.id, v.id);
                    return (
                      <td key={v.id} className="px-2 py-1 text-right">
                        <input
                          key={`${it.id}-${v.id}-${p?.price ?? ""}`}
                          className={`${inputCls} w-24 text-right font-mono`}
                          defaultValue={p?.price != null ? String(p.price) : ""}
                          placeholder={p ? "?" : ""}
                          inputMode="decimal"
                          aria-label={`${it.name} price at ${v.name}`}
                          title={[p?.vendor_code && `Code ${p.vendor_code}`, p?.note].filter(Boolean).join(" · ")}
                          onBlur={(e) => savePrice(it, v, e.target.value)}
                        />
                      </td>
                    );
                  })}
                  <td className="px-2 py-1 text-right">
                    <button
                      onClick={() => confirm(`Remove "${it.name}" from the list? Past orders are kept.`) &&
                        run(() => api(`/purchasing/items/${it.id}`, { method: "DELETE" }), "Could not remove item.")}
                      className="text-rose-400 hover:text-rose-300 bg-rose-900/20 px-2 py-1 rounded text-xs font-bold"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 구매처 관리 */}
      <section className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3">
        <h3 className="font-bold text-gray-200">Vendors</h3>
        <div className="flex flex-wrap gap-2">
          {vendors.map((v) => (
            <button key={v.id}
              onClick={() => run(() => api(`/purchasing/vendors/${v.id}`, jsonInit("PUT", { active: !v.active })), "Could not update vendor.")}
              title={v.active ? "Click to hide" : "Click to show again"}
              className={`px-3 py-1.5 rounded-full text-sm font-bold border ${v.active ? "border-indigo-400/50 bg-indigo-500/10 text-indigo-200" : "border-gray-600 text-gray-500 line-through"}`}>
              {v.name}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input className={`${inputCls} w-56`} placeholder="New vendor name" value={newVendor}
            onChange={(e) => setNewVendor(e.target.value)} />
          <button
            onClick={async () => {
              if (!newVendor.trim()) return;
              await run(() => api("/purchasing/vendors", jsonInit("POST", { name: newVendor.trim() })), "Could not add vendor.");
              setNewVendor("");
            }}
            className="bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 rounded-lg font-bold text-sm">Add vendor</button>
        </div>
      </section>
    </div>
  );
}
