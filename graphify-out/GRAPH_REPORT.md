# Graph Report - dentistico  (2026-05-08)

## Corpus Check
- 202 files · ~286,778 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 726 nodes · 754 edges · 57 communities detected
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 107 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]

## God Nodes (most connected - your core abstractions)
1. `load()` - 37 edges
2. `PatientStore` - 14 edges
3. `load()` - 13 edges
4. `DELETE()` - 10 edges
5. `PUT()` - 9 edges
6. `f()` - 8 edges
7. `t` - 8 edges
8. `runAllTests()` - 7 edges
9. `getServerConfig()` - 7 edges
10. `p()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `handle()` --calls--> `getServerConfig()`  [INFERRED]
  src\hooks.server.ts → src\lib\server\db.ts
- `handle()` --calls--> `getDatabaseSize()`  [INFERRED]
  src\hooks.server.ts → src\lib\server\db.ts
- `load()` --calls--> `getClosures()`  [INFERRED]
  C:\source\repos\perso\dentistico\src\routes\book\+page.server.ts → src\lib\server\clinic-settings.ts
- `load()` --calls--> `getCancellationReasons()`  [INFERRED]
  C:\source\repos\perso\dentistico\src\routes\print\prescription\[id]\+page.server.ts → src\lib\server\db.ts
- `load()` --calls--> `getReasonRequirements()`  [INFERRED]
  C:\source\repos\perso\dentistico\src\routes\print\prescription\[id]\+page.server.ts → src\lib\server\db.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (46): load(), GET(), load(), load(), addColumnIfNotExists(), archivePatient(), checkDoctorConflict(), createAppointment() (+38 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (16): POST(), GET(), POST(), POST(), createNotification(), getAllAdminIds(), getAllAssistantIds(), getAllDoctorIds() (+8 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (15): load(), load(), load(), load(), getActiveRooms(), getAllUpcomingAppointments(), getCurrentShift(), getCustomFieldDefinitions() (+7 more)

### Community 3 - "Community 3"
Cohesion: 0.24
Nodes (21): a(), b(), c(), d(), e(), f(), g(), h() (+13 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (9): setupI18n(), POST(), createSession(), deleteSession(), getSession(), setSessionCookie(), getDatabaseSize(), handle() (+1 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (11): GET(), load(), validateDateOfBirth(), GET(), getClinicSettings(), getClosures(), getWorkingDays(), getWorkingHours() (+3 more)

### Community 6 - "Community 6"
Cohesion: 0.14
Nodes (13): DELETE(), GET(), POST(), PUT(), load(), createRoom(), deleteRoom(), getAllCancellationReasons() (+5 more)

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (9): DELETE(), PUT(), createTreatment(), getTreatmentById(), recordDentalCharge(), recordTransaction(), reverseTransaction(), softDeleteTreatment() (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.19
Nodes (1): PatientStore

### Community 9 - "Community 9"
Cohesion: 0.29
Nodes (11): autoStartVisit(), checkTimerAlerts(), formatTime(), handleDateClick(), handleTreatmentAdded(), handleUpdateStatus(), loadCalendarEvents(), openReschedule() (+3 more)

### Community 10 - "Community 10"
Cohesion: 0.42
Nodes (9): a(), b(), d(), h(), k(), m(), p(), r() (+1 more)

### Community 11 - "Community 11"
Cohesion: 0.53
Nodes (8): cleanupExpiredWaitingRoom(), ensureSeedData(), formatSqlDate(), getRandomElement(), isConflict(), runClinicalSimulation(), simulateBooking(), simulateCheckIn()

### Community 12 - "Community 12"
Cohesion: 0.29
Nodes (8): DELETE(), GET(), POST(), PUT(), createFloor(), deleteFloor(), getFloorsByBuilding(), updateFloor()

### Community 13 - "Community 13"
Cohesion: 0.29
Nodes (8): DELETE(), GET(), POST(), PUT(), createBuilding(), deleteBuilding(), getAllBuildings(), updateBuilding()

### Community 14 - "Community 14"
Cohesion: 0.42
Nodes (1): t

### Community 15 - "Community 15"
Cohesion: 0.61
Nodes (6): analyzeDatabaseHealth(), createPerformanceIndexes(), runAllTests(), testConcurrentWrites(), testDatabaseOperations(), testPragmaSettings()

### Community 16 - "Community 16"
Cohesion: 0.32
Nodes (4): getTemplateByName(), seedDefaultTemplates(), upsertTemplate(), TemplateEngine

### Community 17 - "Community 17"
Cohesion: 0.29
Nodes (3): load(), GET(), getFacilityHierarchy()

### Community 18 - "Community 18"
Cohesion: 0.29
Nodes (1): GET()

### Community 19 - "Community 19"
Cohesion: 0.33
Nodes (4): load(), getAllInventoryItems(), getAllSuppliers(), getInventoryKPIs()

### Community 20 - "Community 20"
Cohesion: 0.53
Nodes (4): formatDate(), formatDateTime(), getNextWeekday(), selectFlatpickrDate()

### Community 21 - "Community 21"
Cohesion: 0.4
Nodes (1): SidebarState

### Community 22 - "Community 22"
Cohesion: 0.67
Nodes (2): getTreatmentsForTooth(), $t()

### Community 23 - "Community 23"
Cohesion: 0.67
Nodes (2): calculateAge(), getDefaultDentitionType()

### Community 24 - "Community 24"
Cohesion: 0.5
Nodes (2): getAllTemplates(), load()

### Community 25 - "Community 25"
Cohesion: 0.5
Nodes (2): POST(), updateAppointmentVisit()

### Community 26 - "Community 26"
Cohesion: 0.5
Nodes (2): getTreatmentsByPatient(), GET()

### Community 27 - "Community 27"
Cohesion: 0.67
Nodes (2): GET(), POST()

### Community 28 - "Community 28"
Cohesion: 0.5
Nodes (2): load(), getAllInvoices()

### Community 29 - "Community 29"
Cohesion: 0.5
Nodes (2): load(), getArchivedPatientsFull()

### Community 30 - "Community 30"
Cohesion: 0.5
Nodes (1): e

### Community 31 - "Community 31"
Cohesion: 0.67
Nodes (2): DELETE(), PUT()

### Community 32 - "Community 32"
Cohesion: 0.67
Nodes (2): handleEventChange(), handleEventClick()

### Community 33 - "Community 33"
Cohesion: 0.67
Nodes (1): seedEnhancedPatients()

### Community 34 - "Community 34"
Cohesion: 0.67
Nodes (1): seedHeavyData()

### Community 35 - "Community 35"
Cohesion: 0.67
Nodes (1): getKeys()

### Community 36 - "Community 36"
Cohesion: 0.67
Nodes (1): $t()

### Community 37 - "Community 37"
Cohesion: 0.67
Nodes (1): getToothName()

### Community 38 - "Community 38"
Cohesion: 0.67
Nodes (1): createDebouncer()

### Community 40 - "Community 40"
Cohesion: 0.67
Nodes (1): load()

### Community 41 - "Community 41"
Cohesion: 0.67
Nodes (1): load()

### Community 42 - "Community 42"
Cohesion: 0.67
Nodes (1): POST()

### Community 44 - "Community 44"
Cohesion: 0.67
Nodes (1): POST()

### Community 45 - "Community 45"
Cohesion: 0.67
Nodes (1): POST()

### Community 46 - "Community 46"
Cohesion: 0.67
Nodes (1): PUT()

### Community 47 - "Community 47"
Cohesion: 0.67
Nodes (1): GET()

### Community 48 - "Community 48"
Cohesion: 0.67
Nodes (1): POST()

### Community 49 - "Community 49"
Cohesion: 0.67
Nodes (1): GET()

### Community 50 - "Community 50"
Cohesion: 0.67
Nodes (2): GET(), getCustomFieldHistory()

### Community 52 - "Community 52"
Cohesion: 0.67
Nodes (1): GET()

### Community 53 - "Community 53"
Cohesion: 0.67
Nodes (1): GET()

### Community 54 - "Community 54"
Cohesion: 0.67
Nodes (1): GET()

### Community 55 - "Community 55"
Cohesion: 0.67
Nodes (1): GET()

### Community 56 - "Community 56"
Cohesion: 0.67
Nodes (1): load()

### Community 58 - "Community 58"
Cohesion: 0.67
Nodes (1): load()

### Community 60 - "Community 60"
Cohesion: 0.67
Nodes (1): GET()

### Community 61 - "Community 61"
Cohesion: 0.67
Nodes (1): load()

## Knowledge Gaps
- **Thin community `Community 8`** (15 nodes): `patients.svelte.ts`, `PatientStore`, `.applyPreset()`, `.constructor()`, `.deletePreset()`, `.loadPreferences()`, `.openQuickView()`, `.pageSize()`, `.resetFilters()`, `.savePreferences()`, `.savePreset()`, `.setFilter()`, `.toggleColumn()`, `.toggleSort()`, `.viewMode()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (9 nodes): `labeling.worker.min.js`, `t`, `.#e()`, `.#h()`, `.#i()`, `.#l()`, `.#o()`, `.run()`, `labeling.worker.min.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (7 nodes): `+server.ts`, `+server.ts`, `+server.ts`, `GET()`, `+server.ts`, `+server.ts`, `+server.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (5 nodes): `ui.svelte.ts`, `SidebarState`, `.isCollapsed()`, `.setCollapsed()`, `.toggle()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (4 nodes): `DentalChart.svelte`, `getTreatmentsForTooth()`, `$t()`, `DentalChart.svelte`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (4 nodes): `tooth-data.ts`, `calculateAge()`, `getDefaultDentitionType()`, `tooth-data.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (4 nodes): `+page.server.ts`, `getAllTemplates()`, `+page.server.ts`, `load()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (4 nodes): `+server.ts`, `POST()`, `updateAppointmentVisit()`, `+server.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (4 nodes): `getTreatmentsByPatient()`, `+server.ts`, `GET()`, `POST()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (4 nodes): `+server.ts`, `GET()`, `POST()`, `+server.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (4 nodes): `+page.server.ts`, `load()`, `getAllInvoices()`, `+page.server.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (4 nodes): `load()`, `+page.server.ts`, `getArchivedPatientsFull()`, `+page.server.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (4 nodes): `rle.worker.min.js`, `e`, `.decode()`, `rle.worker.min.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (4 nodes): `+server.ts`, `DELETE()`, `PUT()`, `+server.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (4 nodes): `+page.svelte`, `handleEventChange()`, `handleEventClick()`, `+page.svelte`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (3 nodes): `seed-enhanced.js`, `seedEnhancedPatients()`, `seed-enhanced.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (3 nodes): `seed-heavy.js`, `seedHeavyData()`, `seed-heavy.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (3 nodes): `verify_i18n.js`, `getKeys()`, `verify_i18n.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (3 nodes): `PrescriptionBuilder.svelte`, `$t()`, `PrescriptionBuilder.svelte`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (3 nodes): `tooth-naming.ts`, `getToothName()`, `tooth-naming.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (3 nodes): `debounce.ts`, `debounce.ts`, `createDebouncer()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (3 nodes): `load()`, `+layout.server.ts`, `+layout.server.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (3 nodes): `+page.server.ts`, `+page.server.ts`, `load()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (3 nodes): `+server.ts`, `POST()`, `+server.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (3 nodes): `+server.ts`, `POST()`, `+server.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (3 nodes): `+server.ts`, `POST()`, `+server.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (3 nodes): `+server.ts`, `+server.ts`, `PUT()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (3 nodes): `GET()`, `+server.ts`, `+server.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (3 nodes): `+server.ts`, `POST()`, `+server.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (3 nodes): `+server.ts`, `GET()`, `+server.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (3 nodes): `GET()`, `getCustomFieldHistory()`, `+server.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (3 nodes): `+server.ts`, `GET()`, `+server.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (3 nodes): `+server.ts`, `+server.ts`, `GET()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (3 nodes): `+server.ts`, `+server.ts`, `GET()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (3 nodes): `+server.ts`, `GET()`, `+server.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (3 nodes): `load()`, `+layout.server.ts`, `+layout.server.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (3 nodes): `+page.server.ts`, `load()`, `+page.server.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (3 nodes): `+server.ts`, `GET()`, `+server.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (3 nodes): `+page.server.ts`, `load()`, `+page.server.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getServerConfig()` connect `Community 6` to `Community 0`, `Community 2`, `Community 4`, `Community 5`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `handle()` connect `Community 4` to `Community 6`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `load()` connect `Community 5` to `Community 6`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 30 inferred relationships involving `load()` (e.g. with `getAppointmentById()` and `getPatientJourneySummary()`) actually correct?**
  _`load()` has 30 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `load()` (e.g. with `getAllUpcomingAppointments()` and `getPatientsEnhanced()`) actually correct?**
  _`load()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `DELETE()` (e.g. with `getTreatmentById()` and `reverseTransaction()`) actually correct?**
  _`DELETE()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `PUT()` (e.g. with `getTreatmentById()` and `recordDentalCharge()`) actually correct?**
  _`PUT()` has 3 INFERRED edges - model-reasoned connections that need verification._