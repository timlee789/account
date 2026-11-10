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

// ---------- 식재료 주문 ----------
export interface Vendor {
  id: number;
  name: string;
  active: boolean;
  sort_order: number;
}

export interface PurchaseItem {
  id: number;
  name: string;
  category: string;
  order_unit: string;
  pack_size: string;
  default_vendor_id: number | null;
  active: boolean;
  sort_order: number;
}

export type StaffItem = Pick<PurchaseItem, "id" | "name" | "category" | "order_unit" | "pack_size">;

export interface VendorPrice {
  item_id: number;
  vendor_id: number;
  price: number | null;
  vendor_code: string;
  note: string;
  updated_at: string;
}

export interface StaffRequest {
  item_id: number;
  qty: number;
  status: "requested" | "ordered" | "received";
}

export interface CompareLine {
  request_id: number;
  item_id: number;
  name: string;
  category: string;
  order_unit: string;
  pack_size: string;
  qty: number;
  status: "requested" | "ordered" | "received";
  assigned_vendor_id: number | null;
  suggested_vendor_id: number | null;
  vendor_id: number | null;
  unit_price: number | null;
  line_total: number | null;
  prices: { vendor_id: number; price: number | null; note: string; vendor_code: string }[];
}

export interface VendorTotal {
  vendor_id: number;
  total: number;
  lines: number;
  unpriced: number;
}

export interface CompareResponse {
  date: string;
  vendors: Vendor[];
  lines: CompareLine[];
  vendor_totals: VendorTotal[];
}
