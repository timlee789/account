import React, { useState } from 'react';

interface SalesRecord {
  date: string; cash: number; debit: number; credit: number;
  svc: number; tips: number; tax: number; cash_tips: number;
  doordash: number; stripe: number; total: number; memo: string;
}

interface Props {
  sales: SalesRecord[];
  onUpdate: (date: string, field: string, value: any) => void;
  onDelete: (date: string) => void;
}

export default function SalesTable({ sales, onUpdate, onDelete }: Props) {
  const [inputDate, setInputDate] = useState(() => new Date().toISOString().split('T')[0]);
  const columns = [
    { key: 'cash', label: 'Cash', color: 'text-green-400' },
    { key: 'debit', label: 'Debit', color: 'text-blue-400' },
    { key: 'credit', label: 'Credit', color: 'text-purple-400' },
    { key: 'svc', label: 'SVC', color: 'text-orange-400' },
    { key: 'tips', label: 'Tips', color: 'text-yellow-400' },
    { key: 'tax', label: 'Tax', color: 'text-red-400' },
    { key: 'cash_tips', label: 'C-Tips', color: 'text-teal-400' },
    { key: 'doordash', label: 'Dash', color: 'text-pink-400' },
    { key: 'stripe', label: 'Stripe', color: 'text-cyan-400' },
  ];

  // 월별 합계를 포함한 새로운 리스트 생성 로직
  const sortedSales = [...sales].sort((a, b) => b.date.localeCompare(a.date));
  const rowsWithSubtotals: any[] = [];
  let currentMonth = "";
  let monthSums = { cash: 0, debit: 0, credit: 0, cash_tips: 0, doordash: 0, stripe: 0, total: 0 };

  sortedSales.forEach((s, idx) => {
    const month = s.date.substring(0, 7); // Extract YYYY-MM explicitly for grouping

    // 월이 바뀌면 이전 월의 합계 행 삽입
    if (currentMonth && month !== currentMonth) {
      rowsWithSubtotals.push({ isSubtotal: true, month: currentMonth, ...monthSums });
      // 합계 초기화
      monthSums = { cash: 0, debit: 0, credit: 0, cash_tips: 0, doordash: 0, stripe: 0, total: 0 };
    }

    currentMonth = month;
    rowsWithSubtotals.push(s);

    // 합계 누적 (수정된 6개 항목 기준)
    monthSums.cash += s.cash || 0;
    monthSums.debit += s.debit || 0;
    monthSums.credit += s.credit || 0;
    monthSums.cash_tips += s.cash_tips || 0;
    monthSums.doordash += s.doordash || 0;
    monthSums.stripe += s.stripe || 0;
    monthSums.total += s.total || 0;

    // 마지막 데이터인 경우 합계 행 추가
    if (idx === sortedSales.length - 1) {
      rowsWithSubtotals.push({ isSubtotal: true, month, ...monthSums });
    }
  });

  return (
    <div className="bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-700">
      <div className="p-4 border-b border-gray-700 bg-gray-900/30 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-bold text-gray-200">Daily Sales Record</h3>
          <input type="date" value={inputDate} onChange={(e) => setInputDate(e.target.value)}
            className="bg-gray-700 text-white px-3 py-1 rounded border border-gray-600  text-center font-bold" />
          <button onClick={() => { if (inputDate) { onUpdate(inputDate, 'cash', 0); setInputDate(""); } }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1 rounded font-bold">+ Add</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-gray-900 text-gray-400 uppercase font-bold tracking-tighter">
              <th className="px-2 py-4 border-r border-gray-700 text-left w-20">DATE</th>
              {columns.map(col => <th key={col.key} className="px-1 py-4 border-r border-gray-700 text-right">{col.label}</th>)}
              <th className="px-2 py-4 border-r border-gray-700 text-right text-white bg-indigo-900/20">TOTAL</th>
              <th className="px-2 py-4 text-left">MEMO/ACTION</th>
            </tr>
          </thead>
          <tbody>
            {rowsWithSubtotals.map((row, i) => {
              if (row.isSubtotal) {
                return (
                  <tr key={`sub-${row.month}-${i}`} className="bg-indigo-900/60 font-black text-indigo-100">
                    <td className="px-2 py-3 border-r border-gray-700 text-center">{row.month}월 합계</td>
                    <td className="px-1 py-3 border-r border-gray-700 text-right text-green-300">${row.cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-1 py-3 border-r border-gray-700 text-right text-blue-300">${row.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-1 py-3 border-r border-gray-700 text-right text-purple-300">${row.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td colSpan={3} className="border-r border-gray-700 bg-gray-900/40"></td>
                    <td className="px-1 py-3 border-r border-gray-700 text-right text-teal-300">${row.cash_tips.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-1 py-3 border-r border-gray-700 text-right text-pink-300">${row.doordash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-1 py-3 border-r border-gray-700 text-right text-cyan-300">${row.stripe.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-2 py-3 border-r border-gray-700 text-right text-white underline underline-offset-4">${row.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="bg-gray-900/40"></td>
                  </tr>
                );
              }
              return (
                <tr key={row.date} className="hover:bg-gray-700/30 group border-b border-gray-700/50">
                  <td className="px-2 py-3 font-bold text-gray-300 border-r border-gray-700 bg-gray-900/20">{row.date}</td>
                  {columns.map(col => (
                    <td key={col.key} className="px-1 py-1 border-r border-gray-700">
                      <input type="text" defaultValue={(row as any)[col.key] > 0 ? `$${Number((row as any)[col.key]).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ""}
                        className={`w-full bg-transparent text-right font-bold focus:outline-none px-1 ${col.color}`}
                        onBlur={(e) => { const n = parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0; onUpdate(row.date, col.key, n); }} />
                    </td>
                  ))}
                  <td className="px-2 py-3 text-right font-black text-white bg-indigo-900/10 border-r border-gray-700 shadow-inner">
                    ${(row.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-2 py-1 flex justify-between items-center group">
                    <input type="text" defaultValue={row.memo} onBlur={(e) => onUpdate(row.date, 'memo', e.target.value)}
                      className="flex-1 bg-transparent text-gray-500 italic text-[10px] outline-none" />
                    <button onClick={() => onDelete(row.date)} className="opacity-0 group-hover:opacity-100 text-rose-500 font-bold text-[9px] ml-1">DEL</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}