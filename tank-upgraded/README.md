# TankVision — Acclero-Inspipe TIMS Frontend

React + TypeScript + Vite frontend fully integrated with the Spring Boot backend.

---

## Quick Start

### 1. Start the backend
```bash
cd tims-backend
./mvnw spring-boot:run \
  -Dspring-boot.run.arguments="--spring.profiles.active=dev"
```
Backend runs on **http://localhost:8080**

### 2. Start the frontend
```bash
cd tank-dashboard
npm install
npm run dev
```
Frontend runs on **http://localhost:5173**

Vite proxies all `/api/*` calls to `http://localhost:8080` — no CORS issues.

### 3. Log in
Open http://localhost:5173 → you'll be redirected to `/login`.

Use one of the dev accounts seeded in the DB:
- `engineer@acclero.com`
- `manager@acclero.com`
- `inspector@acclero.com`

---

## Architecture

```
src/
├── api/
│   ├── client.ts        ← Base fetch wrapper, JWT injection, 401 handling
│   ├── index.ts         ← All API functions (one per endpoint)
│   ├── types.ts         ← TypeScript DTOs — mirror of com.acclero.tims.dto.ApiDtos
│   └── useApi.ts        ← useApi(fetcher, deps) hook — loading/error/data/refetch
│
├── context/
│   └── AuthContext.tsx  ← JWT stored in localStorage, login/logout, ProtectedRoute
│
└── pages/
    ├── Login.tsx         → POST /api/auth/dev-token
    ├── Dashboard.tsx     → GET  /api/dashboard/tanks + /api/dashboard/metrics
    ├── TankOverview.tsx  → GET  /api/tanks/:id + /defects + /corrosion + /thickness-history
    ├── Heatmap.tsx       → GET  /api/heatmap/defects
    ├── Planner.tsx       → GET  /api/inspections/calendar, PATCH /api/inspections/:id/status
    ├── ReportBuilder.tsx → GET  /api/reports, POST /api/reports, POST /api/reports/:id/sign
    ├── CSVUpload.tsx     → POST /api/ingestion/upload → map-columns → validate → commit
    └── Inspections.tsx   → GET  /api/dashboard/tanks (with search)
```

---

## API Endpoints Used

| Page | Method | Endpoint |
|------|--------|----------|
| Login | POST | `/api/auth/dev-token` |
| Dashboard | GET | `/api/dashboard/tanks?page=0&size=50` |
| Dashboard | GET | `/api/dashboard/metrics` |
| Tank Detail | GET | `/api/tanks/{tankId}` |
| Tank Defects | GET | `/api/tanks/{tankId}/defects` |
| Tank Corrosion | GET | `/api/tanks/{tankId}/corrosion` |
| Tank Thickness | GET | `/api/tanks/{tankId}/thickness-history` |
| Planner | GET | `/api/inspections/calendar` |
| Planner | PATCH | `/api/inspections/{id}/status` |
| Heatmap | GET | `/api/heatmap/defects` |
| Reports | GET | `/api/reports` |
| Reports | POST | `/api/reports` |
| Sign Report | POST | `/api/reports/{id}/sign` |
| CSV Upload | POST | `/api/ingestion/upload` |
| Map Columns | POST | `/api/ingestion/{id}/map-columns` |
| Validate | POST | `/api/ingestion/{id}/validate` |
| Commit | POST | `/api/ingestion/{id}/commit` |

---

## Auth Flow

1. User enters email on `/login`
2. `POST /api/auth/dev-token` returns `{ accessToken, tokenType }`
3. Token saved to `localStorage` key `tims_token`
4. Every API call sends `Authorization: Bearer <token>`
5. On 401 response → token cleared → redirect to `/login`
6. Logout button clears token and redirects

---

## Environment / Configuration

No `.env` file needed in dev — Vite proxy handles everything.

For production build pointing at a real server, set in `vite.config.ts`:
```ts
server: {
  proxy: {
    '/api': { target: 'https://your-prod-server.com', ... }
  }
}
```
Or set `VITE_API_BASE` and update `src/api/client.ts` accordingly.

---

## Backend Requirements

| Requirement | Detail |
|-------------|--------|
| Port | 8080 |
| CORS | Spring SecurityConfig must allow `http://localhost:5173` |
| Auth | `/api/auth/dev-token` must be publicly accessible (no JWT) |
| DB | MySQL 8 at `localhost:3306/tims_db` |
| Migration | Flyway runs on startup (`classpath:db/migration`) |

### Verify backend is running:
```bash
curl http://localhost:8080/actuator/health
# → {"status":"UP"}
```

### Verify auth works:
```bash
curl -X POST http://localhost:8080/api/auth/dev-token \
  -H "Content-Type: application/json" \
  -d '{"email":"engineer@acclero.com"}'
# → {"accessToken":"eyJ...","tokenType":"Bearer"}
```
