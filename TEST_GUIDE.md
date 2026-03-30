# SkyOps Mission Control - Test Kılavuzu

## Hızlı Test Özeti

### ✅ Tamamlanmış Testler
- **Backend Unit Tests**: 25/25 passed
- **Backend Linter**: 0 errors
- **Frontend Linter**: 0 errors
- **Backend Running**: http://localhost:3000 ✅
- **Frontend Running**: http://localhost:5174 ✅

---

## 1️⃣ Backend Testleri (Otomatik)

### Unit Tests
```bash
cd backend
npm test
```

**Sonuç**: 25/25 tests passed
- ✅ Serial number validation
- ✅ Maintenance calculations (50h OR 90 days)
- ✅ Mission state transitions
- ✅ Overlap detection
- ✅ Drone retirement with upcoming missions
- ✅ Fleet health report logic

### Coverage Report
```bash
cd backend
npm run test:cov
```

### Integration Test (E2E)
```bash
cd backend
npm run test:e2e
```

Test akışı:
1. Create drone → 2. Schedule mission → 3. Pre-flight check → 4. Start mission → 5. Complete mission → 6. Verify fleet health

---

## 2️⃣ Backend API Manuel Test

### Gereksinimler
- PostgreSQL çalışıyor olmalı: `docker compose up -d postgres`
- Backend çalışıyor olmalı: `cd backend && npm run start:dev`
- Seed data yüklenmiş olmalı: `npm run seed`

### API Endpoints Test

#### 1. Fleet Health
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/fleet-health"
```

**Beklenen Çıktı**:
```json
{
  "totalDrones": 20,
  "dronesByStatus": {
    "AVAILABLE": 10,
    "MAINTENANCE": 10
  },
  "overdueMaintenanceDrones": [...],
  "missionsInNext24Hours": 2,
  "averageFlightHoursPerDrone": 108.9
}
```

#### 2. List Drones (Paginated)
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/drones?page=1&limit=5"
```

