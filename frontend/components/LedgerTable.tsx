"use client";

import SearchableSelect from "./SearchableSelect";

const CATEGORIES = [
  "Sales Deposit", "Cash Income",
  "Food Material", "Wages", "Utility", "Rent",
  "Tax", "Maintenance", "Service charges", "Insurance",
  "Advertising", "Car Gas", "Car Payment", "Home Food",
  "Home Etc", "Machine Lease", "Card Payment", "CASH OUT",
  "Don't Know", "Other"
];

const PAYEES = [
  "PFG", "US Foods", "Costco", "Walmart", "Publix",
  "Georgia Power", "Liberty Utilities", "City of Gainesville",
  "Claudia Cheves", "Teresa Vega", "Carlos", "JoeAne Ask", "Mauricio Carrasco", "Lizbeth",
  "Auto-chlor system", "Best Linen Service", "Best Supply",
  "State Tax", "Federal Tax", "R J Neese", "Corp SH Lee CPA",
  "Chase Card", "Citi Card", "Amex"
];

interface Props {
  transactions: any[];
  onUpdate: (id: number, field: string, value: string) => void;
  onAdd?: () => void;
  onDelete?: (id: number) => void;
}

export default function LedgerTable({ transactions, onUpdate, onAdd, onDelete }: Props) {
  return (
    <div className="bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-700">
      {onAdd && (
        <div className="p-4 border-b border-gray-700 bg-gray-900/30 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-200">Financial Ledger</h3>
          <button 
            onClick={onAdd}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded font-bold shadow-md transition-colors"
          >
            + Add Manual Row
          </button>
        </div>
      )}
      {/* 테이블 영역 전체에 가로 스크롤 허용 속성 강화 */}
      <div className="overflow-x-auto min-h-[600px] w-full block custom-scrollbar">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-900/50">
              <th className="px-4 py-3 border-r border-gray-600">Date</th>
              <th className="px-4 py-3 border-r border-gray-600 text-indigo-400 min-w-[220px]">Category</th>
              <th className="px-4 py-3 border-r border-gray-600 text-indigo-400 min-w-[220px]">Payee</th>
              <th className="px-4 py-3 border-r border-gray-600 min-w-[220px]">Payee 2 (Note)</th>
              <th className="px-4 py-3 border-r border-gray-600 text-right">Income</th>
              <th className="px-4 py-3 border-r border-gray-600 text-right">Expense</th>
              <th className="px-4 py-3 border-r border-gray-600 text-right text-emerald-400">Cash Income</th>
              <th className="px-4 py-3 border-r border-gray-600 text-right text-rose-400">Cash Expense</th>
              <th className="px-4 py-3 border-r border-gray-600 text-right">Balance</th>
              <th className="px-4 py-3 border-r border-gray-600 text-left">Description</th>
              <th className="px-4 py-3 text-left">Source</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-700">
            {transactions.map((t: any) => (
              <tr key={t.id} className="hover:bg-gray-700/50 transition-colors">
                {/* 1. Date */}
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 border-r border-gray-700">
                  {t.account_source === 'Manual' ? (
                    <input 
                      type="date" 
                      defaultValue={t.date} 
                      onBlur={(e) => onUpdate(t.id, 'date', e.target.value)}
                      className="bg-transparent text-gray-300 outline-none w-full"
                    />
                  ) : (
                    t.date
                  )}
                </td>

                {/* 2. Category Dropdown */}
                <td className="px-2 py-2 border-r border-gray-700 bg-gray-800/50">
                  <SearchableSelect
                    options={CATEGORIES}
                    value={t.category}
                    placeholder="Select..."
                    className="w-full"
                    onChange={(val: string) => onUpdate(t.id, 'category', val)}
                  />
                </td>

                {/* 3. Payee Dropdown */}
                <td className="px-2 py-2 border-r border-gray-700 bg-gray-800/50">
                  <SearchableSelect
                    options={PAYEES}
                    value={t.payee}
                    placeholder="Select..."
                    className="w-full"
                    onChange={(val: string) => onUpdate(t.id, 'payee', val)}
                  />
                </td>

                {/* 4. Payee 2 (Note) */}
                <td className="px-2 py-2 border-r border-gray-700 bg-gray-700/30">
                  <input
                    type="text"
                    defaultValue={t.payee_note || ""}
                    onBlur={(e) => onUpdate(t.id, 'payee_note', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    }}
                    className="w-full input-reset border-b border-gray-600 focus:border-indigo-500 text-sm py-1 text-gray-200"
                  />
                </td>

                {/* 5. Income */}
                <td className="px-4 py-3 text-sm font-bold text-emerald-400 text-right border-r border-gray-700">
                  {t.account_source === 'Manual' ? (
                    <input
                      type="text"
                      defaultValue={t.income > 0 ? t.income : ""}
                      onBlur={(e) => {
                         const val = parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0;
                         onUpdate(t.id, 'income', val.toString());
                      }}
                      className="w-full bg-transparent text-right text-emerald-400 font-bold outline-none"
                    />
                  ) : (
                    t.income > 0 ? `$${t.income.toLocaleString()}` : "-"
                  )}
                </td>

                {/* 6. Expense */}
                <td className="px-4 py-3 text-sm font-bold text-rose-400 text-right border-r border-gray-700">
                   {t.account_source === 'Manual' ? (
                    <input
                      type="text"
                      defaultValue={t.expense > 0 ? t.expense : ""}
                      onBlur={(e) => {
                         const val = parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0;
                         onUpdate(t.id, 'expense', val.toString());
                      }}
                      className="w-full bg-transparent text-right text-rose-400 font-bold outline-none"
                    />
                  ) : (
                    t.expense > 0 ? `$${t.expense.toLocaleString()}` : "-"
                  )}
                </td>

                {/* 7. Cash Income (Sales Record 연동 - 읽기 전용) */}
                <td className="px-4 py-3 text-sm font-bold text-emerald-300 text-right border-r border-gray-700 bg-emerald-900/10">
                  {t.cash_income > 0 ? `$${t.cash_income.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}
                </td>

                {/* 8. Cash Expense (직접 입력 가능 - 기존 cash_amount) */}
                <td className="px-2 py-2 border-r border-gray-700 bg-rose-900/10 min-w-[100px]">
                  <input
                    type="text"
                    inputMode="decimal"
                    defaultValue={t.cash_expense > 0 ? `$${t.cash_expense.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ""}
                    onFocus={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, "");
                      e.target.value = val === "0" ? "" : val;
                    }}
                    onBlur={(e) => {
                      const rawValue = e.target.value.replace(/[^0-9.]/g, "");
                      const numericValue = parseFloat(rawValue) || 0;
                      onUpdate(t.id, 'cash_amount', numericValue.toString());
                      e.target.value = numericValue > 0 ? `$${numericValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "";
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    className="w-full bg-transparent text-right text-rose-300 font-bold focus:outline-none"
                  />
                </td>

                {/* 8. Balance (새로 추가됨 - 밀림 방지 핵심) */}
                <td className="px-4 py-3 text-sm text-gray-100 text-right border-r border-gray-700">
                  {t.bank_balance > 0 ? `$${t.bank_balance.toLocaleString()}` : "-"}
                </td>

                {/* 9. Description */}
                <td className="px-4 py-3 text-sm text-gray-400 max-w-xs border-r border-gray-700" title={t.description}>
                  {t.account_source === 'Manual' ? (
                     <input
                      type="text"
                      defaultValue={t.description || ""}
                      onBlur={(e) => onUpdate(t.id, 'description', e.target.value)}
                      className="w-full bg-transparent text-gray-400 outline-none"
                    />
                  ) : (
                    <span className="truncate block">{t.description}</span>
                  )}
                </td>

                {/* 10. Source & Delete Action */}
                <td className="px-4 py-3 whitespace-nowrap text-sm border-r border-gray-700 flex justify-between items-center group/btn">
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-md source-badge
                    ${t.account_source === 'Manual' ? 'bg-indigo-900/40 text-indigo-300' :
                    t.account_source.includes('Truist') ? 'bg-emerald-900/40 text-emerald-300' :
                      t.account_source.includes('Chase') ? 'bg-blue-900/40 text-blue-300' :
                        'bg-gray-700 text-gray-300'}`}>
                    {t.account_source}
                  </span>
                  {t.account_source === 'Manual' && onDelete && (
                    <button 
                      onClick={() => onDelete(t.id)}
                      className="text-white font-bold text-[10px] ml-2 px-2 py-1 bg-rose-600 rounded hover:bg-rose-500 transition-all shadow-sm"
                    >
                      DEL
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}