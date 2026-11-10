import pandas as pd
import psycopg2
import io
import re
import sys
import os
from datetime import datetime
from dotenv import load_dotenv
from typing import Any
import warnings
from decimal import Decimal

# Suppress pandas SQLAlchemy warning for raw psycopg2 connections
warnings.filterwarnings('ignore', category=UserWarning, module='pandas')

load_dotenv()

class ExpenseEngine:
    # update_sales_record 에서 허용하는 컬럼 (SQL 인젝션 방지용 화이트리스트)
    SALES_EDITABLE_FIELDS = frozenset({
        'cash', 'debit', 'credit', 'svc', 'tips', 'tax', 'cash_tips',
        'doordash', 'stripe', 'deposit', 'memo',
    })

    def __init__(self):
        self.db_url = os.environ.get("DATABASE_URL")
        # Ensure correct prefix for SQLAlchemy/psycopg2
        if self.db_url and self.db_url.startswith("postgres://"):
            self.db_url = self.db_url.replace("postgres://", "postgresql://", 1)
            
        self.create_tables()

    def normalize_date(self, d_str: str) -> str:
        if not d_str:
            return ""
        try:
            d_str = str(d_str).strip()
            # If already YYYY-MM-DD, return right away
            if re.match(r'^\d{4}-\d{2}-\d{2}$', d_str):
                return d_str
            # Let pandas parse various formats and convert to ISO format
            parsed = pd.to_datetime(d_str)
            return parsed.strftime('%Y-%m-%d')
        except:
            return str(d_str)

    def get_conn(self):
        return psycopg2.connect(self.db_url)

    def create_tables(self):
        conn = self.get_conn()
        cursor = conn.cursor()
        
        # 1. Transactions Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                date TEXT,
                type TEXT,
                category TEXT,
                payee TEXT,
                payee_note TEXT, 
                cash_amount NUMERIC(14,2),
                description TEXT,
                income NUMERIC(14,2),
                expense NUMERIC(14,2),
                net_amount NUMERIC(14,2),
                bank_balance NUMERIC(14,2),
                account_source TEXT,
                is_duplicate_check TEXT UNIQUE
            )
        ''')

        # 2. Invoice Items Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS invoice_items (
                id SERIAL PRIMARY KEY,
                date TEXT,
                vendor TEXT,
                product_code TEXT,
                product_name TEXT,
                quantity NUMERIC(14,3),
                unit TEXT,
                unit_price NUMERIC(14,4),
                total_price NUMERIC(14,2),
                is_duplicate_check TEXT UNIQUE
            )
        ''')

        # 3. Sales Records Table (매일의 매출 기록용)
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS sales_records (
            id SERIAL PRIMARY KEY,
            date TEXT UNIQUE,
            cash NUMERIC(14,2) DEFAULT 0,
            debit NUMERIC(14,2) DEFAULT 0,
            credit NUMERIC(14,2) DEFAULT 0,
            svc NUMERIC(14,2) DEFAULT 0,
            tips NUMERIC(14,2) DEFAULT 0,
            tax NUMERIC(14,2) DEFAULT 0,
            cash_tips NUMERIC(14,2) DEFAULT 0,
            doordash NUMERIC(14,2) DEFAULT 0,
            stripe NUMERIC(14,2) DEFAULT 0,
            total NUMERIC(14,2) DEFAULT 0,
            deposit NUMERIC(14,2) DEFAULT 0,
            memo TEXT
        )
    ''')
        
        # 4. Credit Card Records Table (신용카드 전용)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS credit_card_records (
                id SERIAL PRIMARY KEY,
                date TEXT,
                type TEXT,
                category TEXT,
                payee TEXT,
                payee_note TEXT, 
                cash_amount NUMERIC(14,2),
                description TEXT,
                income NUMERIC(14,2),
                expense NUMERIC(14,2),
                net_amount NUMERIC(14,2),
                bank_balance NUMERIC(14,2),
                account_source TEXT,
                is_duplicate_check TEXT UNIQUE
            )
        ''')
        
        # 5. Cash Records Table (수동 수입/지출 입력용)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cash_records (
                id SERIAL PRIMARY KEY,
                date TEXT,
                category TEXT,
                payee TEXT,
                income NUMERIC(14,2) DEFAULT 0,
                expense NUMERIC(14,2) DEFAULT 0,
                balance NUMERIC(14,2) DEFAULT 0,
                description TEXT
            )
        ''')
        # 6. Categories Table (동적 분류 관리용)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS categories (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL
            )
        ''')
        
        # 7. Payees Table (동적 지급처 관리용)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS payees (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL
            )
        ''')
        
        # 8. Category Budgets Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS category_budgets (
                id SERIAL PRIMARY KEY,
                month TEXT NOT NULL,
                category TEXT NOT NULL,
                amount NUMERIC(14,2) NOT NULL DEFAULT 0,
                UNIQUE(month, category)
            )
        ''')
        
        # Add deposit column if missing
        try:
            cursor.execute("ALTER TABLE sales_records ADD COLUMN IF NOT EXISTS deposit NUMERIC(14,2) DEFAULT 0")
        except Exception as e:
            conn.rollback()

        conn.commit()
        
        # --- Seed Initial Data if empty ---
        cursor.execute("SELECT COUNT(*) FROM categories")
        if cursor.fetchone()[0] == 0:
            initial_categories = [
                "Sales Deposit", "Cash Income", "Food Material", "Wages", "Utility", "Rent",
                "Tax", "Maintenance", "Service charges", "Insurance", "Advertising", 
                "Car Gas", "Car Payment", "Home Food", "Home Etc", "Machine Lease", 
                "Card Payment", "CASH OUT", "Don't Know", "Other"
            ]
            for cat in initial_categories:
                cursor.execute("INSERT INTO categories (name) VALUES (%s) ON CONFLICT DO NOTHING", (cat,))
                
        cursor.execute("SELECT COUNT(*) FROM payees")
        if cursor.fetchone()[0] == 0:
            initial_payees = [
                "PFG", "US Foods", "Costco", "Walmart", "Publix", "Georgia Power", 
                "Liberty Utilities", "City of Gainesville", "Claudia Cheves", "Teresa Vega", 
                "Carlos", "JoeAne Ask", "Mauricio Carrasco", "Lizbeth", "Auto-chlor system", 
                "Best Linen Service", "Best Supply", "State Tax", "Federal Tax", 
                "R J Neese", "Corp SH Lee CPA", "Chase Card", "Citi Card", "Amex"
            ]
            for payee in initial_payees:
                cursor.execute("INSERT INTO payees (name) VALUES (%s) ON CONFLICT DO NOTHING", (payee,))
                
        conn.commit()
        cursor.close()
        conn.close()
        self.ensure_cash_sales_rows()

    def _query_df(self, sql, params=None):
        """SELECT 결과를 DataFrame 으로 반환. DB 오류는 호출자에게 전파한다(빈 데이터로 둔갑 방지)."""
        conn = self.get_conn()
        try:
            df = pd.read_sql(sql, conn, params=params)
        finally:
            conn.close()
        # NUMERIC 컬럼은 Decimal 로 읽히므로 기존 코드(float 연산, JSON 직렬화)와 맞추기 위해 float 로 변환
        for col in df.columns:
            if df[col].dtype == object and df[col].map(lambda v: isinstance(v, Decimal)).any():
                df[col] = df[col].map(lambda v: float(v) if isinstance(v, Decimal) else v)
        return df

    # --- Dynamic Options (Categories & Payees) ---
    def get_categories(self):
        df = self._query_df("SELECT * FROM categories ORDER BY name ASC")
        return df.to_dict(orient='records')

    def add_category(self, name):
        conn = self.get_conn()
        cursor = conn.cursor()
        try:
            cursor.execute("INSERT INTO categories (name) VALUES (%s) ON CONFLICT DO NOTHING RETURNING id", (name,))
            added = cursor.fetchone()
            conn.commit()
            return {"status": "success", "id": added[0] if added else None}
        except Exception as e:
            conn.rollback()
            return {"status": "error", "message": str(e)}
        finally:
            cursor.close()
            conn.close()

    def delete_category(self, category_id):
        conn = self.get_conn()
        cursor = conn.cursor()
        try:
            cursor.execute("DELETE FROM categories WHERE id = %s", (category_id,))
            conn.commit()
            return True
        except Exception as e:
            print(f"Error deleting category: {e}")
            return False
        finally:
            cursor.close()
            conn.close()

    def get_payees(self):
        df = self._query_df("SELECT * FROM payees ORDER BY name ASC")
        return df.to_dict(orient='records')

    def add_payee(self, name):
        conn = self.get_conn()
        cursor = conn.cursor()
        try:
            cursor.execute("INSERT INTO payees (name) VALUES (%s) ON CONFLICT DO NOTHING RETURNING id", (name,))
            added = cursor.fetchone()
            conn.commit()
            return {"status": "success", "id": added[0] if added else None}
        except Exception as e:
            conn.rollback()
            return {"status": "error", "message": str(e)}
        finally:
            cursor.close()
            conn.close()

    def delete_payee(self, payee_id):
        conn = self.get_conn()
        cursor = conn.cursor()
        try:
            cursor.execute("DELETE FROM payees WHERE id = %s", (payee_id,))
            conn.commit()
            return True
        except Exception as e:
            print(f"Error deleting payee: {e}")
            return False
        finally:
            cursor.close()
            conn.close()


    # --- Sales Record Logic (신규 추가) ---
    def get_sales_records(self):
        """저장된 매출 기록을 날짜 역순으로 가져옵니다."""
        df = self._query_df("SELECT * FROM sales_records ORDER BY date DESC").fillna("")
        return df.to_dict(orient='records')

    def ensure_cash_sales_rows(self):
        """매출 기록에 현금(Cash + Cash Tips)이 있는 날짜마다 System 'Cash Sales' 원장 행을 보장한다.
        한 번의 INSERT ... SELECT 로 처리하고, 고정 키(system_cash_<date>)와 UNIQUE 제약으로 동시 실행돼도 중복되지 않는다."""
        conn = self.get_conn()
        cursor = conn.cursor()
        try:
            cursor.execute('''
                INSERT INTO transactions (
                    date, type, category, payee, payee_note,
                    cash_amount, description, income, expense,
                    net_amount, bank_balance, account_source, is_duplicate_check
                )
                SELECT s.date, 'Cash Sales', '', '', '', 0, 'Daily Cash Income Record', 0, 0, 0, 0,
                       'System', 'system_cash_' || s.date
                FROM sales_records s
                WHERE COALESCE(s.cash, 0) + COALESCE(s.cash_tips, 0) > 0
                  AND s.date IS NOT NULL AND s.date <> ''
                  AND NOT EXISTS (
                      SELECT 1 FROM transactions t
                      WHERE t.type = 'Cash Sales' AND t.account_source = 'System' AND t.date = s.date
                  )
                ON CONFLICT (is_duplicate_check) DO NOTHING
            ''')
            conn.commit()
        except Exception as e:
            conn.rollback()
            print(f"ensure_cash_sales_rows failed: {e}")
        finally:
            cursor.close()
            conn.close()

    def update_sales_record(self, date, field, value):
        """특정 날짜의 매출 데이터를 업데이트하고 Total을 자동 계산합니다."""
        if field not in self.SALES_EDITABLE_FIELDS:
            print(f"Rejected sales field: {field!r}")
            return False
        date = self.normalize_date(date)
        conn = self.get_conn()
        cursor = conn.cursor()
        try:
            # 먼저 해당 날짜 데이터가 있는지 확인하고 없으면 생성(UPSERT)
            cursor.execute(f'''
                INSERT INTO sales_records (date, {field}) 
                VALUES (%s, %s) 
                ON CONFLICT(date) DO UPDATE SET {field} = EXCLUDED.{field}
            ''', (date, value))    
            
            # 해당 날짜의 전체 합계(Total)를 다시 계산하여 업데이트
            cursor.execute('''
            UPDATE sales_records SET total = 
                COALESCE(cash, 0) + COALESCE(debit, 0) + COALESCE(credit, 0) + 
                COALESCE(cash_tips, 0) + COALESCE(doordash, 0)
            WHERE date = %s
        ''', (date,))
            
            conn.commit()
            success = True
        except Exception as e:
            print(f"Update Sales Error: {e}")
            success = False
        finally:
            cursor.close()
            conn.close()
        if success and field in ('cash', 'cash_tips'):
            self.ensure_cash_sales_rows()
        return success
            
    # [신규] 삭제 기능 추가
    def delete_sales_record(self, date):
            conn = self.get_conn()
            cursor = conn.cursor()
            try:
                cursor.execute("DELETE FROM sales_records WHERE date = %s", (date,))
                conn.commit()
                return True
            except Exception as e:
                print(f"Delete Error: {e}")
                return False
            finally:
                cursor.close()
                conn.close()
    # --- 기존 코드 유지 ---
    def clean_currency(self, value):
        if pd.isna(value) or str(value).strip() == '': return 0.0
        str_val = str(value).replace('$', '').replace(',', '').replace(' ', '')
        if '(' in str_val:
            str_val = '-' + str_val.replace('(', '').replace(')', '')
        try:
            return float(str_val)
        except:
            return 0.0

    def process_csv(self, file_content: bytes, filename: str, target_tab: str | None = None):
        try:
            decoded_content = file_content.decode('utf-8', errors='ignore')
            df = pd.read_csv(io.StringIO(decoded_content))
            df.columns = [c.strip() for c in df.columns]
            cols = df.columns.tolist()

            if "ProductDescription" in cols and "ExtendedPrice" in cols:
                if target_tab and target_tab != 'invoice':
                    return {"status": "error", "message": "Please upload this US Foods invoice on the Expense Detail tab."}
                return self._parse_usfoods(df, filename)
            elif "Posted Date" in cols and "Full description" in cols:
                if target_tab and target_tab != 'ledger':
                    return {"status": "error", "message": "Please upload this Bank CSV on the Financial Ledger tab."}
                self._parse_truist(df)
                return {"status": "success", "message": "Truist Bank Processed to Financial Ledger"}
            elif "Card" in cols or ("Transaction Date" in cols and "Post Date" in cols):
                if target_tab and target_tab != 'credit_card':
                    return {"status": "error", "message": "Please upload this Credit Card CSV on the Credit Card tab."}
                self._parse_chase(df)
                return {"status": "success", "message": "Chase Card Processed to Credit Card Ledger"}
            elif "Status" in cols and "Debit" in cols and "Credit" in cols:
                if target_tab and target_tab != 'credit_card':
                    return {"status": "error", "message": "Please upload this Credit Card CSV on the Credit Card tab."}
                self._parse_citi(df)
                return {"status": "success", "message": "Citi Card Processed to Credit Card Ledger"}
            else:
                return {"status": "error", "message": f"Unknown format: {filename}"}

        except Exception as e:
            print(f"Error: {e}")
            return {"status": "error", "message": str(e)}

    @staticmethod
    def _dedupe_key(base_key, seen):
        """같은 업로드 파일 안에서 키가 같은 정상 거래(같은 날 같은 금액 2건 등)를 구분한다.
        첫 번째 행은 기존 키 그대로라 같은 파일을 다시 올려도 중복 저장되지 않는다."""
        if seen is None:
            return base_key
        n = seen.get(base_key, 0)
        seen[base_key] = n + 1
        return base_key if n == 0 else f"{base_key}#{n}"

    def _save_row(self, entry, table_name="transactions", seen=None):
        conn = self.get_conn()
        norm_date = self.normalize_date(entry['date'])
        
        dup_key = self._dedupe_key(
            f"{norm_date}_{entry['desc']}_{entry['income']}_{entry['expense']}", seen)
        if entry.get('source') == 'System':
            dup_key = f"system_cash_{norm_date}_{datetime.now().timestamp()}"
            
        cursor = conn.cursor()
        try:
            cursor.execute(f'''
                INSERT INTO {table_name} (
                    date, type, category, payee, payee_note, 
                    cash_amount, description, income, expense, 
                    net_amount, bank_balance, account_source, is_duplicate_check
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                norm_date, 
                entry['type'], 
                "",      
                "",      
                "",      
                0.0,     
                entry['desc'],    
                entry['income'], 
                entry['expense'], 
                entry['income'] - entry['expense'], 
                entry['balance'], 
                entry['source'],  
                dup_key
            ))
            conn.commit()
        except psycopg2.IntegrityError:
            conn.rollback() 
        finally:
            cursor.close()
            conn.close()

    # --- Manual Financial Ledger Logic (신규) ---
    def add_transaction(self, record: dict):
        conn = self.get_conn()
        cursor = conn.cursor()
        norm_date = self.normalize_date(record.get('date', datetime.now().strftime('%Y-%m-%d')))
        try:
            cursor.execute('''
                INSERT INTO transactions (
                    date, type, category, payee, payee_note, 
                    cash_amount, description, income, expense, 
                    net_amount, bank_balance, account_source, is_duplicate_check
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            ''', (
                norm_date,
                record.get('type', 'Manual Entry'),
                record.get('category', ''),
                record.get('payee', ''),
                record.get('payee_note', ''),
                0.0,
                record.get('description', 'Manual Ledger Entry'),
                0.0,
                0.0,
                0.0,
                0.0,
                'Manual',
                f"manual_{datetime.now().timestamp()}" # unique dummy key
            ))
            new_id = cursor.fetchone()[0]
            conn.commit()
            return True, new_id
        except Exception as e:
            print(f"Failed to add manual transaction: {e}")
            return False, str(e)
        finally:
            cursor.close()
            conn.close()

    # 테이블별로 수정 가능한 컬럼 (SQL 인젝션 방지 + 의도하지 않은 컬럼 수정 방지)
    UPDATABLE_FIELDS = {
        "transactions": ("date", "category", "payee", "payee_note", "cash_amount",
                         "income", "expense", "description"),
        "credit_card_records": ("category", "payee", "payee_note", "cash_amount"),
    }

    def update_record(self, table: str, record_id: int, fields: dict) -> bool:
        """허용된 컬럼만 골라 한 번의 UPDATE 로 수정한다. 수정할 값이 없으면 성공으로 간주."""
        allowed = self.UPDATABLE_FIELDS.get(table)
        if allowed is None:
            return False
        fields = {k: v for k, v in fields.items() if k in allowed and v is not None}
        if not fields:
            return True
        set_clause = ", ".join(f"{k} = %s" for k in fields)
        conn = self.get_conn()
        cursor = conn.cursor()
        try:
            cursor.execute(f"UPDATE {table} SET {set_clause} WHERE id = %s",
                           (*fields.values(), record_id))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            print(f"Failed to update {table}: {e}")
            return False
        finally:
            cursor.close()
            conn.close()

    def delete_transaction(self, tx_id: int):
        conn = self.get_conn()
        cursor = conn.cursor()
        try:
            cursor.execute("DELETE FROM transactions WHERE id = %s", (tx_id,))
            conn.commit()
            return True
        except Exception as e:
            print(f"Failed to delete transaction: {e}")
            return False
        finally:
            cursor.close()
            conn.close()

    def get_all_transactions(self):
        df = self._query_df("SELECT * FROM transactions ORDER BY date DESC, id DESC").fillna("")
        return df.to_dict(orient='records')

    def get_all_invoices(self):
        df = self._query_df("SELECT * FROM invoice_items ORDER BY date DESC").fillna("")
        return df.to_dict(orient='records')

    @staticmethod
    def _invoice_date_from_filename(filename):
        """파일명에서 날짜 추출. YYYY-MM-DD, MM-DD-YYYY, MM-DD 지원.
        연도가 없으면 올해로 하되, 오늘보다 미래(예: 1월에 12월 파일 업로드)면 작년으로 본다."""
        today = datetime.now().date()
        name = os.path.basename(filename or "")
        try:
            m = re.search(r'(\d{4})-(\d{1,2})-(\d{1,2})', name)
            if m:
                return datetime(int(m.group(1)), int(m.group(2)), int(m.group(3))).strftime('%Y-%m-%d')
            m = re.search(r'(\d{1,2})-(\d{1,2})-(\d{4})', name)
            if m:
                return datetime(int(m.group(3)), int(m.group(1)), int(m.group(2))).strftime('%Y-%m-%d')
            m = re.search(r'(\d{1,2})-(\d{1,2})', name)
            if m:
                d = datetime(today.year, int(m.group(1)), int(m.group(2))).date()
                if d > today:
                    d = datetime(today.year - 1, d.month, d.day).date()
                return d.strftime('%Y-%m-%d')
        except ValueError:
            pass  # 달력에 없는 날짜 → 오늘 날짜로 대체
        return today.strftime('%Y-%m-%d')

    def _parse_usfoods(self, df, filename):
        date_str = self._invoice_date_from_filename(filename)
        vendor = 'Sysco' if 'sysco' in (filename or '').lower() else 'US Foods'
        count = 0
        seen = {}
        for _, row in df.iterrows():
            if pd.isna(row.get('ProductDescription', '')): continue
            entry = {
                'date': date_str,
                'vendor': vendor,
                'p_code': str(row.get('ProductNumber', '')),
                'p_name': row.get('ProductDescription', ''),
                'qty': float(row['QtyShip']) if pd.notnull(row.get('QtyShip')) else 0,
                'unit': row.get('PricingUnit', ''),
                'u_price': float(row['UnitPrice']) if pd.notnull(row.get('UnitPrice')) else 0,
                't_price': float(row['ExtendedPrice']) if pd.notnull(row.get('ExtendedPrice')) else 0,
            }
            if self._save_invoice_item(entry, seen): count += 1
        return {"status": "success", "message": f"{vendor}: {count} items saved"}

    def _save_invoice_item(self, entry, seen=None):
        dup_key = self._dedupe_key(f"{entry['date']}_{entry['p_code']}_{entry['t_price']}", seen)
        conn = self.get_conn()
        cursor = conn.cursor()
        try:
            cursor.execute('''
                INSERT INTO invoice_items (date, vendor, product_code, product_name, quantity, unit, unit_price, total_price, is_duplicate_check)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                entry['date'], entry['vendor'], entry['p_code'], entry['p_name'],
                entry['qty'], entry['unit'], entry['u_price'], entry['t_price'], dup_key
            ))
            conn.commit()
            return True
        except psycopg2.IntegrityError: 
            return False
        finally:
            cursor.close()
            conn.close()

    def _parse_truist(self, df):
        seen = {}
        for _, row in df.iterrows():
            amt = self.clean_currency(row['Amount'])
            entry = {
                'date': pd.to_datetime(row['Transaction Date']).strftime('%Y-%m-%d'),
                'type': row.get('Transaction Type', ''),
                'desc': row.get('Full description', ''),
                'income': amt if amt > 0 else 0,
                'expense': abs(amt) if amt < 0 else 0,
                'balance': self.clean_currency(row.get('Daily Posted Balance', 0)),
                'source': 'Main Bank (Truist)'
            }
            self._save_row(entry, table_name="transactions", seen=seen)

    def _parse_chase(self, df):
        seen = {}
        for _, row in df.iterrows():
            amt = float(row['Amount']) if pd.notnull(row.get('Amount')) else 0.0
            entry = {
                'date': pd.to_datetime(row['Transaction Date']).strftime('%Y-%m-%d'),
                'type': row.get('Type', ''),
                'desc': row.get('Description', ''),
                'income': amt if amt > 0 else 0,
                'expense': abs(amt) if amt < 0 else 0,
                'balance': 0.0,
                'source': 'Chase CC'
            }
            self._save_row(entry, table_name="credit_card_records", seen=seen)

    def _parse_citi(self, df):
        seen = {}
        for _, row in df.iterrows():
            debit = self.clean_currency(row.get('Debit', 0))
            credit = self.clean_currency(row.get('Credit', 0))
            entry = {
                'date': pd.to_datetime(row['Date']).strftime('%Y-%m-%d'),
                'type': 'Credit Card',
                'desc': row.get('Description', ''),
                'income': credit,
                'expense': debit,
                'balance': 0.0,
                'source': 'Citi CC'
            }
            self._save_row(entry, table_name="credit_card_records", seen=seen)

    def get_all_credit_cards(self):
        df = self._query_df("SELECT * FROM credit_card_records ORDER BY date DESC").fillna("")
        return df.to_dict(orient='records')

    # --- Cash Records Logic ---
    def get_all_cash_records(self):
        df = self._query_df("SELECT * FROM cash_records ORDER BY date DESC, id DESC").fillna("")
        return df.to_dict(orient='records')

    def add_cash_record(self, record: dict):
        conn = self.get_conn()
        cursor = conn.cursor()
        norm_date = self.normalize_date(record.get('date', ''))
        try:
            cursor.execute('''
                INSERT INTO cash_records (date, category, payee, income, expense, balance, description)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            ''', (
                norm_date,
                record.get('category', ''),
                record.get('payee', ''),
                float(record.get('income', 0) or 0),
                float(record.get('expense', 0) or 0),
                float(record.get('balance', 0) or 0),
                record.get('description', '')
            ))
            new_id = cursor.fetchone()[0]
            conn.commit()
            return True, new_id
        except Exception as e:
            print(f"Failed to add cash record: {e}")
            return False, str(e)
        finally:
            cursor.close()
            conn.close()

    def update_cash_record(self, record_id: int, field: str, value: Any):
        conn = self.get_conn()
        cursor = conn.cursor()
        try:
            allowed_fields = ['date', 'category', 'payee', 'income', 'expense', 'balance', 'description']
            if field not in allowed_fields:
                return False

            if field in ['income', 'expense', 'balance']:
                try:
                    value = float(value)
                except ValueError:
                    value = 0.0
            elif field == 'date':
                value = self.normalize_date(value)

            cursor.execute(f"UPDATE cash_records SET {field} = %s WHERE id = %s", (value, record_id))
            conn.commit()
            return True
        except Exception as e:
            print(f"Failed to update cash record: {e}")
            return False
        finally:
            cursor.close()
            conn.close()

    def delete_cash_record(self, record_id: int):
        conn = self.get_conn()
        cursor = conn.cursor()
        try:
            cursor.execute("DELETE FROM cash_records WHERE id = %s", (record_id,))
            conn.commit()
            return True
        except Exception as e:
            print(f"Failed to delete cash record: {e}")
            return False
        finally:
            cursor.close()
            conn.close()

    def get_monthly_budgets(self, month: str):
        df = self._query_df("SELECT category, amount FROM category_budgets WHERE month = %s", params=(month,))
        return dict(zip(df['category'], df['amount']))

    def update_budget(self, month: str, category: str, amount: float):
        conn = self.get_conn()
        cursor = conn.cursor()
        try:
            cursor.execute('''
                INSERT INTO category_budgets (month, category, amount)
                VALUES (%s, %s, %s)
                ON CONFLICT (month, category) 
                DO UPDATE SET amount = EXCLUDED.amount
            ''', (month, category, amount))
            conn.commit()
            return True
        except Exception as e:
            print(f"Failed to update budget: {e}")
            return False
        finally:
            cursor.close()
            conn.close()