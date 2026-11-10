// 백엔드 응답 도메인 타입.
// 주의: 백엔드가 NULL 을 빈 문자열("")로 내려주는 경우가 있어 숫자 필드가 드물게 "" 일 수 있다.
// 화면에서는 `Number(x) || 0` 또는 `parseFloat` 로 다룬다.

export interface Option {
  id: number;
  name: string;
}

export interface ListResponse<T> {
  count?: number;
  data: T[];
}

/** transactions / credit_card_records 공통 컬럼 */
export interface LedgerRecord {
  id: number;
  date: string;
  type: string;
  category: string;
  payee: string;
  payee_note: string;
  cash_amount: number;
  description: string;
  income: number;
  expense: number;
  net_amount: number;
  bank_balance: number;
  account_source: string;
}

export interface Transaction extends LedgerRecord {
  /** GET /transactions 에서 계산되어 붙는 값 */
  cash_income: number;
  cash_expense: number;
}

export type CreditCardRecord = LedgerRecord;

export interface CashRecord {
  id: number;
  date: string;
  category: string;
  payee: string;
  income: number;
  expense: number;
  balance: number;
  description: string;
}

export interface SalesRecord {
  date: string;
  cash: number;
  debit: number;
  credit: number;
  svc: number;
  tips: number;
  tax: number;
  cash_tips: number;
  doordash: number;
  stripe: number;
  total: number;
  deposit?: number;
  memo: string;
}

export interface InvoiceItem {
  id: number;
  date: string;
  vendor: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
}

export interface SalesBreakdown {
  cash: number;
  debit: number;
  credit: number;
  doordash: number;
  stripe: number;
  tips: number;
  cash_tips: number;
}

export interface DashboardSummary {
  totalRevenue: number;
  totalExpense: number;
  businessExpense?: number;
  homeExpense?: number;
  netProfitLedger: number;
  businessProfit?: number;
  totalSales?: number;
  netProfitSales?: number;
  balance: number;
  cardPayment?: number;
  salesBreakdown?: SalesBreakdown;
  categoryExpenses?: { name: string; amount: number; budget?: number }[];
  payeeExpenses?: { name: string; amount: number }[];
}

export interface MonthlyRow {
  month: string;
  revenue: number;
  sales: number;
  totalExpense: number;
  businessExpense: number;
  homeExpense: number;
  netProfitLedger: number;
  netProfitSales: number;
  businessProfit: number;
  timLeeWage: number;
  ownerTotalProfit: number;
}

export type MonthlyTotals = Omit<MonthlyRow, "month">;

export interface MonthlySummaryResponse {
  months: MonthlyRow[];
  totals: MonthlyTotals;
}
