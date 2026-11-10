import os
import sys

# 테스트는 실제 DB 에 접속하지 않는다: 환경변수 설정 + create_tables 무력화 후 main 을 import 한다.
os.environ.setdefault("ADMIN_PASSWORD", "test-password")
os.environ.setdefault("DATABASE_URL", "postgresql://invalid/none")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import finance_engine  # noqa: E402

finance_engine.ExpenseEngine.create_tables = lambda self: None
