# 🧪 Performance & Stress Testing Guide

This guide explains how to use the built-in performance tools to validate and benchmark the Dentistico system. These scripts are essential for proving the clinical-grade scalability of the application to stakeholders and sales prospects.

---

## 🛠 Prerequisites

Ensure you have the dependencies installed:
```bash
npm install better-sqlite3
# For HTTP load testing
npm install -g autocannon
```

---

## 🏗 1. Massive Data Seeding (`seed-heavy.js`)

Before testing performance at scale, you need a database populated with significant volume. This script simulates **10 years of clinical activity** in seconds.

### What it does:
- Injects **10,000 unique patient records**.
- Generates **50,000 appointments** distributed across various dates and status types.
- Uses `synchronous = OFF` for maximum write speed during the seed process.

### How to run:
```bash
node seed-heavy.js
```

---

## 📊 2. Database Stress Suite (`stress-test.js`)

This is the primary tool for validating database health and query optimization.

### What it does:
1. **Pragma Check**: Verifies if the database is using high-performance settings (WAL mode, Memory Temp Store).
2. **Index Validation**: Checks for and creates missing performance indices.
3. **Benchmarks**:
   - **Reads**: 1,000 SELECT operations.
   - **Writes**: Transactional INSERT performance.
   - **Joins**: Complex clinical data retrieval (JOINing Patients, Appointments, and Users).
4. **Concurrency Test**: Simulates 5 simultaneous "workers" writing to the database to check for locking issues.
5. **Health Audit**: Reports database file size, row counts per table, and query plan efficiency.

### How to run:
```bash
node stress-test.js
```

---

## 🚀 3. HTTP Load Testing (`autocannon`)

To test the full network stack and SvelteKit rendering engine, use `autocannon`.

### Step A: Start the Production Server
Testing in "Dev" mode will give inaccurate results. Always build first:
```bash
npm run build
node build
```

### Step B: Run the Benchmark
In a second terminal, run the load test:
```bash
# -c 50: 50 concurrent users
# -d 30: Run for 30 seconds
autocannon -c 50 -d 30 http://localhost:10000
```

---

## 📈 Interpreting the Results

### Good Benchmarks (Target)
- **Database JOINs**: Should be `< 10ms`.
- **HTTP Latency**: Should be `< 20ms` in production build.
- **Req/Sec**: A healthy production environment should handle `> 2,000 req/sec`.

### Warning Signs
- **SCAN TABLE**: If `stress-test.js` reports a "SCAN" instead of an "INDEX SEARCH" in the Query Plan Analysis, it means a query is unoptimized and will slow down as the database grows.
- **High Stdev**: If the standard deviation in `autocannon` is high, it indicates inconsistent performance under load, usually caused by background database locks.

---

## ⚠️ Important Notes
- **Seeding Overwrites**: Running `seed-heavy.js` adds data to your current `dental_clinic.db`. If you want a fresh start, delete the `.db` file first.
- **WAL Mode**: If the scripts report `WAL File: Not Found`, it is normal behavior if the database was closed cleanly.
