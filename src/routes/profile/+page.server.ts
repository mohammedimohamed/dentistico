import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import * as db from '$lib/server/db';
import bcrypt from 'bcrypt';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        throw redirect(302, '/login');
    }

    const fullUser = db.getUserById(locals.user.id);
    if (!fullUser) {
        throw error(404, 'User not found');
    }

    return {
        profile: fullUser
    };
};

export const actions: Actions = {
    updateProfile: async ({ request, locals }) => {
        if (!locals.user) throw redirect(302, '/login');

        const formData = await request.formData();
        const fullName = formData.get('fullName') as string;
        const phone = formData.get('phone') as string;

        if (!fullName) {
            return fail(400, { message: 'Full name is required' });
        }

        try {
            db.updateUserProfile(locals.user.id, fullName, phone);
            return { success: true, message: 'Profile updated successfully' };
        } catch (e: any) {
            return fail(500, { message: 'Failed to update profile' });
        }
    },

    updatePassword: async ({ request, locals }) => {
        if (!locals.user) throw redirect(302, '/login');

        const formData = await request.formData();
        const currentPassword = formData.get('currentPassword') as string;
        const newPassword = formData.get('newPassword') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return fail(400, { message: 'Missing fields' });
        }

        if (newPassword !== confirmPassword) {
            return fail(400, { message: 'Passwords do not match' });
        }

        const user = db.db.prepare('SELECT password_hash FROM users WHERE id = ?').get(locals.user.id) as any;

        const valid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!valid) {
            return fail(400, { message: 'Incorrect current password' });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        db.updateUserPassword(locals.user.id, newHash);

        return { success: true, message: 'Password updated successfully' };
    }
};
