"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import LedgerTable from "@/components/LedgerTable";
import InvoiceTable from "@/components/InvoiceTable";
import SalesTable from "@/components/SalesTable";
import Dashboard from '@/components/Dashboard';
import CreditCardTable from "@/components/CreditCardTable";
import CashTable from "@/components/CashTable";

export default function Home() {
  // 탭 상태에 'sales' 추가
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(""); // YYYY-MM

  // Hydration mismatch 방지를 위해 클라이언트 마운트 후 날짜 설정
  useEffect(() => {
    setSelectedMonth(new Date().toISOString().substring(0, 7));
  }, []);
  const [dashboardSummary, setDashboardSummary] = useState({
    totalRevenue: 0,
    totalExpense: 0,
    netProfit: 0,
    balance: 0,
    salesBreakdown: {
      cash: 0,
      debit: 0,
      credit: 0,
      doordash: 0,
      stripe: 0,
      tips: 0,
      cash_tips: 0,
    }
  });
  const [salesRecords, setSalesRecords] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [cashRecords, setCashRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedMonth) {
      fetchData();
    }
  }, [activeTab, selectedMonth]);

  const checkAuth = (res: Response) => {
    if (res.status === 401) {
      window.location.href = '/login';
      return false;
    }
    return true;
  };

  const fetchData = async () => {
    try {
      if (activeTab === 'dashboard') {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/dashboard-summary?month=${selectedMonth}`);
        if (!checkAuth(res)) return;
        const data = await res.json();
        setDashboardSummary(data);
      } else if (activeTab === 'ledger') {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/transactions`);
        if (!checkAuth(res)) return;
        const data = await res.json();
        setTransactions(data.data);
      } else if (activeTab === 'invoice') {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/invoices`);
        if (!checkAuth(res)) return;
        const data = await res.json();
        setInvoices(data.data);
      } else if (activeTab === 'sales') {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sales`);
        if (!checkAuth(res)) return;
        const data = await res.json();
        setSalesRecords(data);
      } else if (activeTab === 'credit_card') {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/credit-cards`);
        if (!checkAuth(res)) return;
        const data = await res.json();
        setCreditCards(data.data);
      } else if (activeTab === 'cash') {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cash`);
        if (!checkAuth(res)) return;
        const data = await res.json();
        setCashRecords(data.data);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  };

  const handleDeleteSales = async (date: string) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sales/${date}`, {
        method: "DELETE",
      });
      fetchData(); // 삭제 후 목록 갱신
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  // 장부(Ledger) 업데이트 핸들러
  const handleUpdate = async (id: number, field: string, value: string) => {
    try {
      const updatedTransactions = transactions.map((t: any) =>
        t.id === id ? { ...t, [field]: value } : t
      );
      setTransactions(updatedTransactions as any);

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/transactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
    } catch (error) {
      console.error("Update failed:", error);
      fetchData();
    }
  };

  const handleCreditCardUpdate = async (id: number, field: string, value: string) => {
    try {
      const updated = creditCards.map((t: any) =>
        t.id === id ? { ...t, [field]: value } : t
      );
      setCreditCards(updated as any);

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/credit-cards/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
    } catch (error) {
      console.error("Update failed:", error);
      fetchData();
    }
  };

  // 수동 현금기록(Cash) 핸들러
  const handleAddCash = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cash`, { method: "POST" });
      if (res.ok) fetchData();
    } catch (error) {
      console.error("Add cash record failed:", error);
    }
  };

  const handleUpdateCash = async (id: number, field: string, value: any) => {
    try {
      const updated = cashRecords.map((t: any) =>
        t.id === id ? { ...t, [field]: value } : t
      );
      setCashRecords(updated as any);

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cash/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, value }),
      });
    } catch (error) {
      console.error("Update cash record failed:", error);
      fetchData();
    }
  };

  const handleDeleteCash = async (id: number) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cash/${id}`, { method: "DELETE" });
      fetchData();
    } catch (error) {
      console.error("Delete cash record failed:", error);
    }
  };

  // 매출(Sales) 업데이트 핸들러 (직접 입력용)
  const handleSalesUpdate = async (date: string, field: string, value: any) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/update-sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, field, value }),
      });
      fetchData(); // 합계(Total) 계산 등을 위해 서버에서 다시 가져옴
    } catch (error) {
      console.error("Sales update failed:", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    formData.append("target_tab", activeTab);

    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload`, {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) {
        alert(result.detail || "Upload failed");
      } else {
        alert(result.message);
        fetchData();
      }
    } catch (error) {
      alert("Upload failed.");
    } finally {
      setLoading(false);
    }
  };
  // 1. 삭제 핸들러 함수 정의
  const handleSalesDelete = async (date: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sales/${date}`, {
        method: "DELETE",
      });
      if (res.ok) {
        // 삭제 성공 시 데이터를 다시 불러와서 화면을 갱신합니다.
        fetchData();
      } else {
        alert("삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Sales delete failed:", error);
    }
  };
  return (
    <main className="min-h-screen p-6 sm:p-8 bg-gray-900">
      <div className="max-w-[1800px] mx-auto space-y-6">

        <Header onUpload={handleFileUpload} loading={loading} showUpload={activeTab !== 'cash'} />

        {/* 탭 네비게이션 */}
        <div className="bg-gray-800/60 rounded-2xl p-3 border border-gray-700/50 backdrop-blur-sm">
          <nav className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-3.5 px-6 rounded-xl font-bold text-lg transition-all duration-200 whitespace-nowrap ${activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 border border-indigo-400/50'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/70 border border-transparent'
                }`}
            >
              📈 Dashboard
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`py-3.5 px-6 rounded-xl font-bold text-lg transition-all duration-200 whitespace-nowrap ${activeTab === 'ledger'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 border border-indigo-400/50'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/70 border border-transparent'
                }`}
            >
              📑 Financial Ledger
            </button>
            <button
              onClick={() => setActiveTab('invoice')}
              className={`py-3.5 px-6 rounded-xl font-bold text-lg transition-all duration-200 whitespace-nowrap ${activeTab === 'invoice'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 border border-indigo-400/50'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/70 border border-transparent'
                }`}
            >
              📦 Expense Detail
            </button>
            <button
              onClick={() => setActiveTab('credit_card')}
              className={`py-3.5 px-6 rounded-xl font-bold text-lg transition-all duration-200 whitespace-nowrap ${activeTab === 'credit_card'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 border border-indigo-400/50'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/70 border border-transparent'
                }`}
            >
              💳 Credit Card
            </button>
            <button
              onClick={() => setActiveTab('cash')}
              className={`py-3.5 px-6 rounded-xl font-bold text-lg transition-all duration-200 whitespace-nowrap ${activeTab === 'cash'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 border border-indigo-400/50'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/70 border border-transparent'
                }`}
            >
              💵 CASH
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`py-3.5 px-6 rounded-xl font-bold text-lg transition-all duration-200 whitespace-nowrap ${activeTab === 'sales'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 border border-indigo-400/50'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/70 border border-transparent'
                }`}
            >
              💰 Sales Record
            </button>
          </nav>
        </div>

        {/* 탭별 컨텐츠 렌더링 */}
        {/* Dashboard 탭: 별도의 요약 카드들을 보여줌 */}
        {activeTab === 'dashboard' && (
          <Dashboard
            summary={dashboardSummary}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
        )}

        {/* Ledger 탭: 기존 테이블만 표시 */}
        {activeTab === 'ledger' && (
          <LedgerTable transactions={transactions} onUpdate={handleUpdate} />
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
      </div>
    </main>
  );
}