export function createDebouncer(delay: number = 1000) {
    let timeoutId: any = null;
    const pending = new Set<() => Promise<void>>();

    return function debounce(fn: () => Promise<void>) {
        // Add to pending queue
        pending.add(fn);

        // Clear existing timeout
        if (timeoutId) clearTimeout(timeoutId);

        // Set new timeout
        timeoutId = setTimeout(async () => {
            // Execute all pending functions at once
            const tasks = Array.from(pending);
            pending.clear();

            await Promise.all(tasks.map(task => task()));
        }, delay);
    };
}
