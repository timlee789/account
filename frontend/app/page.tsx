"use client";

import { useState, useEffect } from "react";
import { api, jsonInit, errorMessage } from "@/lib/api";
import type {
  CashRecord, CreditCardRecord, DashboardSummary, InvoiceItem, ListResponse, MonthlySummaryResponse,
  Option, SalesRecord, Transaction,
} from "@/lib/types";
import Header from "@/components/Header";
import LedgerTable from "@/components/LedgerTable";
import InvoiceTable from "@/components/InvoiceTable";
import SalesTable from "@/components/SalesTable";
import Dashboard from '@/components/Dashboard';
import CreditCardTable from "@/components/CreditCardTable";
import CashTable from "@/components/CashTable";
import MonthlyPLTable from "@/components/MonthlyPLTable";
import SettingsModal from "@/components/SettingsModal";
import CashCount from "@/components/CashCount";

const EMPTY_SUMMARY: DashboardSummary = {
  totalRevenue: 0,
  totalExpense: 0,
  businessExpense: 0,
  homeExpense: 0,
  netProfitLedger: 0,
  businessProfit: 0,
  totalSales: 0,
  netProfitSales: 0,
  balance: 0,
  cardPayment: 0,
  salesBreakdown: { cash: 0, debit: 0, credit: 0, doordash: 0, stripe: 0, tips: 0, cash_tips: 0 },
};

const EMPTY_TOTALS: MonthlySummaryResponse['totals'] = {
  revenue: 0, sales: 0, totalExpense: 0, businessExpense: 0, homeExpense: 0,
  netProfitLedger: 0, netProfitSales: 0, businessProfit: 0, timLeeWage: 0, ownerTotalProfit: 0,
};

const TABS = [
  { id: 'dashboard', label: '📈 Dashboard' },
  { id: 'monthly_pl', label: '📅 Monthly P&L' },
  { id: 'ledger', label: '📑 Financial Ledger' },
  { id: 'invoice', label: '📦 Expense Detail' },
  { id: 'credit_card', label: '💳 Credit Card' },
  { id: 'cash', label: '💵 CASH' },
  { id: 'sales', label: '💰 Sales Record' },
  { id: 'cash_count', label: '🧮 Cash Count' },
] as const;

