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

interface CashRecord {
    id: number;
    date: string;
    category: string;
    payee: string;
    income: number;
    expense: number;
    balance: number;
    description: string;
}

interface Props {
    records: CashRecord[];
    onUpdate: (id: number, field: string, value: any) => void;
    onDelete: (id: number) => void;
    onAdd: () => void;
}

export default function CashTable({ records, onUpdate, onDelete, onAdd }: Props) {
    return (
        <div className="bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-700 animate-in fade-in duration-500">
            <div className="p-4 bg-gray-900/50 flex justify-between items-center border-b border-gray-700">
                <h3 className="text-xl font-black text-emerald-400">Manual Cash Entry</h3>
                <button
                    onClick={onAdd}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg shadow transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    Add New Record
                </button>
            </div>

            <div className="overflow-x-auto min-h-[500px] custom-scrollbar">
                <table className="min-w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-900/50">
                            <th className="px-4 py-3 border-r border-gray-600 w-40">Date</th>
                            <th className="px-4 py-3 border-r border-gray-600 text-indigo-400 min-w-[220px]">Category</th>
                            <th className="px-4 py-3 border-r border-gray-600 text-indigo-400 min-w-[220px]">Payee</th>
                            <th className="px-4 py-3 border-r border-gray-600 text-right w-32">Income</th>
                            <th className="px-4 py-3 border-r border-gray-600 text-right w-32">Expense</th>
                            <th className="px-4 py-3 border-r border-gray-600 text-right text-emerald-300 w-32">Balance</th>
                            <th className="px-4 py-3 border-r border-gray-600 text-left min-w-[300px]">Description</th>
                            <th className="px-4 py-3 text-center w-20">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {records.map((r) => (
                            <tr key={r.id} className="hover:bg-gray-700/50 transition-colors">
                                {/* 1. Date */}
                                <td className="px-2 py-2 border-r border-gray-700 bg-gray-800/30">
                                    <input
                                        type="date"
                                        defaultValue={r.date}
                                        onBlur={(e) => onUpdate(r.id, 'date', e.target.value)}
                                        className="w-full bg-transparent text-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 py-1"
                                    />
                                </td>

                                {/* 2. Category Dropdown */}
                                <td className="px-2 py-2 border-r border-gray-700 bg-gray-800/50">
                                    <SearchableSelect
                                        options={CATEGORIES}
                                        value={r.category}
                                        placeholder="Select..."
                                        className="w-full"
                                        onChange={(val: string) => onUpdate(r.id, 'category', val)}
                                    />
                                </td>

                                {/* 3. Payee Dropdown */}
                                <td className="px-2 py-2 border-r border-gray-700 bg-gray-800/50">
                                    <SearchableSelect
                                        options={PAYEES}
                                        value={r.payee}
                                        placeholder="Select..."
                                        className="w-full"
                                        onChange={(val: string) => onUpdate(r.id, 'payee', val)}
                                    />
                                </td>

                                {/* 4. Income */}
                                <td className="px-2 py-2 border-r border-gray-700 bg-emerald-900/10">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        defaultValue={r.income > 0 ? r.income : ""}
                                        onFocus={(e) => {
                                            const val = e.target.value.replace(/[^0-9.]/g, "");
                                            e.target.value = val === "0" ? "" : val;
                                        }}
                                        onBlur={(e) => {
                                            const numericValue = parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0;
                                            onUpdate(r.id, 'income', numericValue);
                                            e.target.value = numericValue > 0 ? numericValue.toString() : "";
                                        }}
                                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                        className="w-full bg-transparent text-right text-emerald-400 font-bold focus:outline-none"
                                    />
                                </td>

                                {/* 5. Expense */}
                                <td className="px-2 py-2 border-r border-gray-700 bg-rose-900/10">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        defaultValue={r.expense > 0 ? r.expense : ""}
                                        onFocus={(e) => {
                                            const val = e.target.value.replace(/[^0-9.]/g, "");
                                            e.target.value = val === "0" ? "" : val;
                                        }}
                                        onBlur={(e) => {
                                            const numericValue = parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0;
                                            onUpdate(r.id, 'expense', numericValue);
                                            e.target.value = numericValue > 0 ? numericValue.toString() : "";
                                        }}
                                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                        className="w-full bg-transparent text-right text-rose-400 font-bold focus:outline-none"
                                    />
                                </td>

                                {/* 6. Balance */}
                                <td className="px-2 py-2 border-r border-gray-700 bg-gray-800/20">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        defaultValue={r.balance !== 0 ? r.balance : ""}
                                        onFocus={(e) => {
                                            const val = e.target.value.replace(/[^0-9.-]/g, "");
                                            e.target.value = val === "0" ? "" : val;
                                        }}
                                        onBlur={(e) => {
                                            const numericValue = parseFloat(e.target.value.replace(/[^0-9.-]/g, "")) || 0;
                                            onUpdate(r.id, 'balance', numericValue);
                                            e.target.value = numericValue !== 0 ? numericValue.toString() : "";
                                        }}
                                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                        className="w-full bg-transparent text-right text-emerald-200 font-bold focus:outline-none"
                                    />
                                </td>

                                {/* 7. Description */}
                                <td className="px-2 py-2 border-r border-gray-700 bg-gray-700/30">
                                    <input
                                        type="text"
                                        defaultValue={r.description || ""}
                                        onBlur={(e) => onUpdate(r.id, 'description', e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                        }}
                                        className="w-full bg-transparent border-b border-transparent focus:border-indigo-500 text-sm py-1 px-2 text-gray-200 focus:outline-none"
                                        placeholder="Enter details..."
                                    />
                                </td>

                                {/* Actions (Delete) */}
                                <td className="px-2 py-2 text-center">
                                    <button
                                        onClick={() => {
                                            if (confirm('Are you sure you want to delete this row?')) onDelete(r.id);
                                        }}
                                        className="text-gray-500 hover:text-rose-500 transition-colors p-1 rounded hover:bg-rose-500/10"
                                        title="Delete Record"
                                    >
                                        <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {records.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-gray-500 font-medium">
                                    No cash records found. Click "Add New Record" to begin tracking.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
