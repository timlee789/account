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
}

interface Props {
  summary: DashboardSummary;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

export default function Dashboard({ summary, selectedMonth, onMonthChange }: Props) {
  const { totalRevenue, totalExpense, netProfit, balance, salesBreakdown } = summary;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 헤더 및 월 선택기 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-gray-900/40 backdrop-blur-md rounded-2xl border border-gray-700/50 shadow-2xl">
        <div>
          <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            Financial Overview
          </h2>
          <p className="text-gray-400 mt-1 text-sm font-medium">Monthly performance and metrics</p>
        </div>

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

      {/* 2. 세부 매출 내역 (Sales Breakdown) */}
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
                  <th className="px-8 py-6 text-center">Cash</th>
                  <th className="px-8 py-6 text-center">Debit</th>
                  <th className="px-8 py-6 text-center">Credit</th>
                  <th className="px-8 py-6 text-center text-indigo-400">DoorDash</th>
                  <th className="px-8 py-6 text-center text-cyan-400">Stripe</th>
                  <th className="px-8 py-6 text-center text-amber-500">CC Tips</th>
                  <th className="px-8 py-6 text-center text-emerald-500">Cash Tips</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-2xl font-bold text-gray-200 bg-gray-900/20 hover:bg-gray-800/50 transition-colors">
                  <td className="px-8 py-8 text-center border-r border-gray-700/30">${salesBreakdown.cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-8 py-8 text-center border-r border-gray-700/30">${salesBreakdown.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-8 py-8 text-center border-r border-gray-700/30">${salesBreakdown.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-8 py-8 text-center border-r border-gray-700/30 text-indigo-300">${salesBreakdown.doordash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-8 py-8 text-center border-r border-gray-700/30 text-cyan-300">${salesBreakdown.stripe.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-8 py-8 text-center border-r border-gray-700/30 text-amber-300">${salesBreakdown.tips.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-8 py-8 text-center text-emerald-300">${salesBreakdown.cash_tips.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}