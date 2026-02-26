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

# Suppress pandas SQLAlchemy warning for raw psycopg2 connections
warnings.filterwarnings('ignore', category=UserWarning, module='pandas')

load_dotenv()

class ExpenseEngine:
    def __init__(self):
        self.db_url = os.environ.get("DATABASE_URL")
        # Ensure correct prefix for SQLAlchemy/psycopg2
        if self.db_url and self.db_url.startswith("postgres://"):
            self.db_url = self.db_url.replace("postgres://", "postgresql://", 1)
            
        self.create_tables()

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
                cash_amount REAL,
                description TEXT,
                income REAL,
                expense REAL,
                net_amount REAL,
                bank_balance REAL,
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
                quantity REAL,
                unit TEXT,
                unit_price REAL,
                total_price REAL,
                is_duplicate_check TEXT UNIQUE
            )
        ''')

        # 3. Sales Records Table (매일의 매출 기록용)
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS sales_records (
            id SERIAL PRIMARY KEY,
            date TEXT UNIQUE,
            cash REAL DEFAULT 0,
            debit REAL DEFAULT 0,
            credit REAL DEFAULT 0,
            svc REAL DEFAULT 0,
            tips REAL DEFAULT 0,
            tax REAL DEFAULT 0,
            cash_tips REAL DEFAULT 0,
            doordash REAL DEFAULT 0,
            stripe REAL DEFAULT 0,
            total REAL DEFAULT 0,
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
                cash_amount REAL,
                description TEXT,
                income REAL,
                expense REAL,
                net_amount REAL,
                bank_balance REAL,
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
                income REAL DEFAULT 0,
                expense REAL DEFAULT 0,
                balance REAL DEFAULT 0,
                description TEXT
            )
        ''')
        conn.commit()
        cursor.close()
        conn.close()

    # --- Sales Record Logic (신규 추가) ---
    def get_sales_records(self):
        """저장된 매출 기록을 날짜 역순으로 가져옵니다."""
        try:
            conn = self.get_conn()
            df = pd.read_sql("SELECT * FROM sales_records ORDER BY date DESC", conn)
            conn.close()
            df = df.fillna("")
            return df.to_dict(orient='records')
        except Exception as e:
            print(f"Sales DB Error: {e}")
            return []

    def update_sales_record(self, date, field, value):
        """특정 날짜의 매출 데이터를 업데이트하고 Total을 자동 계산합니다."""
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
                COALESCE(cash_tips, 0) + COALESCE(doordash, 0) + COALESCE(stripe, 0)
            WHERE date = %s
        ''', (date,))
            
            conn.commit()
            return True
        except Exception as e:
            print(f"Update Sales Error: {e}")
            return False
        finally:
            cursor.close()
            conn.close()
            
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

    def _save_row(self, entry, table_name="transactions"):
        conn = self.get_conn()
        dup_key = f"{entry['date']}_{entry['desc']}_{entry['income']}_{entry['expense']}"
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
                entry['date'], 
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
            pass 
        finally:
            cursor.close()
            conn.close()

    def get_all_transactions(self):
        try:
            conn = self.get_conn()
            df = pd.read_sql("SELECT * FROM transactions ORDER BY date DESC", conn)
            conn.close()
            df = df.fillna("")
            return df.to_dict(orient='records')
        except Exception as e:
            print(f"DB Error: {e}")
            return []

    def get_all_invoices(self):
        try:
            conn = self.get_conn()
            df = pd.read_sql("SELECT * FROM invoice_items ORDER BY date DESC", conn)
            conn.close()
            df = df.fillna("")
            return df.to_dict(orient='records')
        except Exception as e:
            return []
            
    def _parse_usfoods(self, df, filename):
        date_match = re.search(r'(\d{1,2}-\d{1,2})', filename)
        date_str = f"2026-{date_match.group(1)}" if date_match else datetime.now().strftime('%Y-%m-%d')
        count = 0
        for _, row in df.iterrows():
            if pd.isna(row.get('ProductDescription', '')): continue
            entry = {
                'date': date_str,
                'vendor': 'US Foods',
                'p_code': str(row.get('ProductNumber', '')),
                'p_name': row.get('ProductDescription', ''),
                'qty': float(row['QtyShip']) if pd.notnull(row.get('QtyShip')) else 0,
                'unit': row.get('PricingUnit', ''),
                'u_price': float(row['UnitPrice']) if pd.notnull(row.get('UnitPrice')) else 0,
                't_price': float(row['ExtendedPrice']) if pd.notnull(row.get('ExtendedPrice')) else 0,
            }
            if self._save_invoice_item(entry): count += 1
        return {"status": "success", "message": f"US Foods: {count} items saved"}

    def _save_invoice_item(self, entry):
        dup_key = f"{entry['date']}_{entry['p_code']}_{entry['t_price']}"
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
            self._save_row(entry, table_name="transactions")

    def _parse_chase(self, df):
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
            self._save_row(entry, table_name="credit_card_records")

    def _parse_citi(self, df):
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
            self._save_row(entry, table_name="credit_card_records")

    def get_all_credit_cards(self):
        try:
            conn = self.get_conn()
            df = pd.read_sql("SELECT * FROM credit_card_records ORDER BY date DESC", conn)
            conn.close()
            df = df.fillna("")
            return df.to_dict(orient='records')
        except Exception as e:
            print(f"DB Error: {e}")
            return []

    # --- Cash Records Logic ---
    def get_all_cash_records(self):
        try:
            conn = self.get_conn()
            df = pd.read_sql("SELECT * FROM cash_records ORDER BY date DESC, id DESC", conn)
            conn.close()
            df = df.fillna("")
            return df.to_dict(orient='records')
        except Exception as e:
            print(f"DB Error: {e}")
            return []
            
    def add_cash_record(self, record: dict):
        conn = self.get_conn()
        cursor = conn.cursor()
        try:
            cursor.execute('''
                INSERT INTO cash_records (date, category, payee, income, expense, balance, description)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            ''', (
                record.get('date', ''),
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