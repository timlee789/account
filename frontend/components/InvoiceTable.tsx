"use client";

// [수정] Props 정의 추가
interface Props {
  invoices: any[];
}

export default function InvoiceTable({ invoices }: Props) {
  return (
    <div className="bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-700">
      <div className="overflow-x-auto min-h-[600px] custom-scrollbar">
        <table className="min-w-full border-collapse">
          <thead className="sticky-header">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-300 uppercase tracking-wider border-r border-gray-600">Date</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-300 uppercase tracking-wider border-r border-gray-600">Vendor</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-300 uppercase tracking-wider border-r border-gray-600">Product</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-300 uppercase tracking-wider border-r border-gray-600">Qty</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-300 uppercase tracking-wider border-r border-gray-600">Unit Price</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-300 uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {invoices.map((item: any) => (
              <tr key={item.id} className="hover:bg-gray-700/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 border-r border-gray-700">{item.date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-400 border-r border-gray-700">{item.vendor}</td>
                <td className="px-6 py-4 text-sm text-gray-200 font-medium border-r border-gray-700">
                  {item.product_name}
                  <span className="block text-xs text-gray-500 font-normal">Code: {item.product_code}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 border-r border-gray-700">{item.quantity} {item.unit}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 text-right border-r border-gray-700">${item.unit_price.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-400 text-right">${item.total_price.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}