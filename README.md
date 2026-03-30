# SkyOps Mission Control

Internal drone fleet management system for SkyOps Ltd. Built for tracking drone missions, maintenance schedules, and operational compliance.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS (TypeScript), TypeORM |
| Database | PostgreSQL 16 |
| Frontend | React (TypeScript), Vite, TailwindCSS |
| Testing | Jest (backend), Playwright (frontend E2E) |
| API Style | REST |

## Key Features

- **Drone Registry**: CRUD operations with serial number validation (`SKY-XXXX-XXXX` format)
- **Mission Management**: State-driven lifecycle with overlap detection and drone availability checks
- **Maintenance Tracking**: Automated due-date calculation (50 flight hours OR 90 days rule)
- **Fleet Health Report**: Real-time metrics for operations dashboard
- **Data Seeding**: Realistic test data (20 drones, 50 missions, 30 maintenance logs)

## Architecture Decisions

### Backend

- **NestJS Modules**: Domain-driven structure (`drones`, `missions`, `maintenance`, `fleet`)
- **TypeORM Entities**: PostgreSQL native types (UUID, enum, timestamptz) for performance
- **Validation**: Global `ValidationPipe` with `class-validator` decorators at DTO level
- **Business Rules**: Service-layer enforcement (state transitions, overlap detection, maintenance due logic)
- **Migrations**: TypeORM CLI migrations (no auto-sync) for version control

### Database

- **Foreign Keys**: Explicit relations between missions/maintenance → drones
- **Indexes**: Status columns indexed for common filter queries
- **Date Fields**: `date` type for maintenance dates, `timestamptz` for mission scheduling

### Frontend

- **Component Structure**: Page-based organization (Dashboard, DroneDetail)
- **Routing**: React Router for navigation between dashboard and drone detail pages
- **State Management**: React hooks + fetch for simplicity (scalable to Zustand/TanStack Query)
- **Styling**: TailwindCSS utility-first approach
- **Features**: Fleet overview metrics, maintenance alerts, drone list with detail links, mission view, drone detail with full history

## Getting Started

### Prerequisites

- Node.js 20+ (tested on v24.0.2)
- Docker Desktop (for PostgreSQL)
- npm 10+

### Installation

1. Clone and navigate to the project:
```bash
cd skyops-mission-control
```

2. Start PostgreSQL:
```bash
docker compose up -d postgres
```

3. Install backend dependencies:
```bash
cd backend
npm install
```

4. Run database migrations:
```bash
npm run migration:run
```

5. Seed test data:
```bash
npm run seed
```

6. Start backend server:
```bash
npm run start:dev
```
Backend runs on `http://localhost:3000`

7. Install frontend dependencies (new terminal):
```bash
cd ../frontend
npm install
```

8. Start frontend dev server:
```bash
npm run dev
```
Frontend runs on `http://localhost:5173`

## API Endpoints

### Drones
- `GET /drones?page=1&limit=10&status=AVAILABLE` - List drones (paginated)
- `POST /drones` - Create drone
- `GET /drones/:id` - Get drone by ID
- `PATCH /drones/:id` - Update drone
- `DELETE /drones/:id` - Retire drone

### Missions
- `GET /missions?page=1&limit=10&status=PLANNED&droneId=<uuid>` - List missions
- `POST /missions` - Schedule mission
- `PATCH /missions/:id/pre-flight-check` - Transition to pre-flight
- `PATCH /missions/:id/start` - Start mission (drone becomes IN_MISSION)
- `PATCH /missions/:id/complete` - Complete mission (logs flight hours, checks maintenance)
- `PATCH /missions/:id/abort` - Abort mission (requires reason)

### Maintenance
- `POST /maintenance-logs` - Log maintenance activity (updates drone maintenance dates)
- `GET /maintenance-logs/drone/:droneId` - Get maintenance history for a specific drone

### Fleet Health
- `GET /fleet-health` - Dashboard metrics (drone counts, overdue maintenance, upcoming missions)

## Testing

### Backend Tests
```bash
cd backend
npm test                  # Unit tests
npm run test:cov          # With coverage
npm run test:e2e          # Integration tests
```

### Frontend E2E Tests
```bash
cd frontend
npm run test:e2e
```

## Business Rules Enforced

### Drone Management
- Serial number must match `SKY-XXXX-XXXX` format (alphanumeric)
- Maintenance due every **50 flight hours OR 90 days** (whichever first)
- Only `AVAILABLE` drones can be assigned to missions
- Cannot retire drone with upcoming scheduled missions

### Mission Lifecycle
Valid state transitions:
```
PLANNED → PRE_FLIGHT_CHECK → IN_PROGRESS → COMPLETED
   ↓            ↓                  ↓
ABORTED      ABORTED           ABORTED
```

Additional rules:
- Missions cannot be scheduled in the past
- No overlapping missions for same drone (by planned time window)
- Starting mission sets drone status to `IN_MISSION`
- Completing mission logs flight hours and checks maintenance due
- Aborting mission requires a reason

### Maintenance Tracking
- Creating maintenance log updates drone's `lastMaintenanceDate` and `nextMaintenanceDueDate`
- Flight hours at maintenance must match drone's total (within 0.5h tolerance)
- Cannot log maintenance while mission is in progress

## Project Structure

```
skyops-mission-control/
├── backend/
│   ├── src/
│   │   ├── common/enums/          # Shared enums (status, types)
│   │   ├── drones/                # Drone module (CRUD, business logic)
│   │   ├── missions/              # Mission module (lifecycle management)
│   │   ├── maintenance/           # Maintenance log module
│   │   ├── fleet/                 # Fleet health report
│   │   ├── database/              # Migrations, seed, data-source
│   │   └── app.module.ts
│   ├── test/                      # E2E tests
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/            # React components
│   │   ├── pages/                 # Dashboard, drone list, detail pages
│   │   └── api/                   # Fetch utilities
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Environment Variables

Backend (`.env`):
```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/skyops_mission_control
PORT=3000
TYPEORM_LOGGING=false
```

Frontend (`.env`):
```env
VITE_API_BASE_URL=http://localhost:3000
```

## Development Notes

### Migration Workflow
```bash
# Generate new migration after entity changes
npm run migration:generate -- src/migrations/MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

### Seed Data Reset
```bash
npm run seed
```
Truncates all tables and re-seeds with fresh test data.

## Known Limitations

- No authentication/authorization (internal tool assumption)
- No real-time updates (would add WebSocket for production)
- Frontend uses basic fetch (TanStack Query recommended for production)
- E2E tests run against local dev server (not isolated test DB)

## Future Enhancements

- WebSocket support for real-time mission status updates
- Batch mission scheduling
- Drone telemetry data storage
- Maintenance history export (CSV/PDF)
- Role-based access control (RBAC)

## License

Private - SkyOps Ltd. Internal Use Only
