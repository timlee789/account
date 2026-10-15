"use client";

import { useState } from "react";

// 지폐 단위 (위에서 아래로 표시되는 순서)
const DENOMINATIONS = [1, 5, 10, 20, 50, 100];

// 세 칸(지폐 / 장수 / 금액) 열 너비
const ROW_GRID = { gridTemplateColumns: "1fr 76px 1fr" };

const formatMoney = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

// 현금 카운트 계산기 — 저장하지 않고 화면에서 합계만 확인하는 용도
export default function CashCount() {
  const [counts, setCounts] = useState<Record<number, string>>({});

  const countOf = (d: number) => {
    const n = parseInt(counts[d] || "", 10);
    return isNaN(n) ? 0 : n;
  };

  const total = DENOMINATIONS.reduce((sum, d) => sum + d * countOf(d), 0);
  const totalBills = DENOMINATIONS.reduce((sum, d) => sum + countOf(d), 0);

  const handleChange = (d: number, value: string) => {
    // 숫자만 입력되도록
    const cleaned = value.replace(/[^0-9]/g, "");
    setCounts((prev) => ({ ...prev, [d]: cleaned }));
  };

  return (
    <div
      style={{ width: "100%", maxWidth: 300, marginLeft: "auto", marginRight: "auto" }}
      className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white whitespace-nowrap">🧮 Cash Count</h2>
        <button
          onClick={() => setCounts({})}
          className="py-1 px-3 text-sm rounded-lg font-bold text-gray-300 bg-gray-700 hover:bg-gray-600 hover:text-white transition"
        >
          Clear
        </button>
      </div>

      <div
        style={ROW_GRID}
        className="grid gap-x-2 pb-2 text-sm font-semibold text-gray-400 border-b border-gray-700"
      >
        <span>Bill</span>
        <span className="text-center">Count</span>
        <span className="text-right">Amount</span>
      </div>

      <div className="divide-y divide-gray-700/60">
        {DENOMINATIONS.map((d) => (
          <div key={d} style={ROW_GRID} className="grid gap-x-2 items-center py-3">
            <span className="text-xl font-bold text-emerald-400">${d}</span>
            <input
              type="text"
              inputMode="numeric"
              value={counts[d] || ""}
              onChange={(e) => handleChange(d, e.target.value)}
              onFocus={(e) => e.target.select()}
              placeholder="0"
              className="w-full text-center text-xl font-semibold text-white bg-gray-900 border border-gray-600 rounded-lg py-2 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
            />
            <span className="text-right text-[17px] font-semibold text-gray-200 tabular-nums">
              {formatMoney(d * countOf(d))}
            </span>
          </div>
        ))}
      </div>

      <div className="pt-4 mt-1 border-t-2 border-indigo-500/60">
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-bold text-white">Total</span>
          <span className="text-3xl font-extrabold text-indigo-300 tabular-nums">
            {formatMoney(total)}
          </span>
        </div>
        <div className="text-right text-sm text-gray-400 tabular-nums mt-1">
          {totalBills} bills
        </div>
      </div>
    </div>
  );
}
