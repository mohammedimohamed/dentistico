# Graph Report - dentistico  (2026-05-03)

## Corpus Check
- 188 files · ~273,835 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 550 nodes · 552 edges · 26 communities detected
- Extraction: 82% EXTRACTED · 18% INFERRED · 0% AMBIGUOUS · INFERRED: 98 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]

## God Nodes (most connected - your core abstractions)
1. `load()` - 33 edges
2. `PatientStore` - 14 edges
3. `load()` - 11 edges
4. `getServerConfig()` - 7 edges
5. `f()` - 7 edges
6. `t` - 7 edges
7. `runAllTests()` - 6 edges
8. `p()` - 6 edges
9. `simulateBooking()` - 5 edges
10. `handle()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `handle()` --calls--> `getSession()`  [INFERRED]
  src\hooks.server.ts → src\lib\server\auth.ts
- `handle()` --calls--> `getServerConfig()`  [INFERRED]
  src\hooks.server.ts → src\lib\server\db.ts
- `handle()` --calls--> `getDatabaseSize()`  [INFERRED]
  src\hooks.server.ts → src\lib\server\db.ts
- `load()` --calls--> `getClosures()`  [INFERRED]
  src\routes\book\+page.server.ts → src\lib\server\clinic-settings.ts
- `load()` --calls--> `getCancellationReasons()`  [INFERRED]
  src\routes\print\prescription\[id]\+page.server.ts → src\lib\server\db.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (50): load(), GET(), load(), load(), load(), addColumnIfNotExists(), archivePatient(), checkDoctorConflict() (+42 more)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (13): POST(), GET(), POST(), POST(), createNotification(), getAllAdminIds(), getAllNotifications(), getUnreadCount() (+5 more)

### Community 2 - "Community 2"
Cohesion: 0.18
Nodes (15): b(), c(), d(), f(), h(), l(), m(), o() (+7 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (7): setupI18n(), POST(), deleteSession(), getSession(), getDatabaseSize(), handle(), ConfigStore

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (13): load(), load(), load(), getActiveRooms(), getAllUpcomingAppointments(), getCurrentShift(), getDoctorAppointmentsToday(), getDoctorUpcomingAppointments() (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (13): DELETE(), GET(), POST(), PUT(), load(), createRoom(), deleteRoom(), getAllCancellationReasons() (+5 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (10): GET(), load(), GET(), getClinicSettings(), getClosures(), getWorkingDays(), getWorkingHours(), isClinicOpen() (+2 more)

### Community 7 - "Community 7"
Cohesion: 0.19
Nodes (1): PatientStore

### Community 8 - "Community 8"
Cohesion: 0.18
Nodes (2): checkTimerAlerts(), playBeeps()

### Community 9 - "Community 9"
Cohesion: 0.27
Nodes (6): g(), b(), d(), k(), m(), p()

### Community 10 - "Community 10"
Cohesion: 0.44
Nodes (7): cleanupExpiredWaitingRoom(), formatSqlDate(), getRandomElement(), isConflict(), runClinicalSimulation(), simulateBooking(), simulateCheckIn()

### Community 11 - "Community 11"
Cohesion: 0.25
Nodes (8): DELETE(), GET(), POST(), PUT(), createBuilding(), deleteBuilding(), getAllBuildings(), updateBuilding()

### Community 12 - "Community 12"
Cohesion: 0.25
Nodes (8): DELETE(), GET(), POST(), PUT(), createFloor(), deleteFloor(), getFloorsByBuilding(), updateFloor()

### Community 13 - "Community 13"
Cohesion: 0.5
Nodes (1): t

### Community 14 - "Community 14"
Cohesion: 0.52
Nodes (6): analyzeDatabaseHealth(), createPerformanceIndexes(), runAllTests(), testConcurrentWrites(), testDatabaseOperations(), testPragmaSettings()

### Community 15 - "Community 15"
Cohesion: 0.33
Nodes (4): getTemplateByName(), seedDefaultTemplates(), upsertTemplate(), TemplateEngine

### Community 16 - "Community 16"
Cohesion: 0.43
Nodes (2): DELETE(), PUT()

### Community 17 - "Community 17"
Cohesion: 0.4
Nodes (1): SidebarState

### Community 18 - "Community 18"
Cohesion: 0.4
Nodes (3): load(), GET(), getFacilityHierarchy()

### Community 20 - "Community 20"
Cohesion: 0.5
Nodes (1): GET()

### Community 21 - "Community 21"
Cohesion: 0.5
Nodes (2): getTreatmentsByPatient(), GET()

### Community 25 - "Community 25"
Cohesion: 0.67
Nodes (2): getAllTemplates(), load()

### Community 28 - "Community 28"
Cohesion: 0.67
Nodes (2): POST(), updateAppointmentVisit()

### Community 32 - "Community 32"
Cohesion: 0.67
Nodes (2): load(), getAllInvoices()

### Community 34 - "Community 34"
Cohesion: 0.67
Nodes (2): load(), getArchivedPatientsFull()

### Community 35 - "Community 35"
Cohesion: 0.67
Nodes (1): e

## Knowledge Gaps
- **Thin community `Community 7`** (15 nodes): `patients.svelte.ts`, `PatientStore`, `.applyPreset()`, `.constructor()`, `.deletePreset()`, `.loadPreferences()`, `.openQuickView()`, `.pageSize()`, `.resetFilters()`, `.savePreferences()`, `.savePreset()`, `.setFilter()`, `.toggleColumn()`, `.toggleSort()`, `.viewMode()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 8`** (12 nodes): `autoStartVisit()`, `checkTimerAlerts()`, `formatTime()`, `handleDateClick()`, `handleTreatmentAdded()`, `handleUpdateStatus()`, `loadCalendarEvents()`, `openReschedule()`, `playBeeps()`, `resetAlerts()`, `$t()`, `+page.svelte`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (8 nodes): `t`, `.#e()`, `.#h()`, `.#i()`, `.#l()`, `.#o()`, `.run()`, `labeling.worker.min.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (7 nodes): `DELETE()`, `PUT()`, `+server.ts`, `+server.ts`, `+server.ts`, `+server.ts`, `+server.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (5 nodes): `ui.svelte.ts`, `SidebarState`, `.isCollapsed()`, `.setCollapsed()`, `.toggle()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (4 nodes): `GET()`, `+server.ts`, `+server.ts`, `+server.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (4 nodes): `getTreatmentsByPatient()`, `+server.ts`, `GET()`, `POST()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (3 nodes): `getAllTemplates()`, `+page.server.ts`, `load()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (3 nodes): `POST()`, `updateAppointmentVisit()`, `+server.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (3 nodes): `load()`, `getAllInvoices()`, `+page.server.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (3 nodes): `load()`, `getArchivedPatientsFull()`, `+page.server.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (3 nodes): `e`, `.decode()`, `rle.worker.min.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getServerConfig()` connect `Community 5` to `Community 0`, `Community 3`, `Community 4`, `Community 6`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `handle()` connect `Community 3` to `Community 5`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `load()` connect `Community 6` to `Community 5`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Are the 29 inferred relationships involving `load()` (e.g. with `getAppointmentById()` and `getPatientJourneySummary()`) actually correct?**
  _`load()` has 29 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `load()` (e.g. with `getAllUpcomingAppointments()` and `getPatientsEnhanced()`) actually correct?**
  _`load()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `getServerConfig()` (e.g. with `handle()` and `load()`) actually correct?**
  _`getServerConfig()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._