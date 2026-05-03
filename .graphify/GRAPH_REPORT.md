# Graph Report - .  (2026-05-03)

## Corpus Check
- Large corpus: 214 files · ~224 646 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 760 nodes · 683 edges · 24 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 214 · Candidates: 245
- Excluded: 406 untracked · 38880 ignored · 0 sensitive · 0 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.
## God Nodes (most connected - your core abstractions)
1. `PatientStore` - 14 edges
2. `f()` - 7 edges
3. `t` - 7 edges
4. `p()` - 6 edges
5. `runAllTests()` - 6 edges
6. `simulateBooking()` - 5 edges
7. `normalizeDate()` - 5 edges
8. `ConfigStore` - 5 edges
9. `DELETE()` - 5 edges
10. `formatSqlDate()` - 4 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (25): addColumnIfNotExists(), archivePatient(), checkDoctorConflict(), createAppointment(), createPayment(), getAllSettings(), getAllUpcomingAppointments(), getAppointmentById() (+17 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (5): calculateAge(), closeModal(), handleEventChange(), handleEventClick(), isRetroactive()

### Community 3 - "Community 3"
Cohesion: 0.17
Nodes (16): b(), c(), d(), f(), g(), h(), l(), m() (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.19
Nodes (1): PatientStore

### Community 6 - "Community 6"
Cohesion: 0.23
Nodes (7): applyFilters(), loadAll(), loadCategories(), loadSpending(), loadSummary(), openAddModal(), saveSpending()

### Community 10 - "Community 10"
Cohesion: 0.2
Nodes (2): Journey, personnalis

### Community 11 - "Community 11"
Cohesion: 0.31
Nodes (5): b(), d(), k(), m(), p()

### Community 12 - "Community 12"
Cohesion: 0.44
Nodes (7): cleanupExpiredWaitingRoom(), formatSqlDate(), getRandomElement(), isConflict(), runClinicalSimulation(), simulateBooking(), simulateCheckIn()

### Community 15 - "Community 15"
Cohesion: 0.5
Nodes (1): t

### Community 18 - "Community 18"
Cohesion: 0.43
Nodes (2): DELETE(), PUT()

### Community 19 - "Community 19"
Cohesion: 0.52
Nodes (6): analyzeDatabaseHealth(), createPerformanceIndexes(), runAllTests(), testConcurrentWrites(), testDatabaseOperations(), testPragmaSettings()

### Community 20 - "Community 20"
Cohesion: 0.4
Nodes (2): getClinicSettings(), getWorkingHours()

### Community 21 - "Community 21"
Cohesion: 0.33
Nodes (1): ConfigStore

### Community 26 - "Community 26"
Cohesion: 0.4
Nodes (1): SidebarState

### Community 27 - "Community 27"
Cohesion: 0.5
Nodes (2): DELETE(), GET()

### Community 28 - "Community 28"
Cohesion: 0.5
Nodes (2): DELETE(), GET()

### Community 29 - "Community 29"
Cohesion: 0.5
Nodes (2): DELETE(), GET()

### Community 30 - "Community 30"
Cohesion: 0.4
Nodes (1): load()

### Community 40 - "Community 40"
Cohesion: 0.5
Nodes (1): TemplateEngine

### Community 42 - "Community 42"
Cohesion: 0.5
Nodes (1): GET()

### Community 54 - "Community 54"
Cohesion: 0.67
Nodes (1): GET()

### Community 57 - "Community 57"
Cohesion: 1
Nodes (2): GET(), POST()

### Community 59 - "Community 59"
Cohesion: 0.67
Nodes (1): load()

### Community 62 - "Community 62"
Cohesion: 0.67
Nodes (1): e

## Knowledge Gaps
- **2 isolated node(s):** `Journey`, `personnalis`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 5`** (1 nodes): `PatientStore`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 10`** (2 nodes): `Journey`, `personnalis`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (1 nodes): `t`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (2 nodes): `DELETE()`, `PUT()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (2 nodes): `getClinicSettings()`, `getWorkingHours()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (1 nodes): `ConfigStore`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `SidebarState`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (2 nodes): `DELETE()`, `GET()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (2 nodes): `DELETE()`, `GET()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (2 nodes): `DELETE()`, `GET()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `load()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `TemplateEngine`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `GET()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (1 nodes): `GET()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (2 nodes): `GET()`, `POST()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (1 nodes): `load()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (1 nodes): `e`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `Journey`, `personnalis` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.01 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._