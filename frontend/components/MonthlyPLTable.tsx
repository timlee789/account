"use client";

interface MonthRow {
  month: string;
  revenue: number;
  sales: number;
  expense: number;
  realExpense: number;
  homeExpense: number;
  netProfit: number;
  netProfitSales: number;
  realProfit: number;
  timLeeWage: number;
  totalProfit: number;
}

interface Totals {
  revenue: number;
  sales: number;
  expense: number;
  realExpense: number;
  homeExpense: number;
  netProfit: number;
  netProfitSales: number;
  realProfit: number;
  timLeeWage: number;
  totalProfit: number;
}

interface Props {
  months: MonthRow[];
  totals: Totals;
}

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const profitClass = (n: number) =>
  n >= 0 ? "text-indigo-300" : "text-rose-400";

const realProfitClass = (n: number) =>
  n >= 0 ? "text-emerald-300" : "text-rose-400";

const totalProfitClass = (n: number) =>
  n >= 0 ? "text-amber-300" : "text-rose-400";

export default function MonthlyPLTable({ months, totals }: Props) {
  const columns: { key: keyof MonthRow; label: string; tone: string }[] = [
    { key: "revenue",        label: "Revenue",      tone: "text-emerald-300" },
    { key: "sales",          label: "Total Sales",  tone: "text-cyan-300"    },
    { key: "expense",        label: "Total Expense",tone: "text-rose-300"    },
    { key: "realExpense",    label: "Real Expense", tone: "text-fuchsia-300" },
    { key: "netProfit",      label: "NP (Rev)",     tone: "text-indigo-300"  },
    { key: "netProfitSales", label: "NP (Sales)",   tone: "text-violet-300"  },
    { key: "realProfit",     label: "Real Profit",  tone: "text-emerald-300" },
    { key: "totalProfit",    label: "Total Profit", tone: "text-amber-300"   },
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
                      c.key === "totalProfit" ? totalProfitClass(val) :
                      c.key === "realProfit" ? realProfitClass(val) :
                      (c.key === "netProfit" || c.key === "netProfitSales") ? profitClass(val) :
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
                    c.key === "totalProfit" ? totalProfitClass(val) :
                    c.key === "realProfit" ? realProfitClass(val) :
                    (c.key === "netProfit" || c.key === "netProfitSales") ? profitClass(val) :
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
