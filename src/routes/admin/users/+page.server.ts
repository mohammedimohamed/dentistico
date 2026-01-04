import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import db from '$lib/server/db';
import bcrypt from 'bcrypt';

export const load: PageServerLoad = async () => {
    const users = db.prepare(`
        SELECT id, username, full_name, role, created_at, is_active 
        FROM users 
        ORDER BY created_at DESC
    `).all();

    return {
        users
    };
};

export const actions: Actions = {
    createUser: async ({ request }) => {
        const data = await request.formData();
        const username = data.get('username') as string;
        const password = data.get('password') as string;
        const confirmPassword = data.get('confirm_password') as string;
        const fullName = data.get('full_name') as string;
        const role = data.get('role') as string;
        const phone = data.get('phone') as string;

        if (!username || !password || !fullName || !role) {
            return fail(400, { error: 'Missing required fields' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(username)) {
            return fail(400, { error: 'Username must be a valid email address' });
        }

        // Validate password confirmation
        if (password !== confirmPassword) {
            return fail(400, { error: 'Passwords do not match' });
        }

        try {
            const passwordHash = await bcrypt.hash(password, 10);
            db.prepare(`
                INSERT INTO users (username, password_hash, full_name, role, phone)
                VALUES (?, ?, ?, ?, ?)
            `).run(username, passwordHash, fullName, role, phone || null);
            return { success: true };
        } catch (e: any) {
            if (e.message.includes('UNIQUE constraint failed')) {
                return fail(400, { error: 'Username already exists' });
            }
            return fail(500, { error: 'Failed to create user' });
        }
    },
    toggleUserStatus: async ({ request, locals }) => {
        const data = await request.formData();
        const id = Number(data.get('id'));
        const isActive = Number(data.get('is_active')); // 1 to activate, 0 to deactivate

        if (locals.user && id === locals.user.id) {
            return fail(400, { error: 'You cannot deactivate yourself' });
        }

        db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(isActive, id);
        return { success: true };
    }
};
