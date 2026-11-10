"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { localToday } from "@/lib/dates";
import type { ListResponse, PurchaseItem, PurchaseReport as Report, Vendor } from "@/lib/types";

const money = (n: number | null | undefined, digits = 2) =>
  n == null ? "—" : `$${n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

const selectCls = "bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500";

/** YYYY-MM-DD 계산용: 로컬 날짜 문자열에서 월 단위로 이동 */
const ymd = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const lastDay = (y: number, m: number) => new Date(y, m, 0).getDate();

function presetRange(id: string): { from: string; to: string } {
  const [y, m] = localToday().split("-").map(Number);
  switch (id) {
    case "last": {
      const py = m === 1 ? y - 1 : y;
      const pm = m === 1 ? 12 : m - 1;
      return { from: ymd(py, pm, 1), to: ymd(py, pm, lastDay(py, pm)) };
    }
    case "3m": {
      const sm = m - 2 <= 0 ? m + 10 : m - 2;
      const sy = m - 2 <= 0 ? y - 1 : y;
      return { from: ymd(sy, sm, 1), to: ymd(y, m, lastDay(y, m)) };
    }
    case "year":
      return { from: ymd(y, 1, 1), to: ymd(y, 12, 31) };
    case "all":
      return { from: "2000-01-01", to: "2099-12-31" };
    default:
      return { from: ymd(y, m, 1), to: ymd(y, m, lastDay(y, m)) };
  }
}

const PRESETS = [
  { id: "month", label: "This month" },
  { id: "last", label: "Last month" },
  { id: "3m", label: "Last 3 months" },
  { id: "year", label: "This year" },
  { id: "all", label: "All" },
];

function csvEscape(v: string | number | null): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 구매 현황표: 무엇을 언제 어떤 가격에 얼마나 샀는지 집계. 발주 처리된 주문만 포함한다. */
export default function PurchaseReport() {
  const [range, setRange] = useState(presetRange("month"));
  const [preset, setPreset] = useState("month");
  const [vendorId, setVendorId] = useState("");
  const [category, setCategory] = useState("");
  const [itemId, setItemId] = useState("");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api<ListResponse<Vendor>>("/purchasing/vendors"), api<ListResponse<PurchaseItem>>("/purchasing/items?include_inactive=true")])
      .then(([v, i]) => { setVendors(v.data); setItems(i.data); })
      .catch((e) => setError(errorMessage(e, "Failed to load filters.")));
  }, []);

  const load = useCallback(async () => {
    const q = new URLSearchParams({ from: range.from, to: range.to });
    if (vendorId) q.set("vendor_id", vendorId);
    if (category) q.set("category", category);
    if (itemId) q.set("item_id", itemId);
    try {
      setReport(await api<Report>(`/purchasing/report?${q}`));
      setError(null);
    } catch (e) {
      setError(errorMessage(e, "Failed to load the report."));
    }
  }, [range, vendorId, category, itemId]);

  useEffect(() => {
    // 필터가 바뀔 때마다 다시 집계 (상태 설정은 await 이후에 일어난다)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const categories = useMemo(() => [...new Set(items.map((i) => i.category).filter(Boolean))].sort(), [items]);
  const maxMonth = Math.max(1, ...(report?.by_month.map((m) => m.spend) ?? [0]));
  const maxVendor = Math.max(1, ...(report?.by_vendor.map((v) => v.spend) ?? [0]));
  const maxCat = Math.max(1, ...(report?.by_category.map((c) => c.spend) ?? [0]));

  const exportCsv = () => {
    if (!report) return;
    const head = ["Date", "Item", "Category", "Vendor", "Qty", "Unit", "Unit price", "Total", "Status"];
    const lines = report.rows.map((r) => [r.date, r.name, r.category, r.vendor, r.qty, r.order_unit, r.unit_price, r.line_total, r.status]);
    const csv = [head, ...lines].map((l) => l.map(csvEscape).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `purchases_${range.from}_${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const Bar = ({ value, max, color }: { value: number; max: number; color: string }) => (
    <div className="h-2 rounded-full bg-gray-700/60 overflow-hidden min-w-[80px]">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(2, (value / max) * 100)}%` }} />
    </div>
  );

  const s = report?.summary;

  return (
    <div className="space-y-8">
      {/* 필터 */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button key={p.id}
              onClick={() => { setPreset(p.id); setRange(presetRange(p.id)); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold ${preset === p.id ? "bg-indigo-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
              {p.label}
            </button>
          ))}
          <input type="date" value={range.from} aria-label="From date" className={selectCls}
            onChange={(e) => { if (e.target.value) { setPreset(""); setRange({ ...range, from: e.target.value }); } }} />
          <span className="text-gray-500">~</span>
          <input type="date" value={range.to} aria-label="To date" className={selectCls}
            onChange={(e) => { if (e.target.value) { setPreset(""); setRange({ ...range, to: e.target.value }); } }} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className={selectCls} value={vendorId} onChange={(e) => setVendorId(e.target.value)} aria-label="Vendor">
            <option value="">All vendors</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <select className={selectCls} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className={`${selectCls} max-w-[260px]`} value={itemId} onChange={(e) => setItemId(e.target.value)} aria-label="Item">
            <option value="">All items</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.name}{i.active ? "" : " (removed)"}</option>)}
          </select>
          {(vendorId || category || itemId) && (
            <button onClick={() => { setVendorId(""); setCategory(""); setItemId(""); }} className="text-sm text-indigo-300 underline">Clear filters</button>
          )}
          <button onClick={exportCsv} disabled={!report?.rows.length}
            className="ml-auto bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-4 py-2 rounded-lg text-sm font-bold">
            Download CSV
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Counts only orders marked <b>ordered</b> or <b>received</b> in Purchasing. Prices are the unit price recorded when the order was placed.
        </p>
      </div>

      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-rose-300 text-sm font-medium">⚠️ {error}</div>}

      {s && s.lines === 0 && <p className="text-gray-500 py-10 text-center">No purchases in this period. Orders appear here after you click &quot;Mark ordered&quot;.</p>}

      {s && s.lines > 0 && report && (
        <>
          {/* 핵심 숫자 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total spend", value: money(s.total_spend), tone: "text-white" },
              { label: "Purchase lines", value: s.lines.toLocaleString(), tone: "text-white" },
              { label: "Different items", value: s.items.toLocaleString(), tone: "text-white" },
              { label: "Missing price", value: s.unpriced_lines.toLocaleString(), tone: s.unpriced_lines ? "text-amber-300" : "text-gray-400" },
            ].map((k) => (
              <div key={k.label} className="bg-gray-800 rounded-xl border border-gray-700 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{k.label}</p>
                <p className={`text-2xl font-black mt-1 ${k.tone}`}>{k.value}</p>
              </div>
            ))}
          </div>
          {s.unpriced_lines > 0 && (
            <p className="text-sm text-amber-300">
              ⚠️ {s.unpriced_lines} ordered line(s) had no price entered, so they are not in the spend totals. Fill in prices before ordering to keep the numbers complete.
            </p>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* 월별 */}
            <section className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3">
              <h3 className="font-bold text-gray-200">By month</h3>
              {report.by_month.map((m) => (
                <div key={m.month} className="space-y-1">
                  <div className="flex justify-between text-sm"><span className="text-gray-300">{m.month}</span><span className="font-mono font-bold">{money(m.spend)}</span></div>
                  <Bar value={m.spend} max={maxMonth} color="bg-indigo-500" />
                </div>
              ))}
            </section>
            {/* 구매처별 */}
            <section className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3">
              <h3 className="font-bold text-gray-200">By vendor</h3>
              {report.by_vendor.map((v) => (
                <div key={v.vendor} className="space-y-1">
                  <div className="flex justify-between text-sm"><span className="text-gray-300">{v.vendor} <span className="text-gray-500">{v.share}%</span></span><span className="font-mono font-bold">{money(v.spend)}</span></div>
                  <Bar value={v.spend} max={maxVendor} color="bg-emerald-500" />
                </div>
              ))}
            </section>
            {/* 분류별 */}
            <section className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3">
              <h3 className="font-bold text-gray-200">By category</h3>
              {report.by_category.map((c) => (
                <div key={c.category} className="space-y-1">
                  <div className="flex justify-between text-sm"><span className="text-gray-300">{c.category}</span><span className="font-mono font-bold">{money(c.spend)}</span></div>
                  <Bar value={c.spend} max={maxCat} color="bg-violet-500" />
                </div>
              ))}
            </section>
          </div>

          {/* 품목별 */}
          <section className="space-y-2">
            <h3 className="font-bold text-gray-200">By item <span className="text-xs font-normal text-gray-500">— click a row to see only that item</span></h3>
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-900/50 text-gray-300">
                  <tr>
                    <th className="px-3 py-3 text-left">Item</th>
                    <th className="px-3 py-3 text-right">Total qty</th>
                    <th className="px-3 py-3 text-right">Spend</th>
                    <th className="px-3 py-3 text-right">Avg price</th>
                    <th className="px-3 py-3 text-right">Min</th>
                    <th className="px-3 py-3 text-right">Max</th>
                    <th className="px-3 py-3 text-right">Last price</th>
                    <th className="px-3 py-3 text-right">Change</th>
                    <th className="px-3 py-3 text-left">Last bought</th>
                    <th className="px-3 py-3 text-right">Orders</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {report.by_item.map((it) => (
                    <tr key={it.item_id} onClick={() => setItemId(String(it.item_id))} className="cursor-pointer hover:bg-gray-700/40">
                      <td className="px-3 py-2"><p className="font-semibold text-gray-100">{it.name}</p><p className="text-xs text-gray-500">{it.category}</p></td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{it.qty} <span className="text-xs text-gray-500">{it.order_unit}</span></td>
                      <td className="px-3 py-2 text-right font-mono font-bold">{money(it.spend)}</td>
                      <td className="px-3 py-2 text-right font-mono">{money(it.avg_price)}</td>
                      <td className="px-3 py-2 text-right font-mono text-gray-400">{money(it.min_price)}</td>
                      <td className="px-3 py-2 text-right font-mono text-gray-400">{money(it.max_price)}</td>
                      <td className="px-3 py-2 text-right font-mono">{money(it.last_price)}</td>
                      <td className={`px-3 py-2 text-right font-mono ${it.change_pct == null ? "text-gray-500" : it.change_pct > 0 ? "text-rose-400" : it.change_pct < 0 ? "text-emerald-400" : "text-gray-400"}`}>
                        {it.change_pct == null ? "—" : `${it.change_pct > 0 ? "+" : ""}${it.change_pct}%`}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-300">{it.last_date ?? "—"}<span className="text-xs text-gray-500"> {it.last_vendor}</span></td>
                      <td className="px-3 py-2 text-right">{it.purchases}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500">Change = first to last unit price in this period (red = price went up). Avg price is weighted by quantity.</p>
          </section>

          {/* 상세 내역 */}
          <section className="space-y-2">
            <h3 className="font-bold text-gray-200">All purchases ({report.rows.length})</h3>
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-x-auto max-h-[520px] overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-900 text-gray-300 sticky top-0">
                  <tr>
                    <th className="px-3 py-3 text-left">Date</th>
                    <th className="px-3 py-3 text-left">Item</th>
                    <th className="px-3 py-3 text-left">Vendor</th>
                    <th className="px-3 py-3 text-right">Qty</th>
                    <th className="px-3 py-3 text-right">Unit price</th>
                    <th className="px-3 py-3 text-right">Total</th>
                    <th className="px-3 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {report.rows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-300">{r.date}</td>
                      <td className="px-3 py-2 text-gray-100">{r.name}</td>
                      <td className="px-3 py-2 text-gray-300">{r.vendor}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{r.qty} <span className="text-xs text-gray-500">{r.order_unit}</span></td>
                      <td className="px-3 py-2 text-right font-mono">{money(r.unit_price)}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold">{money(r.line_total)}</td>
                      <td className="px-3 py-2 text-center text-xs text-gray-400">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
