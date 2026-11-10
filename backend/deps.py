"""공용 의존성: 앱 전체가 공유하는 ExpenseEngine 인스턴스."""
from finance_engine import ExpenseEngine
from purchasing import PurchasingEngine

engine = ExpenseEngine()

purchasing = PurchasingEngine(engine.get_conn)
purchasing.ensure_schema()
