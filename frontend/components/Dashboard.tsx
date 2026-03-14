"use client";

interface DashboardSummary {
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
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
  categoryExpenses?: { name: string; amount: number }[];
  payeeExpenses?: { name: string; amount: number }[];
  lifetimeStats?: {
    revenue: number;
    expense: number;
    netProfit: number;
  };
}

interface Props {
  summary: DashboardSummary;
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
  isLifetime?: boolean;
}

export default function Dashboard({ summary, selectedMonth, onMonthChange, isLifetime }: Props) {
  const { totalRevenue, totalExpense, netProfit, balance, salesBreakdown, categoryExpenses = [], payeeExpenses = [], lifetimeStats } = summary;

  const maxCategoryAmount = Math.max(...categoryExpenses.map(c => c.amount), 1);
  const maxPayeeAmount = Math.max(...payeeExpenses.map(p => p.amount), 1);

  return (
    <div className="mx-auto space-y-8 animate-in fade-in duration-500" style={{ paddingLeft: '400px', paddingRight: '400px' }}>
      {/* 헤더 및 월 선택기 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-gray-900/40 backdrop-blur-md rounded-2xl border border-gray-700/50 shadow-2xl">
        <div>
          <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            {isLifetime ? "Lifetime Overview" : "Financial Overview"}
          </h2>
          <p className="text-gray-400 mt-1 text-sm font-medium">
            {isLifetime ? "Performance and metrics since Jan 2026" : "Monthly performance and metrics"}
          </p>
        </div>

        {!isLifetime && selectedMonth && onMonthChange && (
          <div className="mt-4 sm:mt-0 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
            <label className="relative flex items-center gap-3 bg-gray-800/90 text-gray-100 px-5 py-3 rounded-xl border border-gray-600 focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 shadow-lg cursor-pointer transition-all hover:bg-gray-700/90">
               <span className="text-xl">📅</span>
               <input
                 type="month"
                 value={selectedMonth}
                 onChange={(e) => onMonthChange(e.target.value)}
                 className="bg-transparent font-black tracking-wider text-lg focus:outline-none cursor-pointer w-full"
                 style={{ colorScheme: "dark" }}
               />
            </label>
          </div>
        )}
      </div>

      {/* 1. 핵심 지표 (메인 4개 카드) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="relative group overflow-hidden bg-gray-900/50 backdrop-blur-sm px-8 py-10 rounded-2xl border border-emerald-900/30 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(16,185,129,0.12)] hover:-translate-y-1 text-center">
          <p className="text-emerald-500/80 text-sm font-black uppercase tracking-widest mb-3">Total Revenue</p>
          <p className="text-4xl font-black text-white flex justify-center">
            ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Total Expense */}
        <div className="relative group overflow-hidden bg-gray-900/50 backdrop-blur-sm px-8 py-10 rounded-2xl border border-rose-900/30 hover:border-rose-500/50 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(244,63,94,0.12)] hover:-translate-y-1 text-center">
          <p className="text-rose-500/80 text-sm font-black uppercase tracking-widest mb-3">Total Expense</p>
          <p className="text-4xl font-black text-rose-100 flex justify-center">
            ${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Net Profit */}
        <div className="relative group overflow-hidden bg-gradient-to-br from-indigo-900/40 to-purple-900/40 backdrop-blur-md px-8 py-10 rounded-2xl border border-indigo-700/50 hover:border-indigo-400/80 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(99,102,241,0.2)] hover:-translate-y-1 text-center">
          <p className="text-indigo-300 text-sm font-black uppercase tracking-widest mb-3 shadow-sm">Net Profit (Take Home)</p>
          <p className={`text-4xl font-black flex justify-center ${netProfit >= 0 ? 'text-white' : 'text-rose-400'}`}>
            ${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Cash on Hand */}
        <div className="relative group overflow-hidden bg-gray-900/50 backdrop-blur-sm px-8 py-10 rounded-2xl border border-amber-900/30 hover:border-amber-500/50 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(245,158,11,0.12)] hover:-translate-y-1 text-center">
          <p className="text-amber-500/80 text-sm font-black uppercase tracking-widest mb-3">Est. Cash on Hand</p>
          <p className="text-4xl font-black text-white flex justify-center">
            ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* 2. Profit & Loss Summaries */}
      <div className="bg-gray-900/40 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <span className="text-cyan-400 text-xl">⚖️</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-100">{isLifetime ? "Lifetime Revenue vs Expense" : "Monthly Revenue vs Expense"}</h3>
        </div>
        
        <div className="relative pt-2">
          <div className="flex justify-between mb-2">
            <div>
              <span className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Revenue</span>
              <p className="text-2xl font-black text-gray-100">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-rose-400 uppercase tracking-wider">Expense</span>
              <p className="text-2xl font-black text-gray-100">${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          
          {/* Combined Bar */}
          <div className="h-6 w-full bg-gray-800/80 rounded-full overflow-hidden flex border border-gray-700/30">
            <div 
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000 relative group"
              style={{ width: `${Math.max(5, (totalRevenue / (totalRevenue + totalExpense || 1)) * 100)}%` }}
            >
               <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div 
              className="h-full bg-gradient-to-l from-rose-600 to-rose-400 transition-all duration-1000 relative group"
              style={{ width: `${Math.max(5, (totalExpense / (totalRevenue + totalExpense || 1)) * 100)}%` }}
            >
               <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 세부 매출 내역 (Sales Breakdown) */}
      {salesBreakdown && (
        <div className="bg-gray-900/40 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <span className="text-indigo-400 text-xl">📊</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-100">Monthly Sales Breakdown</h3>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-700/50 bg-gray-800/30">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-gray-800 text-gray-400 uppercase text-xs font-black tracking-wider border-b border-gray-700/80">
                  <th className="px-4 py-4 text-center">Cash</th>
                  <th className="px-4 py-4 text-center">Debit</th>
                  <th className="px-4 py-4 text-center">Credit</th>
                  <th className="px-4 py-4 text-center text-indigo-400">DoorDash</th>
                  <th className="px-4 py-4 text-center text-cyan-400">Stripe</th>
                  <th className="px-4 py-4 text-center text-amber-500">CC Tips</th>
                  <th className="px-4 py-4 text-center text-emerald-500">Cash Tips</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-xl font-bold text-gray-200 bg-gray-900/20 hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-6 text-center border-r border-gray-700/30">${salesBreakdown?.cash?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-6 text-center border-r border-gray-700/30">${salesBreakdown?.debit?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-6 text-center border-r border-gray-700/30">${salesBreakdown?.credit?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-6 text-center border-r border-gray-700/30 text-indigo-300">${salesBreakdown?.doordash?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-6 text-center border-r border-gray-700/30 text-cyan-300">${salesBreakdown?.stripe?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-6 text-center border-r border-gray-700/30 text-amber-300">${salesBreakdown?.tips?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-6 text-center text-emerald-300">${salesBreakdown?.cash_tips?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Cost Analysis Charts (Categories & Payees) combined with center divider */}
      <div className="bg-gray-900/40 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50 shadow-2xl flex flex-col md:flex-row relative">
        
        {/* Category Breakdown */}
        {categoryExpenses.length > 0 && (
          <div className="flex-1 flex flex-col w-full pr-0 md:pr-8">
            <div className="flex items-center gap-3 mb-6 shrink-0 justify-center">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <span className="text-orange-400 text-xl">🏷️</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-100">Category Expense</h3>
            </div>
            <div className="space-y-5 flex-1 pb-4">
              {categoryExpenses.map((cat, idx) => {
                const percentage = Math.max(2, (cat.amount / maxCategoryAmount) * 100);
                return (
                  <div key={`cat-${idx}`} className="group relative">
                    <div className="flex justify-between items-baseline mb-1 px-2">
                      <span className="text-gray-200 font-semibold truncate pr-4 text-sm text-center flex-1">{cat.name || "Uncategorized"}</span>
                      <span className="text-orange-300 font-bold shrink-0 text-sm">${cat.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="h-3 w-full bg-gray-800/80 rounded-full overflow-hidden border border-gray-700/30">
                      <div 
                        className="h-full bg-gradient-to-r from-orange-600 to-amber-400 rounded-full transition-all duration-1000 ease-out group-hover:brightness-125"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Center Divider Line */}
        <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-gray-600 to-transparent mx-2 opacity-50"></div>

        {/* Payee Breakdown */}
        {payeeExpenses.length > 0 && (
          <div className="flex-1 flex flex-col w-full pl-0 md:pl-8 mt-8 md:mt-0">
            <div className="flex items-center gap-3 mb-6 shrink-0 justify-center">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <span className="text-rose-400 text-xl">🏢</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-100">Payee Analysis</h3>
            </div>
            <div className="space-y-5 flex-1 pb-4">
              {payeeExpenses.map((payee, idx) => {
                const percentage = Math.max(2, (payee.amount / maxPayeeAmount) * 100);
                return (
                  <div key={`payee-${idx}`} className="group relative">
                    <div className="flex justify-between items-baseline mb-1 px-2">
                      <span className="text-gray-200 font-semibold truncate pr-4 text-sm text-center flex-1">{payee.name || "Unknown"}</span>
                      <span className="text-rose-300 font-bold shrink-0 text-sm">${payee.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="h-3 w-full bg-gray-800/80 rounded-full overflow-hidden border border-gray-700/30">
                      <div 
                        className="h-full bg-gradient-to-r from-rose-600 to-pink-400 rounded-full transition-all duration-1000 ease-out group-hover:brightness-125"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}