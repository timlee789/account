"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, errorMessage, jsonInit } from "@/lib/api";
import { localToday } from "@/lib/dates";
import type { CompareLine, CompareResponse } from "@/lib/types";

const money = (n: number | null | undefined) =>
  n == null ? "—" : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_STYLE: Record<string, string> = {
  requested: "bg-gray-700 text-gray-200",
  ordered: "bg-amber-500/20 text-amber-300",
  received: "bg-emerald-500/20 text-emerald-300",
};

/** 요청 수량을 구매처별 가격으로 비교하고, 구매처를 확정해 주문서를 만든다. */
export default function OrderCompare() {
  const [date, setDate] = useState(localToday());
  const [data, setData] = useState<CompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<CompareResponse>(`/purchasing/compare?date=${date}`));
      setError(null);
    } catch (e) {
      setError(errorMessage(e, "Failed to load orders."));
    }
  }, [date]);

  useEffect(() => {
    // 마운트/날짜 변경 시 서버 데이터를 불러온다 (상태 설정은 await 이후에 일어난다)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const act = async (action: () => Promise<unknown>, fail: string) => {
    try {
      await action();
      await load();
    } catch (e) {
      setError(errorMessage(e, fail));
    }
  };

  const vendors = useMemo(() => (data?.vendors ?? []).filter((v) => v.active), [data]);
  const vendorName = (id: number | null) => data?.vendors.find((v) => v.id === id)?.name ?? "Unassigned";

  const sheets = useMemo(() => {
    const map = new Map<number | null, CompareLine[]>();
    for (const ln of data?.lines ?? []) map.set(ln.vendor_id, [...(map.get(ln.vendor_id) ?? []), ln]);
    return [...map.entries()];
  }, [data]);

  const sheetText = (vId: number | null, lines: CompareLine[]) =>
    [`${vendorName(vId)} — order for ${date}`, ...lines.map((l) =>
      `- ${l.name}${l.pack_size ? ` (${l.pack_size})` : ""}: ${l.qty} ${l.order_unit}`)].join("\n");

  const copy = async (vId: number | null, lines: CompareLine[]) => {
    try {
      await navigator.clipboard.writeText(sheetText(vId, lines));
      setCopied(vId ?? -1);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setError("Could not copy to clipboard.");
    }
  };

  const receive = (list: CompareLine[]) =>
    act(() => Promise.all(list.filter((l) => l.status === "ordered").map((l) =>
      api(`/purchasing/requests/${l.request_id}/status`, jsonInit("PUT", { status: "received" })))),
      "Could not mark as received.");

  const lines = data?.lines ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-bold text-gray-300">Order date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 font-bold"
        />
        <button onClick={load} className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg text-sm font-bold">
          Refresh
        </button>
        <a href="/order" target="_blank" rel="noreferrer" className="text-sm text-indigo-300 hover:text-indigo-200 underline">
          Open staff entry page ↗
        </a>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-rose-300 text-sm font-medium">
          ⚠️ {error}
        </div>
      )}

      {lines.length === 0 ? (
        <p className="text-gray-500 py-10 text-center">No requests for this date yet.</p>
      ) : (
        <>
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-900/50 text-gray-300">
                <tr>
                  <th className="px-3 py-3 text-left">Item</th>
                  <th className="px-3 py-3 text-right">Qty</th>
                  {vendors.map((v) => (
                    <th key={v.id} className="px-3 py-3 text-right whitespace-nowrap">{v.name}</th>
                  ))}
                  <th className="px-3 py-3 text-right">Line total</th>
                  <th className="px-3 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {lines.map((ln) => {
                  const priced = ln.prices.filter((p) => p.price != null).map((p) => p.price as number);
                  const cheapest = priced.length ? Math.min(...priced) : null;
                  const editable = ln.status === "requested";
                  return (
                    <tr key={ln.request_id}>
                      <td className="px-3 py-2">
                        <p className="font-semibold text-gray-100">{ln.name}</p>
                        <p className="text-xs text-gray-500">{ln.pack_size}</p>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap font-bold">
                        {ln.qty} <span className="text-xs text-gray-400">{ln.order_unit}</span>
                      </td>
                      {vendors.map((v) => {
                        const p = ln.prices.find((x) => x.vendor_id === v.id);
                        const selected = ln.vendor_id === v.id;
                        const isCheapest = p?.price != null && p.price === cheapest;
                        return (
                          <td key={v.id} className="px-1 py-1 text-right">
                            <button
                              disabled={!editable || !p}
                              title={p?.note || (p ? "" : "Not sold here")}
                              onClick={() =>
                                act(() => api(`/purchasing/requests/${ln.request_id}/vendor`,
                                  jsonInit("PUT", { vendor_id: selected && ln.assigned_vendor_id ? null : v.id })),
                                  "Could not change vendor.")}
                              className={`w-full px-2 py-1.5 rounded-lg border font-mono ${
                                selected ? "border-indigo-400 bg-indigo-500/20 text-white" : "border-transparent hover:bg-gray-700/60"
                              } ${isCheapest ? "text-emerald-300 font-bold" : "text-gray-300"} disabled:cursor-default`}
                            >
                              {p ? money(p.price) : <span className="text-gray-600">n/a</span>}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-right font-mono font-bold">{money(ln.line_total)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_STYLE[ln.status]}`}>{ln.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500">
            Green = lowest price. The lowest-price vendor is selected automatically; click a price to choose a different vendor
            (click again to go back to automatic). Items with no price use their default vendor.
          </p>

          <h3 className="text-lg font-bold text-gray-200">Order sheets</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {sheets.map(([vId, list]) => {
              const total = data?.vendor_totals.find((t) => t.vendor_id === vId);
              const open = list.filter((l) => l.status === "requested").length;
              return (
                <div key={vId ?? "none"} className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <h4 className="font-bold text-indigo-300">{vendorName(vId)}</h4>
                    <span className="font-mono text-sm text-gray-300">
                      {money(total?.total ?? 0)}
                      {total && total.unpriced > 0 && <span className="text-amber-400"> +{total.unpriced} unpriced</span>}
                    </span>
                  </div>
                  <ul className="text-sm text-gray-300 space-y-1">
                    {list.map((l) => (
                      <li key={l.request_id} className="flex justify-between gap-3">
                        <span>{l.name} <span className="text-gray-500">{l.pack_size}</span></span>
                        <span className="font-bold whitespace-nowrap">{l.qty} {l.order_unit}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => copy(vId, list)} className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-sm font-bold">
                      {copied === (vId ?? -1) ? "Copied ✓" : "Copy"}
                    </button>
                    {vId != null && (
                      <button
                        disabled={open === 0}
                        onClick={() => act(() => api("/purchasing/orders/ordered", jsonInit("POST", { date, vendor_id: vId })),
                          "Could not mark as ordered.")}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 px-3 py-1.5 rounded-lg text-sm font-bold"
                      >
                        Mark ordered{open ? ` (${open})` : ""}
                      </button>
                    )}
                    {list.some((l) => l.status === "ordered") && (
                      <button onClick={() => receive(list)} className="bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg text-sm font-bold">
                        Mark received
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
