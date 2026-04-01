"use client";

interface DashboardSummary {
  totalRevenue: number;
  totalExpense: number;
  realExpense: number;
  netProfit: number;
  totalSales?: number;
  netProfitSales?: number;
  realProfit?: number;
  balance: number;
  salesBreakdown?: {
    cash: number;
    debit: number;
    credit: number;
    doordash: number;
    stripe: number;
    tips: number;
    cash_tips: number;
  };
  categoryExpenses?: { name: string; amount: number; budget?: number }[];
  payeeExpenses?: { name: string; amount: number }[];
  lifetimeStats?: {
    revenue: number;
    expense: number;
    realExpense?: number;
    netProfit: number;
    totalSales?: number;
    netProfitSales?: number;
    realProfit?: number;
  };
}

interface Props {
  summary: DashboardSummary;
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
  isLifetime?: boolean;
}

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2 });

export default function Dashboard({ summary, selectedMonth, onMonthChange, isLifetime }: Props) {
  const { totalRevenue, totalExpense, realExpense = 0, netProfit, totalSales = 0, netProfitSales = 0, realProfit = 0, balance, salesBreakdown, categoryExpenses = [], payeeExpenses = [] } = summary;

  const maxCategoryAmount = Math.max(...categoryExpenses.map(c => c.amount), 1);
  const totalCatExpense = categoryExpenses.reduce((s, c) => s + c.amount, 0);
  const maxPayeeAmount = Math.max(...payeeExpenses.map(p => p.amount), 1);
  const revenueRatio = totalRevenue + totalExpense > 0 ? (totalRevenue / (totalRevenue + totalExpense)) * 100 : 50;

  const handleBudgetChange = async (category: string, val: string) => {
    if (isLifetime || !selectedMonth) return;
    const num = parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/budgets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: selectedMonth, category, amount: num })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const salesItems = salesBreakdown ? [
    { label: "Cash Sales", value: salesBreakdown.cash,      icon: "💵", text: "text-emerald-300", border: "border-emerald-700/40" },
    { label: "Debit",      value: salesBreakdown.debit,     icon: "💳", text: "text-blue-300",    border: "border-blue-700/40" },
    { label: "Credit",     value: salesBreakdown.credit,    icon: "🏦", text: "text-violet-300",  border: "border-violet-700/40" },
    { label: "DoorDash",   value: salesBreakdown.doordash,  icon: "🚗", text: "text-orange-300",  border: "border-orange-700/40" },
    { label: "Stripe",     value: salesBreakdown.stripe,    icon: "⚡", text: "text-cyan-300",    border: "border-cyan-700/40" },
    { label: "CC Tips",    value: salesBreakdown.tips,      icon: "⭐", text: "text-amber-300",   border: "border-amber-700/40" },
    { label: "Cash Tips",  value: salesBreakdown.cash_tips, icon: "🎁", text: "text-pink-300",    border: "border-pink-700/40" },
  ] : [];

  return (
    <div className="mx-auto px-8 space-y-5" style={{ width: '600px', maxWidth: '100%' }}>

      {/* ── Header ── */}
      <div className="flex flex-col items-center gap-3 px-8 py-5 bg-gray-800/60 rounded-2xl border border-gray-700/50 shadow-xl backdrop-blur-md text-center">
        <div>
          <h2 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
            {isLifetime ? "Lifetime Overview" : "Financial Overview"}
          </h2>
          <p className="text-gray-400 text-xs mt-1 font-medium">
            {isLifetime ? "All-time performance since Jan 2026" : "Monthly performance and metrics"}
          </p>
        </div>
        {!isLifetime && selectedMonth && onMonthChange && (
          <label className="flex items-center gap-2 bg-gray-900/70 text-gray-100 px-4 py-2.5 rounded-xl border border-gray-600 hover:border-indigo-500 focus-within:border-indigo-500 shadow-md cursor-pointer transition-all">
            <span className="text-base">📅</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              className="bg-transparent font-bold text-sm focus:outline-none cursor-pointer"
              style={{ colorScheme: "dark" }}
            />
          </label>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div className="flex flex-col gap-4">
        {/* Row 1 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          {/* Revenue */}
          <div className="relative overflow-hidden bg-gray-800/60 rounded-2xl border border-emerald-800/40 hover:border-emerald-500/60 px-3 sm:px-5 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(16,185,129,0.15)] text-center group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full -translate-y-4 translate-x-4 group-hover:bg-emerald-500/10 transition-all"></div>
            <p className="text-emerald-400 text-[9px] sm:text-[11px] font-black uppercase tracking-widest mb-2 leading-tight">Total Revenue</p>
            <p className="text-xl sm:text-2xl font-black text-white">${fmt(totalRevenue)}</p>
            <div className="mt-3 h-1 w-full bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full" style={{ width: `${revenueRatio}%` }}></div>
            </div>
          </div>

          {/* Total Sales */}
          <div className="relative overflow-hidden bg-gray-800/60 rounded-2xl border border-cyan-800/40 hover:border-cyan-500/60 px-3 sm:px-5 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(6,182,212,0.15)] text-center group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-full -translate-y-4 translate-x-4 group-hover:bg-cyan-500/10 transition-all"></div>
            <p className="text-cyan-400 text-[9px] sm:text-[11px] font-black uppercase tracking-widest mb-2 leading-tight">Total Sales</p>
            <p className="text-xl sm:text-2xl font-black text-white">${fmt(totalSales)}</p>
            <p className="text-cyan-400/70 text-[9px] sm:text-[10px] mt-3 font-semibold leading-tight">POS & Kiosk</p>
          </div>

          {/* Expense */}
          <div className="relative overflow-hidden bg-gray-800/60 rounded-2xl border border-rose-800/40 hover:border-rose-500/60 px-3 sm:px-5 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(244,63,94,0.15)] text-center group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-full -translate-y-4 translate-x-4 group-hover:bg-rose-500/10 transition-all"></div>
            <p className="text-rose-400 text-[9px] sm:text-[11px] font-black uppercase tracking-widest mb-2 leading-tight">Total Expense</p>
            <p className="text-xl sm:text-2xl font-black text-rose-200">${fmt(totalExpense)}</p>
            <div className="mt-3 h-1 w-full bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full" style={{ width: `${100 - revenueRatio}%` }}></div>
            </div>
          </div>

          {/* Real Expense */}
          <div className="relative overflow-hidden bg-gray-800/60 rounded-2xl border border-fuchsia-800/40 hover:border-fuchsia-500/60 px-3 sm:px-5 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(217,70,239,0.15)] text-center group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-fuchsia-500/5 rounded-full -translate-y-4 translate-x-4 group-hover:bg-fuchsia-500/10 transition-all"></div>
            <p className="text-fuchsia-400 text-[9px] sm:text-[11px] font-black uppercase tracking-widest mb-2 leading-tight">Real Expense</p>
            <p className="text-xl sm:text-2xl font-black text-white">${fmt(realExpense)}</p>
            <p className="text-fuchsia-400/70 text-[9px] sm:text-[10px] mt-3 font-semibold leading-tight">W/O Card Pmt</p>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-4 gap-3 md:gap-4">
          {/* Net Profit (Revenue) */}
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-2xl border border-indigo-700/50 hover:border-indigo-400/70 px-2 sm:px-4 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(99,102,241,0.2)] text-center group flex flex-col items-center justify-between">
            <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-400/5 rounded-full -translate-y-4 translate-x-4 group-hover:bg-indigo-400/10 transition-all"></div>
            <p className="text-indigo-300 text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-2 leading-tight">Net Profit (Rev)</p>
            <p className={`text-xl sm:text-2xl font-black ${netProfit >= 0 ? 'text-white' : 'text-rose-400'}`}>${fmt(netProfit)}</p>
            <p className="text-indigo-400/70 text-[9px] sm:text-[10px] mt-3 font-semibold leading-tight">Take Home <br/>(Ledger+Cash)</p>
          </div>

          {/* Net Profit (Sales) */}
          <div className="relative overflow-hidden bg-gradient-to-br from-violet-900/50 to-fuchsia-900/50 rounded-2xl border border-violet-700/50 hover:border-violet-400/70 px-2 sm:px-4 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(139,92,246,0.2)] text-center group flex flex-col items-center justify-between">
            <div className="absolute top-0 right-0 w-16 h-16 bg-violet-400/5 rounded-full -translate-y-4 translate-x-4 group-hover:bg-violet-400/10 transition-all"></div>
            <p className="text-violet-300 text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-2 leading-tight">Net Profit (Sales)</p>
            <p className={`text-xl sm:text-2xl font-black ${netProfitSales >= 0 ? 'text-white' : 'text-rose-400'}`}>${fmt(netProfitSales)}</p>
            <p className="text-violet-400/70 text-[9px] sm:text-[10px] mt-3 font-semibold leading-tight">Take Home <br/>(Sales Only)</p>
          </div>

          {/* Real Profit */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl border border-emerald-700/50 hover:border-emerald-400/70 px-2 sm:px-4 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(16,185,129,0.2)] text-center group flex flex-col items-center justify-between">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-400/5 rounded-full -translate-y-4 translate-x-4 group-hover:bg-emerald-400/10 transition-all"></div>
            <p className="text-emerald-300 text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-2 leading-tight flex items-center justify-center gap-1">✨ Real Profit ✨</p>
            <p className={`text-xl sm:text-2xl font-black ${realProfit >= 0 ? 'text-white' : 'text-rose-400'}`}>${fmt(realProfit)}</p>
            <p className="text-emerald-400/70 text-[9px] sm:text-[10px] mt-3 font-semibold leading-tight flex items-center justify-center gap-1">True Profit<br/>(Sales - Real Exp)</p>
          </div>

          {/* Cash on Hand */}
          <div className="relative overflow-hidden bg-gray-800/60 rounded-2xl border border-amber-800/40 hover:border-amber-500/60 px-3 sm:px-5 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(245,158,11,0.15)] text-center group flex flex-col items-center justify-between">
            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full -translate-y-4 translate-x-4 group-hover:bg-amber-500/10 transition-all"></div>
            <p className="text-amber-400 text-[9px] sm:text-[11px] font-black uppercase tracking-widest mb-2 leading-tight">Cash on Hand</p>
            <p className="text-xl sm:text-2xl font-black text-white">${fmt(balance)}</p>
            <p className="text-amber-400/70 text-[9px] sm:text-[10px] mt-3 font-semibold leading-tight">Estimated Balance</p>
          </div>
        </div>
      </div>

      {/* ── Revenue vs Expense Bar ── */}
      <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 px-8 py-6 shadow-xl">
        <h3 className="text-base font-bold text-gray-100 text-center mb-5">
          ⚖️ {isLifetime ? "Lifetime" : "Monthly"} Revenue vs Expense
        </h3>
        <div className="grid grid-cols-3 text-center mb-3 gap-2">
          <div>
            <p className="text-emerald-400 font-black text-xs uppercase tracking-wider">Revenue</p>
            <p className="text-xl font-black text-gray-100">${fmt(totalRevenue)}</p>
          </div>
          <div>
            <p className={`font-black text-xs uppercase tracking-wider ${netProfit >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>Net Profit</p>
            <p className={`text-xl font-black ${netProfit >= 0 ? 'text-indigo-300' : 'text-rose-400'}`}>${fmt(netProfit)}</p>
          </div>
          <div>
            <p className="text-rose-400 font-black text-xs uppercase tracking-wider">Expense</p>
            <p className="text-xl font-black text-gray-100">${fmt(totalExpense)}</p>
          </div>
        </div>
        <div className="h-4 w-full bg-gray-700/80 rounded-full overflow-hidden flex gap-0.5">
          <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-l-full transition-all duration-1000"
            style={{ width: `${Math.max(3, revenueRatio)}%` }} />
          <div className="h-full bg-gradient-to-l from-rose-600 to-rose-400 rounded-r-full transition-all duration-1000"
            style={{ width: `${Math.max(3, 100 - revenueRatio)}%` }} />
        </div>
        <div className="grid grid-cols-3 mt-1.5 text-[10px] text-gray-500 font-semibold text-center">
          <span>{revenueRatio.toFixed(1)}%</span>
          <span></span>
          <span>{(100 - revenueRatio).toFixed(1)}%</span>
        </div>
      </div>

      {/* ── Sales Breakdown Cards ── */}
      {salesBreakdown && (
        <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 px-8 py-6 shadow-xl">
          <h3 className="text-base font-bold text-gray-100 text-center mb-5">📊 Sales Breakdown</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {salesItems.map((item) => (
              <div key={item.label} className={`bg-gray-900/50 rounded-xl border ${item.border} px-3 py-4 text-center hover:bg-gray-900/80 transition-all`}>
                <div className="text-xl mb-1">{item.icon}</div>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-1">{item.label}</p>
                <p className={`text-sm font-black ${item.text}`}>${fmt(item.value)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-700/50 text-center">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total Sales</p>
            <p className="text-emerald-300 font-black text-xl">
              ${fmt(totalSales)}
            </p>
          </div>
        </div>
      )}

      {/* ── Category & Payee Analysis ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Category Expenses */}
        {categoryExpenses.length > 0 && (
          <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 px-4 py-6 shadow-xl flex flex-col">
            <h3 className="text-base font-bold text-gray-100 text-center mb-4">🏷️ Category Expenses</h3>
            {/* Column headers */}
            <div className="grid grid-cols-4 border border-white/[0.07] rounded-t-lg overflow-hidden">
              <div className="text-[10px] text-gray-400 font-black uppercase tracking-wider text-center py-2 px-1 bg-gray-700/40">Category</div>
              <div className="text-[10px] text-indigo-400 font-black uppercase tracking-wider text-center py-2 px-1 bg-gray-700/40 border-l border-white/[0.07]">Budget</div>
              <div className="text-[10px] text-orange-400 font-black uppercase tracking-wider text-center py-2 px-1 bg-gray-700/40 border-l border-white/[0.07]">Actual</div>
              <div className="text-[10px] text-pink-400 font-black uppercase tracking-wider text-center py-2 px-1 bg-gray-700/40 border-l border-white/[0.07]">Percent</div>
            </div>
            {/* Rows */}
            <div className="border-l border-r border-white/[0.07] flex-1">
              {categoryExpenses.map((cat, idx) => {
                const pct = Math.max(2, (cat.amount / maxCategoryAmount) * 100);
                const sharePct = totalCatExpense > 0 ? (cat.amount / totalCatExpense) * 100 : 0;
                return (
                  <div key={idx} className={`grid grid-cols-4 border-b border-white/[0.07] hover:bg-gray-700/20 transition-colors ${idx % 2 === 0 ? 'bg-gray-800/20' : 'bg-gray-900/20'}`}>
                    <div className="py-2.5 px-2 flex items-center justify-center border-r border-white/[0.07]">
                      <span className="text-gray-200 text-xs font-semibold text-center leading-tight">{cat.name || "Uncategorized"}</span>
                    </div>
                    <div className="py-2.5 px-2 flex items-center justify-center border-r border-white/[0.07]">
                      {!isLifetime ? (
                        <input
                          key={`${cat.name}-${cat.budget}`}
                          type="text"
                          inputMode="decimal"
                          defaultValue={cat.budget ? fmt(cat.budget) : ""}
                          className="bg-gray-700/40 w-full text-center px-1 py-0.5 rounded border border-white/[0.07] focus:border-indigo-400 focus:outline-none text-indigo-200 text-xs font-bold transition-all"
                          placeholder="0"
                          onBlur={(e) => handleBudgetChange(cat.name, e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        />
                      ) : (
                        <span className="text-indigo-300 text-xs font-bold">
                          {cat.budget ? `$${fmt(cat.budget)}` : '-'}
                        </span>
                      )}
                    </div>
                    <div className="py-2.5 px-2 flex items-center justify-center border-r border-white/[0.07]">
                      <span className="text-orange-300 text-xs font-black">${fmt(cat.amount)}</span>
                    </div>
                    <div className="py-2.5 px-2 flex items-center justify-center">
                      <span className="text-pink-300 text-xs font-black">{sharePct.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Totals */}
            <div className="grid grid-cols-4 border border-t-0 border-white/[0.07] rounded-b-lg bg-gray-700/30">
              <div className="py-2.5 px-2 flex items-center justify-center border-r border-white/[0.07]">
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Total</span>
              </div>
              <div className="py-2.5 px-2 flex items-center justify-center border-r border-white/[0.07]">
                {!isLifetime && (
                  <span className="text-indigo-300 font-black text-sm">${fmt(categoryExpenses.reduce((s, c) => s + (c.budget || 0), 0))}</span>
                )}
              </div>
              <div className="py-2.5 px-2 flex items-center justify-center border-r border-white/[0.07]">
                <span className="text-orange-300 font-black text-sm">${fmt(totalCatExpense)}</span>
              </div>
              <div className="py-2.5 px-2 flex items-center justify-center">
                <span className="text-pink-300 font-black text-sm">100.0%</span>
              </div>
            </div>
          </div>
        )}

        {/* Payee Analysis */}
        {payeeExpenses.length > 0 && (
          <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 px-8 py-6 shadow-xl flex flex-col">
            <h3 className="text-base font-bold text-gray-100 text-center mb-4">🏢 Payee Analysis</h3>
            {/* Column headers */}
            <div className="grid grid-cols-2 border border-white/[0.07] rounded-t-lg overflow-hidden">
              <div className="text-[10px] text-gray-400 font-black uppercase tracking-wider text-center py-2 px-2 bg-gray-700/40">Payee</div>
              <div className="text-[10px] text-rose-400 font-black uppercase tracking-wider text-center py-2 px-2 bg-gray-700/40 border-l border-white/[0.07]">Amount</div>
            </div>
            {/* Rows */}
            <div className="border-l border-r border-white/[0.07] flex-1">
              {payeeExpenses.map((payee, idx) => {
                const pct = Math.max(2, (payee.amount / maxPayeeAmount) * 100);
                return (
                  <div key={idx} className={`grid grid-cols-2 border-b border-white/[0.07] hover:bg-gray-700/20 transition-colors ${idx % 2 === 0 ? 'bg-gray-800/20' : 'bg-gray-900/20'}`}>
                    <div className="py-2.5 px-3 flex items-center justify-center border-r border-white/[0.07]">
                      <span className="text-gray-200 text-xs font-semibold text-center">{payee.name || "Unknown"}</span>
                    </div>
                    <div className="py-2.5 px-3 flex flex-col items-center justify-center gap-1">
                      <span className="text-rose-300 font-black text-xs">${fmt(payee.amount)}</span>
                      <div className="h-1.5 w-full bg-gray-700/40 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-rose-600 to-pink-400 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Total */}
            <div className="grid grid-cols-2 border border-t-0 border-white/[0.07] rounded-b-lg bg-gray-700/30">
              <div className="py-2.5 px-3 flex items-center justify-center border-r border-white/[0.07]">
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Total</span>
              </div>
              <div className="py-2.5 px-3 flex items-center justify-center">
                <span className="text-rose-300 font-black text-sm">${fmt(payeeExpenses.reduce((s, p) => s + p.amount, 0))}</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
