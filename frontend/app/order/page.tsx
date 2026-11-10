"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { api, errorMessage, jsonInit } from "@/lib/api";
import { localToday } from "@/lib/dates";
import type { ListResponse, StaffItem, StaffRequest } from "@/lib/types";

type Saved = "saving" | "saved" | "error";

/** 직원 주문 입력 화면: 날짜를 고르고 필요한 수량만 입력한다. (가격/구매처는 보이지 않는다) */
export default function OrderPage() {
  const router = useRouter();
  const [date, setDate] = useState(localToday());
  const [items, setItems] = useState<StaffItem[]>([]);
  const [qty, setQty] = useState<Record<number, string>>({});
  const [locked, setLocked] = useState<Set<number>>(new Set());
  const [saved, setSaved] = useState<Record<number, Saved>>({});
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<ListResponse<StaffItem>>("/purchasing/staff/items")
      .then((r) => setItems(r.data))
      .catch((e) => setError(errorMessage(e, "Failed to load items.")));
  }, []);

  const loadRequests = useCallback(async () => {
    try {
      const r = await api<ListResponse<StaffRequest>>(`/purchasing/staff/requests?date=${date}`);
      setQty(Object.fromEntries(r.data.map((x) => [x.item_id, String(x.qty)])));
      setLocked(new Set(r.data.filter((x) => x.status !== "requested").map((x) => x.item_id)));
      setSaved({});
      setError(null);
    } catch (e) {
      setError(errorMessage(e, "Failed to load requests."));
    }
  }, [date]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const clearSaved = (id: number) =>
    setSaved((s) => Object.fromEntries(Object.entries(s).filter(([k]) => Number(k) !== id)));

  const save = async (item: StaffItem) => {
    const raw = (qty[item.id] ?? "").trim();
    const value = raw === "" ? 0 : Number(raw);
    if (Number.isNaN(value) || value < 0) {
      setSaved((s) => ({ ...s, [item.id]: "error" }));
      return;
    }
    setSaved((s) => ({ ...s, [item.id]: "saving" }));
    try {
      await api("/purchasing/staff/requests", jsonInit("PUT", { date, item_id: item.id, qty: value }));
      setSaved((s) => ({ ...s, [item.id]: "saved" }));
    } catch (e) {
      setSaved((s) => ({ ...s, [item.id]: "error" }));
      setError(errorMessage(e, `Could not save ${item.name}.`));
    }
  };

  const logout = async () => {
    try {
      await api("/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, StaffItem[]>();
    for (const it of items) {
      if (q && !it.name.toLowerCase().includes(q)) continue;
      const key = it.category || "Other";
      map.set(key, [...(map.get(key) ?? []), it]);
    }
    return [...map.entries()];
  }, [items, search]);

  const requestedCount = Object.values(qty).filter((v) => Number(v) > 0).length;

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Order Request</h1>
            <p className="text-gray-400 text-sm">Enter the quantity you need. Leave blank if none.</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-2 rounded-xl text-sm font-bold"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur py-3 space-y-3 border-b border-gray-800">
          <div className="flex gap-3 items-center">
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-lg font-bold"
            />
            <span className="text-sm text-gray-400">{requestedCount} items requested</span>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-rose-300 text-sm font-medium">
            ⚠️ {error}
          </div>
        )}

        {groups.map(([category, list]) => (
          <section key={category} className="space-y-2">
            <h2 className="text-sm font-black uppercase tracking-widest text-indigo-300 pt-2">{category}</h2>
            {list.map((it) => {
              const isLocked = locked.has(it.id);
              return (
                <div key={it.id} className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold leading-tight">{it.name}</p>
                    <p className="text-xs text-gray-400">
                      {it.pack_size ? `${it.pack_size} · ` : ""}order by {it.order_unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-center text-sm">
                      {saved[it.id] === "saving" && "…"}
                      {saved[it.id] === "saved" && <span className="text-emerald-400">✓</span>}
                      {saved[it.id] === "error" && <span className="text-rose-400">!</span>}
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      disabled={isLocked}
                      value={qty[it.id] ?? ""}
                      onChange={(e) => {
                        setQty((q) => ({ ...q, [it.id]: e.target.value }));
                        clearSaved(it.id);
                      }}
                      onBlur={() => save(it)}
                      placeholder="0"
                      aria-label={`${it.name} quantity`}
                      className="w-24 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-right text-lg font-bold disabled:opacity-50"
                    />
                    {isLocked && <span className="text-xs text-amber-400 font-bold">Ordered</span>}
                  </div>
                </div>
              );
            })}
          </section>
        ))}
        {items.length > 0 && groups.length === 0 && <p className="text-gray-500 text-center py-8">No items match.</p>}
      </div>
    </main>
  );
}
