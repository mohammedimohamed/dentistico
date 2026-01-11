import type { LayoutServerLoad } from './$types';
import { getServerConfig } from '$lib/server/db';

export const load: LayoutServerLoad = async ({ locals }) => {
    const config = getServerConfig();
    return {
        user: locals.user,
        locale: locals.locale,
        debug: locals.debug,
        config
    };
};