#### 3. List Missions (Filtered)
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/missions?page=1&limit=5&status=PLANNED"
```

#### 4. Create New Drone
```powershell
$body = @{
    serialNumber = "SKY-TEST-0001"
    model = "PHANTOM_4"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/drones" -Method POST -Body $body -ContentType "application/json"
```

#### 5. Schedule Mission
```powershell
$start = (Get-Date).AddHours(2).ToString("o")
$end = (Get-Date).AddHours(5).ToString("o")

$body = @{
    name = "Test Inspection"
    missionType = "WIND_TURBINE_INSPECTION"
    droneId = "<DRONE_ID_FROM_STEP_4>"
    pilotName = "Test Pilot"
    siteLocation = "Test Site"
    plannedStart = $start
    plannedEnd = $end
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/missions" -Method POST -Body $body -ContentType "application/json"
```

#### 6. Transition Mission
```powershell
# Pre-flight check
Invoke-RestMethod -Uri "http://localhost:3000/missions/<MISSION_ID>/pre-flight-check" -Method PATCH

# Start mission
Invoke-RestMethod -Uri "http://localhost:3000/missions/<MISSION_ID>/start" -Method PATCH

# Complete mission
$body = @{ flightHoursLogged = 2.5 } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/missions/<MISSION_ID>/complete" -Method PATCH -Body $body -ContentType "application/json"
```

#### 7. Log Maintenance
```powershell
$body = @{
    droneId = "<DRONE_ID>"
    type = "ROUTINE_CHECK"
    technicianName = "Test Technician"
    flightHoursAtMaintenance = 10.5
    datePerformed = (Get-Date).ToString("o")
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/maintenance-logs" -Method POST -Body $body -ContentType "application/json"
```

---

## 3️⃣ Frontend Manuel Test (Browser)

### Gereksinimler
- Backend çalışıyor olmalı
- Frontend çalışıyor olmalı: `cd frontend && npm run dev`

### Test Senaryoları

#### Dashboard Testi
1. Tarayıcıda **http://localhost:5174** aç
2. Kontrol et:
   - ✅ "SkyOps Mission Control" başlığı görünüyor mu?
   - ✅ Fleet Overview kartları (Total Drones, Available, In Mission, Maintenance)
   - ✅ Maintenance Alerts (varsa) kırmızı uyarı kutusu
   - ✅ Drone Fleet tablosu (Serial Number, Model, Status, Flight Hours, Next Maintenance, Actions)
   - ✅ Mission View tablosu (Mission Name, Drone, Status, Planned Start/End)

#### Drone Detail Page Testi
1. Dashboard'da bir drone'un **"View Details"** linkine tıkla
2. Kontrol et:
   - ✅ URL `/drones/{id}` formatında mı?
   - ✅ Drone bilgileri (Serial Number, Model, Status, Flight Hours, Maintenance dates)
   - ✅ Mission History tablosu (drone'a ait tüm missions)
   - ✅ Maintenance History tablosu (drone'a ait maintenance logs)
   - ✅ "Back to Dashboard" linki çalışıyor mu?

#### Responsive Design Testi
1. Browser'ı küçült (mobile view)
2. Kartlar ve tablolar responsive olarak düzenli görünüyor mu?

---

## 4️⃣ Frontend E2E Testleri (Playwright)

### Kurulum
```bash
cd frontend
npx playwright install
```

### Testleri Çalıştır
```bash
npm run test:e2e
```

### Test Coverage
- ✅ Dashboard load & fleet overview display
- ✅ Mission View section display
- ✅ Drone detail page navigation
- ✅ Maintenance alerts display

### Test Raporu
```bash
npx playwright show-report
```

---

## 5️⃣ Business Rules Validation

### Test Edilmesi Gereken Kurallar

#### Drone Rules
- ✅ Serial number format (`SKY-XXXX-XXXX`)
- ✅ Maintenance due: 50 flight hours OR 90 days
- ✅ Only AVAILABLE drones can be assigned to missions
- ✅ Cannot retire drone with upcoming missions

#### Mission Rules
- ✅ Valid state transitions (PLANNED → PRE_FLIGHT_CHECK → IN_PROGRESS → COMPLETED/ABORTED)
- ✅ No overlapping missions for same drone
- ✅ Cannot schedule in past
- ✅ Drone becomes IN_MISSION when mission starts
- ✅ Flight hours logged on completion
- ✅ Abort requires reason

#### Maintenance Rules
- ✅ Updates drone maintenance dates
- ✅ Flight hours consistency check (±0.5h tolerance)
- ✅ Cannot log maintenance during active mission

---

## 6️⃣ Manuel Smoke Test Checklist

### Backend
- [ ] `GET /` → API info dönüyor mu?
- [ ] `GET /fleet-health` → Metrics doğru mu?
- [ ] `GET /drones` → Pagination çalışıyor mu?
- [ ] `POST /drones` → Validation çalışıyor mu?
- [ ] `PATCH /drones/:id/retire` → Upcoming missions kontrolü yapıyor mu?
- [ ] `GET /missions?status=PLANNED` → Filtering çalışıyor mu?
- [ ] `PATCH /missions/:id/start` → Drone status güncelleniy or mu?
- [ ] `POST /maintenance-logs` → Drone maintenance dates güncelleniyor mu?
- [ ] `GET /maintenance-logs/drone/:id` → Maintenance history geliyor mu?

### Frontend
- [ ] Dashboard yükleniyor mu?
- [ ] Fleet metrics doğru görünüyor mu?
- [ ] Drone table render ediliyor mu?
- [ ] Mission table render ediliyor mu?
- [ ] "View Details" linki çalışıyor mu?
- [ ] Drone detail page bilgileri gösteriyor mu?
- [ ] Mission history gösteriliyor mu?
- [ ] Maintenance history gösteriliyor mu?
- [ ] "Back to Dashboard" çalışıyor mu?

---

## 7️⃣ Performans Testi

### Load Test (Opsiyonel)
```bash
# 100 paralel drone oluşturma
for ($i=0; $i -lt 100; $i++) {
    $body = @{
        serialNumber = "SKY-LOAD-$(Get-Random -Minimum 1000 -Maximum 9999)"
        model = "PHANTOM_4"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "http://localhost:3000/drones" -Method POST -Body $body -ContentType "application/json" -ErrorAction SilentlyContinue
}
```

---

## 8️⃣ Hata Senaryoları Test

### Invalid Input Tests
```powershell
# 1. Invalid serial number
$body = @{ serialNumber = "INVALID"; model = "PHANTOM_4" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/drones" -Method POST -Body $body -ContentType "application/json"
# Beklenen: 400 Bad Request

# 2. Past mission scheduling
$past = (Get-Date).AddDays(-1).ToString("o")
$body = @{
    name = "Past Mission"
    missionType = "WIND_TURBINE_INSPECTION"
    droneId = "<VALID_DRONE_ID>"
    pilotName = "Pilot"
    siteLocation = "Site"
    plannedStart = $past
    plannedEnd = (Get-Date).ToString("o")
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/missions" -Method POST -Body $body -ContentType "application/json"
# Beklenen: 400 Bad Request

# 3. Invalid state transition
Invoke-RestMethod -Uri "http://localhost:3000/missions/<COMPLETED_MISSION_ID>/start" -Method PATCH
# Beklenen: 400 Bad Request
```

---

## 9️⃣ Live Session Hazırlığı

Case study sonrası yapılacak live session için hazırlanman gereken konular:

### A) Design Decisions
- **Neden modular NestJS yapısı?** → Domain-driven, scalable, testable
- **Neden TypeORM?** → Type-safe, migration support, PostgreSQL optimization
- **Neden state machine?** → Mission lifecycle complexity, audit trail
- **Neden React Router?** → Client-side routing, drone detail page navigation

### B) Extending Application
Muhtemel yeni feature istekleri:
- Drone battery tracking
- Pilot assignment management
- Real-time mission tracking (WebSocket)
- Maintenance scheduling/calendar
- Export reports (CSV/PDF)

### C) Debugging Scenarios
Olası sorunlar:
- Overlapping mission detection
- Maintenance date calculation edge cases
- Timezone handling
- Foreign key constraint violations

### D) Scaling Questions
- **Database**: Read replicas, connection pooling, query optimization
- **Backend**: Microservices, message queue (RabbitMQ/Redis), caching
- **Frontend**: State management (Zustand/Redux), code splitting, CDN
- **Deployment**: Kubernetes, CI/CD, monitoring (Prometheus/Grafana)

---

## 🎯 Son Kontrol Listesi (Teslim Öncesi)

- [x] README.md güncel ve detaylı
- [x] .env.example dosyaları oluşturulmuş
- [x] docker-compose.yml çalışıyor
- [x] Migrations başarıyla çalışıyor
- [x] Seed script çalışıyor (20 drones, 50 missions, 30 logs)
- [x] Backend testler geçiyor (25/25)
- [x] Backend linter temiz
- [x] Frontend linter temiz
- [ ] Frontend E2E testler geçiyor (düzeltme devam ediyor)
- [x] Tüm API endpoints test edildi
- [x] Business rules enforce ediliyor
- [x] Error handling yapılandırılmış
- [x] TypeScript strict mode
- [x] Code quality yüksek

---

## 📦 Teslim Formatı

### GitHub/GitLab Repo
```bash
# .gitignore kontrolü
git status

# Commit gerekiyorsa
git add .
git commit -m "Complete SkyOps Mission Control case study"
git push origin main
```

### ZIP Dosyası
```powershell
# node_modules hariç sıkıştır
Compress-Archive -Path "c:\Users\Bilal\Desktop\skyops-mission-control\*" -DestinationPath "skyops-mission-control.zip" -Force
```

**Önemli**: `node_modules` klasörlerini ZIP'e ekleme!

---

## 🚀 Demo İçin Hızlı Başlatma

```bash
# Terminal 1: PostgreSQL
docker compose up -d postgres

# Terminal 2: Backend
cd backend
npm run migration:run
npm run seed
npm run start:dev

# Terminal 3: Frontend
cd frontend
npm run dev

# Tarayıcı
http://localhost:5174
```

---

## 📊 Beklenen Test Sonuçları

### Backend
```
Test Suites: 4 passed, 4 total
Tests:       25 passed, 25 total
```

### API Smoke Test
- `GET /` → API info ✅
- `GET /fleet-health` → Metrics ✅
- `GET /drones` → Paginated list ✅
- `GET /missions` → Filtered list ✅
- `POST /drones` → Validation ✅
- `PATCH /drones/:id/retire` → Business rule check ✅

### Frontend (Browser)
- Dashboard load ✅
- Fleet overview cards ✅
- Drone table ✅
- Mission table ✅
- Drone detail page ✅
- Navigation ✅
