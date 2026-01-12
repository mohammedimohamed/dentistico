import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

export const GET: RequestHandler = async ({ locals }) => {
    // 1. Auth Check
    if (!locals.user || locals.user.role !== 'admin') {
        throw error(403, 'Unauthorized');
    }

    try {
        const zip = new AdmZip();

        // 2. Add Database File
        const dbPath = path.resolve('dental_clinic.db');
        if (fs.existsSync(dbPath)) {
            zip.addLocalFile(dbPath);

            // Also try to add -shm and -wal if they exist, to be safe for WAL mode consistency
            if (fs.existsSync(dbPath + '-wal')) zip.addLocalFile(dbPath + '-wal');
            if (fs.existsSync(dbPath + '-shm')) zip.addLocalFile(dbPath + '-shm');
        }

        // 3. Add Uploads Directory
        const uploadsDir = path.resolve('static/uploads');
        if (fs.existsSync(uploadsDir)) {
            zip.addLocalFolder(uploadsDir, 'uploads');
        }

        // 4. Generate Buffer
        const buffer = zip.toBuffer();

        // 5. Response
        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = `dentistico_backup_${dateStr}.zip`;

        return new Response(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${fileName}"`
            }
        });

    } catch (e: any) {
        console.error('Export failed:', e);
        throw error(500, 'Export failed: ' + e.message);
    }
};
