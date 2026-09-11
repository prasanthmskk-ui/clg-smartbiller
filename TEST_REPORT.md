# CLG Billing Project — Testing & Fix Report

## Completed checks
- Python backend syntax: PASS
- WSGI syntax: PASS
- Backend smoke checks: PASS
- JavaScript syntax checks: PASS
- Database schema consistency: FIXED
- Backend input validation: FIXED
- MySQL transaction rollback handling: VERIFIED

## Important remaining runtime test
A real MySQL INSERT/SELECT test was not possible in this isolated environment because there is no reachable MySQL server and no database credentials were supplied. No credentials were stored in this project.

## Changes made
1. Unified `src/3_Database/schema.sql` with the backend's expected columns/types.
2. Added stronger JSON, customer, total, item, quantity and price validation.
3. Backend now returns HTTP 201 after a successful receipt insert.
4. Customer name is updated when an existing phone number is reused.
5. Database errors returned to clients are now generic instead of exposing raw SQL/server details.
6. Added `backend_smoke_test.py` for repeatable no-credential backend checks.

## Deployment note
The project still needs a real MySQL service and environment variables (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `CORS_ORIGINS`, and production `VITE_API_URL`) before production deployment can be considered complete.
