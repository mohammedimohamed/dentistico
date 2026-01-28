import { dev } from '$app/environment';

export const logger = {
    info: (...args: any[]) => {
        if (dev) console.log('[INFO]', ...args);
    },
    warn: (...args: any[]) => {
        if (dev) console.warn('[WARN]', ...args);
    },
    error: (...args: any[]) => {
        // Always log errors, even in production
        console.error('[ERROR]', ...args);
    },
    perf: (label: string, fn: () => void) => {
        if (dev) {
            console.time(label);
            fn();
            console.timeEnd(label);
        } else {
            fn();
        }
    }
};
