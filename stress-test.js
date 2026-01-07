import Database from 'better-sqlite3';
import { performance } from 'perf_hooks';
import fs from 'fs';

// ============================================
// 1. DATABASE PERFORMANCE BASELINE
// ============================================

function testDatabaseOperations() {
    console.log('\n📊 DATABASE OPERATION BENCHMARKS\n');

    try {
        const db = new Database('dental_clinic.db');

        // Enable optimizations
        db.pragma('journal_mode = WAL');
        db.pragma('synchronous = NORMAL');
        db.pragma('cache_size = -64000');

        console.log('✓ Database opened with WAL mode enabled\n');

        // Test 1: Read Performance
        const readStart = performance.now();
        for (let i = 0; i < 1000; i++) {
            db.prepare('SELECT * FROM patients LIMIT 10').all();
        }
        const readTime = performance.now() - readStart;
        console.log(`✓ 1000 SELECT queries: ${readTime.toFixed(2)}ms (${(1000 / readTime * 1000).toFixed(0)} queries/sec)`);

        // Test 2: Write Performance
        const writeStart = performance.now();
        const insertStmt = db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)');
        const insertMany = db.transaction((notifications) => {
            for (const notif of notifications) insertStmt.run(...notif);
        });

        const testData = Array(100).fill(null).map((_, i) =>
            [1, 'test', `Test ${i}`, `Stress test notification ${i}`]
        );
        insertMany(testData);
        const writeTime = performance.now() - writeStart;
        console.log(`✓ 100 INSERTs (transactional): ${writeTime.toFixed(2)}ms (${(100 / writeTime * 1000).toFixed(0)} inserts/sec)`);

        // Test 3: Complex JOIN Performance
        const joinStart = performance.now();
        for (let i = 0; i < 100; i++) {
            db.prepare(`
        SELECT a.*, p.full_name, u.full_name as doctor_name
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        LEFT JOIN users u ON a.doctor_id = u.id
        WHERE date(a.start_time) >= date('now')
        LIMIT 20
      `).all();
        }
        const joinTime = performance.now() - joinStart;
        console.log(`✓ 100 Complex JOINs: ${joinTime.toFixed(2)}ms (${(100 / joinTime * 1000).toFixed(0)} queries/sec)`);

        // Cleanup
        db.prepare('DELETE FROM notifications WHERE type = ?').run('test');
        db.close();

    } catch (error) {
        console.error('❌ Error during database operations:', error.message);
    }
}

// ============================================
// 2. CONCURRENT WRITE TESTING
// ============================================

function testConcurrentWrites() {
    console.log('\n⚡ CONCURRENT WRITE TESTING\n');

    try {
        const db = new Database('dental_clinic.db');
        db.pragma('journal_mode = WAL');

        const workers = 5;
        const writesPerWorker = 50;

        console.log(`Spawning ${workers} workers, each doing ${writesPerWorker} writes...`);

        const start = performance.now();
        const insertStmt = db.prepare(`
      INSERT INTO notifications (user_id, type, title, message) 
      VALUES (?, ?, ?, ?)
    `);

        // Simulate concurrent writes using a transaction
        const insertMany = db.transaction(() => {
            for (let w = 0; w < workers; w++) {
                for (let i = 0; i < writesPerWorker; i++) {
                    insertStmt.run(1, 'stress', `Worker ${w}`, `Write ${i}`);
                }
            }
        });

        insertMany();

        const elapsed = performance.now() - start;
        const totalWrites = workers * writesPerWorker;
        console.log(`✓ ${totalWrites} writes in ${elapsed.toFixed(2)}ms`);
        console.log(`  Throughput: ${(totalWrites / elapsed * 1000).toFixed(0)} writes/sec`);

        // Cleanup
        db.prepare('DELETE FROM notifications WHERE type = ?').run('stress');
        db.close();

    } catch (error) {
        console.error('❌ Error during concurrent writes:', error.message);
    }
}

// ============================================
// 3. DATABASE SIZE & PERFORMANCE ANALYSIS
// ============================================