export default function Home() {
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(""); // YYYY-MM

  const [categories, setCategories] = useState<Option[]>([]);
  const [payees, setPayees] = useState<Option[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState(EMPTY_SUMMARY);
  const [lifetimeSummary, setLifetimeSummary] = useState(EMPTY_SUMMARY);
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCardRecord[]>([]);
  const [cashRecords, setCashRecords] = useState<CashRecord[]>([]);
  const [monthlyPL, setMonthlyPL] = useState<MonthlySummaryResponse>({ months: [], totals: EMPTY_TOTALS });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchOptions = async () => {
    try {
      const [cat, pay] = await Promise.all([
        api<ListResponse<Option>>('/categories'),
        api<ListResponse<Option>>('/payees'),
      ]);
      setCategories(cat.data);
      setPayees(pay.data);
    } catch (e) {
      console.error("Failed to load options", e);
    }
  };

  // Hydration mismatch 방지를 위해 클라이언트 마운트 후 날짜 설정
  useEffect(() => {
    fetchOptions();
    setSelectedMonth(new Date().toISOString().substring(0, 7));
  }, []);

  useEffect(() => {
    if (selectedMonth && activeTab !== 'cash_count') {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchData 는 activeTab/selectedMonth 를 읽는 클로저
  }, [activeTab, selectedMonth]);

  const fetchData = async () => {
    try {
      switch (activeTab) {
        case 'dashboard': {
          const [month, lifetime] = await Promise.all([
            api<DashboardSummary>(`/dashboard-summary?month=${selectedMonth}`),
            api<DashboardSummary>('/dashboard-summary'),
          ]);
          setDashboardSummary(month);
          setLifetimeSummary(lifetime);
          break;
        }
        case 'ledger': setTransactions((await api<ListResponse<Transaction>>('/transactions')).data); break;
        case 'invoice': setInvoices((await api<ListResponse<InvoiceItem>>('/invoices')).data); break;
        case 'sales': setSalesRecords(await api<SalesRecord[]>('/sales')); break;
        case 'credit_card': setCreditCards((await api<ListResponse<CreditCardRecord>>('/credit-cards')).data); break;
        case 'cash': setCashRecords((await api<ListResponse<CashRecord>>('/cash')).data); break;
        case 'monthly_pl': {
          const data = await api<MonthlySummaryResponse>('/monthly-summary');
          setMonthlyPL({ months: data.months || [], totals: data.totals || EMPTY_TOTALS });
          break;
        }
      }
      setErrorMsg(null);
    } catch (e) {
      console.error("Failed to load data:", e);
      setErrorMsg(errorMessage(e, "데이터를 불러오지 못했습니다."));
    }
  };

  // 변경 요청 공통 처리: 성공하면 목록 갱신, 실패하면 오류 표시 후 서버 상태로 되돌림(낙관적 업데이트 롤백)
  const mutate = async (action: () => Promise<unknown>, failMsg: string, refetch = true) => {
    try {
      await action();
      if (refetch) await fetchData();
      else setErrorMsg(null);
    } catch (e) {
      console.error(failMsg, e);
      setErrorMsg(errorMessage(e, failMsg));
      await fetchData();
      setErrorMsg(errorMessage(e, failMsg)); // fetchData 성공 시 지워지므로 실패 사유를 다시 표시
    }
  };

  const handleDeleteSales = (date: string) =>
    mutate(() => api(`/sales/${date}`, { method: "DELETE" }), "매출 삭제에 실패했습니다.");

  // 장부(Ledger) 업데이트 핸들러 (낙관적 업데이트)
  const handleUpdate = (id: number, field: string, value: string) => {
    setTransactions(prev => prev.map(t => (t.id === id ? { ...t, [field]: value } : t)));
    return mutate(() => api(`/transactions/${id}`, jsonInit("PUT", { [field]: value })), "저장에 실패했습니다.", false);
  };

  const handleAddTransaction = () => {
    // UTC 가 아닌 로컬 날짜 사용
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    return mutate(() => api('/transactions', jsonInit("POST", { date: localDate })), "행 추가에 실패했습니다.");
  };

  const handleDeleteTransaction = (id: number) => {
    if (!confirm("Are you sure you want to delete this row?")) return;
    return mutate(() => api(`/transactions/${id}`, { method: "DELETE" }), "삭제에 실패했습니다.");
  };

  const handleCreditCardUpdate = (id: number, field: string, value: string) => {
    setCreditCards(prev => prev.map(t => (t.id === id ? { ...t, [field]: value } : t)));
    return mutate(() => api(`/credit-cards/${id}`, jsonInit("PUT", { [field]: value })), "저장에 실패했습니다.", false);
  };

  // 수동 현금기록(Cash) 핸들러
  const handleAddCash = () =>
    mutate(() => api('/cash', { method: "POST" }), "현금 기록 추가에 실패했습니다.");

  const handleUpdateCash = (id: number, field: string, value: string | number) => {
    setCashRecords(prev => prev.map(t => (t.id === id ? { ...t, [field]: value } : t)));
    return mutate(() => api(`/cash/${id}`, jsonInit("PUT", { field, value })), "저장에 실패했습니다.", false);
  };

  const handleDeleteCash = (id: number) =>
    mutate(() => api(`/cash/${id}`, { method: "DELETE" }), "삭제에 실패했습니다.");

  // 매출(Sales) 업데이트 핸들러 (합계 계산을 위해 저장 후 서버에서 다시 가져옴)
  const handleSalesUpdate = (date: string, field: string, value: string | number) =>
    mutate(() => api('/update-sales', jsonInit("POST", { date, field, value })), "매출 저장에 실패했습니다.");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("target_tab", activeTab);

    setLoading(true);
    try {
      const result = await api<{ message: string }>('/upload', { method: "POST", body: formData });
      alert(result.message);
      await Promise.all([fetchData(), fetchOptions()]);
    } catch (error) {
      alert(error instanceof Error && error.message ? error.message : "Upload failed.");
    } finally {
      setLoading(false);
      input.value = ""; // 같은 파일을 다시 선택해도 change 이벤트가 발생하도록 초기화
    }
  };

  return (
    <main className="min-h-screen p-4 sm:p-6 bg-gray-900 w-full overflow-hidden">
      <div className="w-full mx-auto space-y-6">

        <Header onUpload={handleFileUpload} loading={loading} showUpload={activeTab !== 'cash' && activeTab !== 'cash_count'} />

        {/* 탭 네비게이션 */}
        <div className="bg-gray-800/60 rounded-2xl p-3 border border-gray-700/50 backdrop-blur-sm">
          <nav className="flex flex-wrap gap-3">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3.5 px-6 rounded-xl font-bold text-lg transition-all duration-200 whitespace-nowrap ${activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 border border-indigo-400/50'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/70 border border-transparent'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-rose-300 text-sm font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* 탭별 컨텐츠 렌더링 */}
        {/* Dashboard 탭: 별도의 요약 카드들을 보여줌 */}
        {activeTab === 'dashboard' && (
          <div className="space-y-10">
            <Dashboard
              summary={dashboardSummary}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
            />
            <div className="border-t-2 border-gray-700/50 pt-10">
              <Dashboard
                summary={lifetimeSummary}
                isLifetime={true}
              />
            </div>
          </div>
        )}

        {/* Monthly P&L 탭 */}
        {activeTab === 'monthly_pl' && (
          <MonthlyPLTable months={monthlyPL.months} totals={monthlyPL.totals} />
        )}

        {/* Ledger 탭: 기존 테이블만 표시 */}
        {activeTab === 'ledger' && (
          <LedgerTable 
            transactions={transactions} 
            categories={categories}
            payees={payees}
            onUpdate={handleUpdate} 
            onAdd={handleAddTransaction}
            onDelete={handleDeleteTransaction}
            onRefreshOptions={fetchOptions}
            onOpenSettings={() => setShowSettings(true)}
          />
        )}

        {/* Invoice 탭 */}
        {activeTab === 'invoice' && (
          <InvoiceTable invoices={invoices} />
        )}

        {/* Credit Card 탭 */}
        {activeTab === 'credit_card' && (
          <CreditCardTable transactions={creditCards} onUpdate={handleCreditCardUpdate} />
        )}

        {/* Cash 탭 */}
        {activeTab === 'cash' && (
          <CashTable
            records={cashRecords}
            onUpdate={handleUpdateCash}
            onAdd={handleAddCash}
            onDelete={handleDeleteCash}
          />
        )}

        {/* Sales 탭 */}
        {activeTab === 'sales' && (
          <SalesTable
            sales={salesRecords}
            onUpdate={handleSalesUpdate}
            onDelete={handleDeleteSales}
          />
        )}

        {/* Cash Count 탭: 저장 없이 지폐 합계만 계산 */}
        {activeTab === 'cash_count' && <CashCount />}
      </div>

      {showSettings && (
        <SettingsModal
          categories={categories}
          payees={payees}
          onClose={() => setShowSettings(false)}
          onRefreshOptions={fetchOptions}
        />
      )}
    </main>
  );
}