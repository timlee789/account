import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def main():
    db_url = os.environ.get("DATABASE_URL")
    if db_url and db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
        
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    try:
        cursor.execute('''
            UPDATE sales_records SET total = 
                COALESCE(cash, 0) + COALESCE(debit, 0) + COALESCE(credit, 0) + 
                COALESCE(cash_tips, 0) + COALESCE(doordash, 0) + COALESCE(stripe, 0) + COALESCE(tips, 0)
        ''')
        conn.commit()
        print(f"Updated {cursor.rowcount} records.")
    except Exception as e:
        print("Error:", e)
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()
