from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

response = client.get("/api/dashboard-summary")
print("Response Status for /api/dashboard-summary:", response.status_code)
if response.status_code != 200:
    print("Response JSON:", response.text)

response2 = client.get("/dashboard-summary")
print("Response Status for /dashboard-summary:", response2.status_code)