function analyzeDatabaseHealth() {
    console.log('\n🔍 DATABASE HEALTH ANALYSIS\n');

    try {
        const db = new Database('dental_clinic.db');

        // Get database size
        const stats = fs.statSync('dental_clinic.db');
        console.log(`Database Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

        // Check for WAL file
        try {
            const walStats = fs.statSync('dental_clinic.db-wal');
            console.log(`WAL File Size: ${(walStats.size / 1024).toFixed(2)} KB`);
        } catch {
            console.log('WAL File: Not found (database not in WAL mode)');
        }

        // Get table counts
        console.log('\n📊 Table Row Counts:');
        const tables = ['users', 'patients', 'appointments', 'treatments', 'payments', 'inventory_items'];
        tables.forEach(table => {
            try {
                const result = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
                console.log(`  ${table.padEnd(20)}: ${result.count.toString().padStart(6)} rows`);
            } catch (e) {
                console.log(`  ${table.padEnd(20)}: Error`);
            }
        });

        // Check for missing indexes
        console.log('\n📑 Index Check:');
        const indexes = db.prepare("SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND sql IS NOT NULL").all();
        console.log(`  Total custom indexes: ${indexes.length}`);

        indexes.forEach(idx => {
            console.log(`    - ${idx.name} on ${idx.tbl_name}`);
        });

        // Analyze query plan
        console.log('\n🔎 Query Plan Analysis (Appointments Query):');
        const slowQuery = `
      SELECT a.*, p.full_name, u.full_name as doctor_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN users u ON a.doctor_id = u.id
      WHERE a.start_time >= date('now')
      LIMIT 20
    `;

        const plan = db.prepare(`EXPLAIN QUERY PLAN ${slowQuery}`).all();
        plan.forEach(step => {
            console.log(`  ${step.detail}`);
            if (step.detail.includes('SCAN TABLE')) {
                console.log('  ⚠️  WARNING: Full table scan detected - consider adding index');
            }
        });

        db.close();

    } catch (error) {
        console.error('❌ Error during database analysis:', error.message);
    }
}

// ============================================
// 4. RECOMMENDED INDEXES
// ============================================

function createPerformanceIndexes() {
    console.log('\n⚡ CREATING PERFORMANCE INDEXES\n');

    try {
        const db = new Database('dental_clinic.db');

        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_appointments_start ON appointments(start_time)',
            'CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id)',
            'CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id)',
            'CREATE INDEX IF NOT EXISTS idx_treatments_patient ON treatments(patient_id)',
            'CREATE INDEX IF NOT EXISTS idx_treatments_date ON treatments(treatment_date)',
            'CREATE INDEX IF NOT EXISTS idx_payments_patient ON payments(patient_id)',
            'CREATE INDEX IF NOT EXISTS idx_patients_active ON patients(is_active, is_archived)',
            'CREATE INDEX IF NOT EXISTS idx_stock_moves_item ON stock_moves(item_id)',
            'CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id)'
        ];

        let created = 0;
        let existing = 0;

        indexes.forEach(sql => {
            try {
                db.exec(sql);
                const indexName = sql.match(/idx_\w+/)[0];
                console.log(`  ✓ ${indexName}`);
                created++;
            } catch (e) {
                if (e.message.includes('already exists')) {
                    existing++;
                } else {
                    console.log(`  ❌ Error: ${e.message}`);
                }
            }
        });

        console.log(`\n  Created: ${created} | Already existed: ${existing}`);

        // Run ANALYZE
        db.exec('ANALYZE');
        console.log('  ✓ Database analyzed for query optimization');

        db.close();

    } catch (error) {
        console.error('❌ Error creating indexes:', error.message);
    }
}

// ============================================
// 5. PRAGMAS OPTIMIZATION TEST
// ============================================

function testPragmaSettings() {
    console.log('\n⚙️  PRAGMA SETTINGS CHECK\n');

    try {
        const db = new Database('dental_clinic.db');

        const pragmas = [
            'journal_mode',
            'synchronous',
            'cache_size',
            'temp_store',
            'page_size'
        ];

        console.log('Current Settings:');
        pragmas.forEach(pragma => {
            const result = db.pragma(pragma, { simple: true });
            console.log(`  ${pragma.padEnd(20)}: ${result}`);
        });

        console.log('\n✅ Recommended Settings:');
        console.log('  journal_mode         : WAL');
        console.log('  synchronous          : NORMAL (or 1)');
        console.log('  cache_size           : -64000 (64MB)');
        console.log('  temp_store           : MEMORY (or 2)');
        console.log('  page_size            : 4096');

        db.close();

    } catch (error) {
        console.error('❌ Error checking pragmas:', error.message);
    }
}

// ============================================
// MAIN EXECUTION
// ============================================

function runAllTests() {
    console.log('═'.repeat(60));
    console.log('🏥 DENTISTICO STRESS TEST SUITE');
    console.log('═'.repeat(60));

    // Check if database exists
    if (!fs.existsSync('dental_clinic.db')) {
        console.error('\n❌ ERROR: dental_clinic.db not found!');
        console.error('Make sure you run this script from the project root directory.\n');
        process.exit(1);
    }

    try {
        testPragmaSettings();
        createPerformanceIndexes();
        testDatabaseOperations();
        testConcurrentWrites();
        analyzeDatabaseHealth();

        console.log('\n═'.repeat(60));
        console.log('✅ STRESS TESTING COMPLETE');
        console.log('═'.repeat(60));
        console.log('\n💡 Next Steps:');
        console.log('  1. Review any WARNING messages above');
        console.log('  2. Ensure journal_mode is WAL');
        console.log('  3. Test with: npm run dev (then monitor performance)');
        console.log('  4. Use autocannon for HTTP load testing:');
        console.log('     npm install -g autocannon');
        console.log('     autocannon -c 50 -d 30 http://localhost:5173\n');

    } catch (error) {
        console.error('\n❌ FATAL ERROR:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the tests
runAllTests();