"use client";

interface MonthRow {
  month: string;
  revenue: number;
  sales: number;
  totalExpense: number;
  businessExpense: number;
  homeExpense: number;
  netProfitLedger: number;
  netProfitSales: number;
  businessProfit: number;
  timLeeWage: number;
  ownerTotalProfit: number;
}

interface Totals {
  revenue: number;
  sales: number;
  totalExpense: number;
  businessExpense: number;
  homeExpense: number;
  netProfitLedger: number;
  netProfitSales: number;
  businessProfit: number;
  timLeeWage: number;
  ownerTotalProfit: number;
}

interface Props {
  months: MonthRow[];
  totals: Totals;
}

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const profitClass = (n: number) =>
  n >= 0 ? "text-indigo-300" : "text-rose-400";

const businessProfitClass = (n: number) =>
  n >= 0 ? "text-emerald-300" : "text-rose-400";

const ownerTotalProfitClass = (n: number) =>
  n >= 0 ? "text-amber-300" : "text-rose-400";

export default function MonthlyPLTable({ months, totals }: Props) {
  const columns: { key: keyof MonthRow; label: string; tone: string }[] = [
    { key: "revenue",          label: "Revenue",              tone: "text-emerald-300" },
    { key: "sales",            label: "Total Sales",          tone: "text-cyan-300"    },
    { key: "totalExpense",     label: "Total Expense",        tone: "text-rose-300"    },
    { key: "businessExpense",  label: "Business Expense",     tone: "text-fuchsia-300" },
    { key: "netProfitLedger",  label: "NP (Ledger)",          tone: "text-indigo-300"  },
    { key: "netProfitSales",   label: "NP (Sales)",           tone: "text-violet-300"  },
    { key: "businessProfit",   label: "Business Profit",      tone: "text-emerald-300" },
    { key: "ownerTotalProfit", label: "Owner's Total Profit", tone: "text-amber-300"   },
  ];

  return (
    <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-6 shadow-xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
            Monthly P&amp;L
          </h2>
          <p className="text-gray-400 text-xs mt-1 font-medium">
            Month-by-month profit and loss comparison
          </p>
        </div>
        <span className="text-gray-500 text-xs font-semibold">
          {months.length} {months.length === 1 ? "month" : "months"}
        </span>
      </div>

      {/* ── 계산식 범례 (Formula Legend) ── */}
      <div className="mb-4 px-4 py-3 bg-gray-900/40 rounded-xl border border-white/[0.06] text-[11px] text-gray-400 leading-6 font-mono">
        <span className="text-gray-300 font-bold not-italic">📐 계산식 (Formulas)</span>
        <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5">
          <div><span className="text-rose-300">Total Expense</span> = (Ledger+Cash) − CardPay − CashOut + CC</div>
          <div><span className="text-fuchsia-300">Business Expense</span> = Total Expense − Home</div>
          <div><span className="text-indigo-300">NP (Ledger)</span> = Revenue − Total Expense</div>
          <div><span className="text-violet-300">NP (Sales)</span> = Sales − Total Expense</div>
          <div><span className="text-emerald-300">Business Profit</span> = Sales − Business Expense</div>
          <div><span className="text-amber-300">Owner's Total Profit</span> = Business Profit + Owner Wage</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-gray-700/60 text-gray-300 text-[11px] font-black uppercase tracking-widest text-left px-4 py-3 border-b border-white/[0.07] rounded-tl-lg">
                Month
              </th>
              {columns.map((c, i) => (
                <th
                  key={c.key}
                  className={`bg-gray-700/60 ${c.tone} text-[11px] font-black uppercase tracking-widest text-right px-4 py-3 border-b border-white/[0.07] ${i === columns.length - 1 ? "rounded-tr-lg" : ""}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {months.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="text-center text-gray-500 py-10 text-sm">
                  No data yet.
                </td>
              </tr>
            ) : (
              months.map((row, idx) => (
                <tr
                  key={row.month}
                  className={`${idx % 2 === 0 ? "bg-gray-800/20" : "bg-gray-900/20"} hover:bg-gray-700/30 transition-colors`}
                >
                  <td className="sticky left-0 bg-inherit text-gray-100 font-bold px-4 py-3 border-b border-white/[0.05]">
                    {row.month}
                  </td>
                  {columns.map((c) => {
                    const val = row[c.key] as number;
                    const cls =
                      c.key === "ownerTotalProfit" ? ownerTotalProfitClass(val) :
                      c.key === "businessProfit" ? businessProfitClass(val) :
                      (c.key === "netProfitLedger" || c.key === "netProfitSales") ? profitClass(val) :
                      "text-gray-100";
                    return (
                      <td
                        key={c.key}
                        className={`text-right font-bold px-4 py-3 border-b border-white/[0.05] tabular-nums ${cls}`}
                      >
                        ${fmt(val)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
          {months.length > 0 && (
            <tfoot>
              <tr className="bg-gray-700/50">
                <td className="sticky left-0 bg-gray-700/80 text-gray-200 font-black uppercase tracking-wider text-[11px] px-4 py-3 rounded-bl-lg">
                  Total
                </td>
                {columns.map((c, i) => {
                  const val = totals[c.key as keyof Totals];
                  const cls =
                    c.key === "ownerTotalProfit" ? ownerTotalProfitClass(val) :
                    c.key === "businessProfit" ? businessProfitClass(val) :
                    (c.key === "netProfitLedger" || c.key === "netProfitSales") ? profitClass(val) :
                    "text-gray-100";
                  return (
                    <td
                      key={c.key}
                      className={`text-right font-black px-4 py-3 tabular-nums ${cls} ${i === columns.length - 1 ? "rounded-br-lg" : ""}`}
                    >
                      ${fmt(val)}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
