// Simple startup script that checks for ORIGIN and provides helpful error messages
import { spawn } from 'child_process';

const port = process.env.PORT || 10000;
const origin = process.env.ORIGIN || `http://localhost:${port}`;

if (!process.env.ORIGIN) {
    console.warn(`⚠️  WARNING: ORIGIN environment variable is not set.`);
    console.warn(`   Using default: ${origin}`);
    console.warn(`   If you encounter CSRF errors, set ORIGIN explicitly:`);
    console.warn(`   Windows (PowerShell): $env:ORIGIN = "${origin}"; node build/index.js`);
    console.warn(`   Windows (CMD): set ORIGIN=${origin} && node build/index.js`);
    console.warn(`   Linux/Mac: ORIGIN=${origin} node build/index.js\n`);
}

// Set ORIGIN if not already set
process.env.ORIGIN = origin;

console.log(`🚀 Starting Dentistico server...`);
console.log(`   ORIGIN: ${origin}`);
console.log(`   PORT: ${port}\n`);

// Start the server
const server = spawn('node', ['build/index.js'], {
    stdio: 'inherit',
    env: process.env,
    shell: true
});

server.on('error', (err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
});

server.on('exit', (code) => {
    process.exit(code || 0);
});

