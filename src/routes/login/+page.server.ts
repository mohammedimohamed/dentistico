import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { getUserByUsername } from '$lib/server/db';
import { createSession, setSessionCookie } from '$lib/server/auth';
import bcrypt from 'bcrypt';

export const actions = {
    default: async ({ request, cookies }) => {
        const data = await request.formData();
        const username = data.get('username') as string;
        const password = data.get('password') as string;

        if (!username || !password) {
            return fail(400, { missing: true });
        }

        const user = getUserByUsername(username) as any;

        if (!user || !bcrypt.compareSync(password, user.password_hash)) {
            return fail(400, { incorrect: true });
        }

        const sessionId = createSession(user.id);
        setSessionCookie(cookies, sessionId);

        if (user.role === 'doctor') {
            throw redirect(303, '/doctor/dashboard');
        } else if (user.role === 'assistant') {
            throw redirect(303, '/assistant/dashboard');
        } else {
            // Patient redirect - for now we just go to home or a placeholder
            throw redirect(303, '/');
        }
    }
} satisfies Actions;
