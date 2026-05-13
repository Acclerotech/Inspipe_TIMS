# TIMS Backend — Tank Integrity Management System

## Tech Stack
- Java 21 · Spring Boot 3.2.5 · MySQL 8 · Flyway · JWT · MapStruct · Lombok · PDFBox · Swagger

## Quick Start

### Option A — Docker Compose (Recommended)
```bash
# Place your 01_schema.sql in project root, then:
docker-compose up --build
# API available at http://localhost:8080
# Swagger UI: http://localhost:8080/swagger-ui.html
```

### Option B — Local Dev
```bash
# 1. Create MySQL database and run 01_schema.sql
# 2. Set env vars or edit application.yml:
export DB_USERNAME=tims_user
export DB_PASSWORD=tims_pass
export JWT_SECRET=tims-secret-key-min-32-chars-here!!

# 3. Run
mvn spring-boot:run
```

## Authenticate
```bash
POST /api/auth/login
{ "email": "admin@example.com", "password": "your_password" }
# Returns: { "accessToken": "...", "tokenType": "Bearer" }
```

## Key APIs

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | Get JWT |
| GET | /api/dashboard/tanks | Fleet summary |
| GET | /api/dashboard/metrics | KPI totals |
| GET | /api/tanks/{id} | Tank detail |
| GET | /api/tanks/{id}/inspections | Inspections newest-first |
| GET | /api/tanks/{id}/defects | Defects |
| GET | /api/tanks/{id}/corrosion | Latest corrosion assessment |
| GET | /api/tanks/{id}/thickness-history | Trend data |
| GET | /api/inspections/calendar | Calendar view |
| POST | /api/inspections | Schedule inspection |
| PATCH | /api/inspections/{id}/status | Advance state machine |
| POST | /api/inspections/{id}/reopen | WF-02 REOPEN (AT-091) |
| GET | /api/inspections/{id}/work-pack | Work pack (<=8s) |
| POST | /api/ingestion/upload | Upload file (multipart) |
| POST | /api/ingestion/{id}/map-columns | Map columns |
| POST | /api/ingestion/{id}/validate | Validate |
| POST | /api/ingestion/{id}/commit | Commit |
| GET | /api/heatmap/defects | Defect heatmap |
| GET | /api/reports | List reports |
| POST | /api/reports | Create report |
| POST | /api/reports/{id}/sign | Sign report |
| GET | /api/reports/{id}/pdf | Download PDF (<=8s) |
| GET | /api/reports/{id}/compliance-pack | Download ZIP |
| GET | /api/audit/{type}/{id} | Audit trail |
| GET | /api/alerts/my | My unread alerts |

## Roles
- ADMIN — full access
- INTEGRITY_MANAGER — reports, sign, reopen
- INTEGRITY_ENGINEER — ingestion, reports creation
- INSPECTOR — read access, create inspections

## UAT Coverage (AT-011 to AT-092)

[//]: # (- AT-011/012: Tank creation with audit, inspections newest-first)
- AT-021: Raw file stored to disk with SHA-256
- AT-022: Retirement threshold breach → Defect created automatically
- AT-023: Unit mismatch (inches vs mm) → commit blocked with clear message
- AT-031: Work pack generation endpoint <=8s
- AT-032: Nightly @Scheduled conflict detection → InspectionAlert posted
- AT-041/042/043: Corrosion rate calculation (via CorrosionAssessmentRepository)
- AT-051: EEMUA MFL Class-1/2/3 classification on commit
- AT-071: Heatmap API with indexed view
- AT-081: PDF with provenance appendix (hash + calc version + signatories)
- AT-082: Compliance ZIP with manifest.json
- AT-091: APPROVED entities are immutable → HTTP 409 + REOPEN offered
- AT-092: REOPEN stores before/after + mandatory reason in audit_events
