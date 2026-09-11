"""Static backend smoke tests; no MySQL credentials or network access required."""
from pathlib import Path
import ast

ROOT = Path(__file__).resolve().parent
APP = ROOT / "src" / "2_Backend" / "app.py"
SCHEMA = ROOT / "src" / "3_Database" / "schema.sql"

source = APP.read_text(encoding="utf-8")
ast.parse(source)
schema = SCHEMA.read_text(encoding="utf-8")

required_routes = ["/api/health", "/api/save-receipt", "/api/receipts"]
required_tables = ["customers", "receipts", "receipt_items"]
required_sql = ["FOREIGN KEY", "phone_number", "ON DELETE CASCADE"]

for route in required_routes:
    assert route in source, f"Missing route: {route}"
for table in required_tables:
    assert f"CREATE TABLE IF NOT EXISTS {table}" in schema, f"Missing table: {table}"
for fragment in required_sql:
    assert fragment in schema, f"Missing schema constraint: {fragment}"

assert "conn.commit()" in source
assert "conn.rollback()" in source
assert "Decimal" in source
assert "Request body must be valid JSON" in source
assert "Item {index}: quantity/price is invalid" in source

print("PASS: backend syntax, routes, validation, transaction handling, and schema checks")
print("NOTE: real MySQL connection/INSERT/SELECT still requires a reachable MySQL server and credentials.")
