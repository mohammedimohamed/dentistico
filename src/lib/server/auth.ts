import db from './db';
import crypto from 'crypto';
import type { Cookies } from '@sveltejs/kit';

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24; // 24 hours

export function createSession(userId: number): string {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

    const stmt = db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)');
    stmt.run(sessionId, userId, expiresAt);

    return sessionId;
}

export function getSession(sessionId: string) {
    const stmt = db.prepare(`
        SELECT s.*, u.username, u.role, u.full_name, u.id as user_id
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = ? AND s.expires_at > ?
    `);
    return stmt.get(sessionId, new Date().toISOString()) as { id: string, user_id: number, username: string, role: string, full_name: string } | undefined;
}

export function deleteSession(sessionId: string) {
    const stmt = db.prepare('DELETE FROM sessions WHERE id = ?');
    stmt.run(sessionId);
}

export function setSessionCookie(cookies: Cookies, sessionId: string) {
    // Determine if we should use secure cookies (HTTPS only)
    // In production with HTTPS, use secure. In development/localhost, allow HTTP.
    const isSecure = process.env.NODE_ENV === 'production' && process.env.ORIGIN?.startsWith('https');
    
    cookies.set('session_id', sessionId, {
        path: '/',
        httpOnly: true,
        secure: isSecure, // Only use secure cookies in production with HTTPS
        sameSite: 'lax', // Changed from 'strict' to 'lax' for better compatibility
        maxAge: SESSION_DURATION_MS / 1000
    });
}
