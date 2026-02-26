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
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="relative bg-gray-800/90 text-gray-100 px-5 py-2.5 rounded-xl border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 font-bold tracking-wide shadow-lg cursor-pointer transition-all hover:bg-gray-700/90"
          />
        </div>
      </div>

      {/* 1. 핵심 지표 (메인 4개 카드) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="relative group overflow-hidden bg-gray-900/50 backdrop-blur-sm p-6 rounded-2xl border border-emerald-900/30 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(16,185,129,0.12)] hover:-translate-y-1">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <svg className="w-16 h-16 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
            {/* Placeholder icon, consider heroicons if available */}
          </div>
          <p className="text-emerald-500/80 text-xs font-black uppercase tracking-widest mb-1">Total Revenue</p>
          <p className="text-3xl font-black text-white">
            ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Total Expense */}
        <div className="relative group overflow-hidden bg-gray-900/50 backdrop-blur-sm p-6 rounded-2xl border border-rose-900/30 hover:border-rose-500/50 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(244,63,94,0.12)] hover:-translate-y-1">
          <p className="text-rose-500/80 text-xs font-black uppercase tracking-widest mb-1">Total Expense</p>
          <p className="text-3xl font-black text-white">
            ${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Net Profit */}
        <div className="relative group overflow-hidden bg-gradient-to-br from-indigo-900/40 to-purple-900/40 backdrop-blur-md p-6 rounded-2xl border border-indigo-700/50 hover:border-indigo-400/80 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(99,102,241,0.2)] hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <p className="text-indigo-300 text-xs font-black uppercase tracking-widest mb-1 shadow-sm">Net Profit (Take Home)</p>
          <p className={`text-3xl font-black ${netProfit >= 0 ? 'text-white' : 'text-rose-400'}`}>
            ${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Cash on Hand */}
        <div className="relative group overflow-hidden bg-gray-900/50 backdrop-blur-sm p-6 rounded-2xl border border-amber-900/30 hover:border-amber-500/50 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(245,158,11,0.12)] hover:-translate-y-1">
          <p className="text-amber-500/80 text-xs font-black uppercase tracking-widest mb-1">Est. Cash on Hand</p>
          <p className="text-3xl font-black text-white">
            ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* 2. 세부 매출 내역 (Sales Breakdown) */}
      {salesBreakdown && (
        <div className="bg-gray-900/40 backdrop-blur-xl rounded-2xl p-6 sm:p-8 border border-gray-700/50 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <span className="text-indigo-400 text-lg">📊</span>
            </div>
            <h3 className="text-xl font-bold text-gray-100">Monthly Sales Breakdown</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">

            <div className="bg-gray-800/60 p-5 rounded-xl border border-gray-700/50 hover:bg-gray-800 transition-colors">
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">Cash</p>
              <p className="text-xl font-bold text-gray-200">${salesBreakdown.cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="bg-gray-800/60 p-5 rounded-xl border border-gray-700/50 hover:bg-gray-800 transition-colors">
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">Debit</p>
              <p className="text-xl font-bold text-gray-200">${salesBreakdown.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="bg-gray-800/60 p-5 rounded-xl border border-gray-700/50 hover:bg-gray-800 transition-colors">
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">Credit</p>
              <p className="text-xl font-bold text-gray-200">${salesBreakdown.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="bg-indigo-900/20 p-5 rounded-xl border border-indigo-500/20 hover:bg-indigo-900/30 transition-colors">
              <p className="text-indigo-400/70 text-[10px] font-black uppercase tracking-widest mb-2">DoorDash</p>
              <p className="text-xl font-bold text-indigo-300">${salesBreakdown.doordash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="bg-indigo-900/20 p-5 rounded-xl border border-indigo-500/20 hover:bg-indigo-900/30 transition-colors">
              <p className="text-cyan-400/70 text-[10px] font-black uppercase tracking-widest mb-2">Stripe</p>
              <p className="text-xl font-bold text-cyan-300">${salesBreakdown.stripe.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="bg-amber-900/10 p-5 rounded-xl border border-amber-500/20 hover:bg-amber-900/20 transition-colors">
              <p className="text-amber-500/70 text-[10px] font-black uppercase tracking-widest mb-2">CC Tips</p>
              <p className="text-xl font-bold text-amber-300">${salesBreakdown.tips.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="bg-amber-900/10 p-5 rounded-xl border border-amber-500/20 hover:bg-amber-900/20 transition-colors">
              <p className="text-emerald-500/70 text-[10px] font-black uppercase tracking-widest mb-2">Cash Tips</p>
              <p className="text-xl font-bold text-emerald-300">${salesBreakdown.cash_tips.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}