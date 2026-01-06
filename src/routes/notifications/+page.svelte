<script lang="ts">
    import { onMount } from "svelte";
    import { t } from "svelte-i18n";

    let notifications = $state<any[]>([]);
    let loading = $state(true);

    async function loadNotifications() {
        const res = await fetch("/api/notifications");
        const data = await res.json();
        notifications = data.notifications;
        loading = false;
    }

    async function markAsRead(id: number) {
        await fetch(`/api/notifications/${id}/read`, { method: "POST" });
        notifications = notifications.map((n) =>
            n.id === id ? { ...n, is_read: 1 } : n,
        );
    }

    function getIcon(type: string) {
        const icons: Record<string, string> = {
            booking_created: "📅",
            booking_confirmed: "✅",
            booking_cancelled: "❌",
            low_stock: "📦",
            payment_received: "💰",
            appointment_reminder: "🔔",
        };
        return icons[type] || "🔔";
    }

    // Helper to try and translate title if it matches a known key
    function getTranslatedTitle(notification: any) {
        // First check if 'types.[title]' exists as a direct mapping (legacy support)
        // Note: We use the English title as the key to look up under notifications.types
        // This relies on the keys in JSON matching the exact English string stored in DB
        const typeKey = `notifications.types.${notification.title}`;
        const translated = $t(typeKey);

        // If translation returns the key itself (or generic fallback behavior), use original
        // However, svelte-i18n usually returns the key if not found.
        // We can check if it looks like the key we passed.
        // A safer way is to check if we have a type-based translation,
        // but 'payment_received' is generic.

        // Let's rely on the mapping we added to JSON.
        if (translated !== typeKey) return translated;

        return notification.title;
    }

    onMount(loadNotifications);
</script>

<div class="p-8 max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">{$t("notifications.page_title")}</h1>

    {#if loading}
        <div class="text-center py-12 text-gray-500">
            {$t("notifications.loading")}
        </div>
    {:else if notifications.length === 0}
        <div class="text-center py-12">
            <div class="text-6xl mb-4">🔔</div>
            <div class="text-gray-500">{$t("notifications.empty")}</div>
        </div>
    {:else}
        <div class="space-y-2">
            {#each notifications as notification}
                <div
                    class="p-4 rounded-lg border transition"
                    class:bg-blue-50={!notification.is_read}
                    class:bg-white={notification.is_read}
                >
                    <div class="flex items-start gap-4">
                        <div class="text-3xl">{getIcon(notification.type)}</div>
                        <div class="flex-1">
                            <div class="flex items-start justify-between">
                                <div>
                                    <div class="font-semibold">
                                        {getTranslatedTitle(notification)}
                                    </div>
                                    <div class="text-sm text-gray-600 mt-1">
                                        {notification.message}
                                    </div>
                                    <div class="text-xs text-gray-400 mt-2">
                                        {new Date(
                                            notification.created_at,
                                        ).toLocaleString()}
                                    </div>
                                </div>
                                {#if !notification.is_read}
                                    <button
                                        onclick={() =>
                                            markAsRead(notification.id)}
                                        class="text-sm text-blue-600 hover:underline"
                                    >
                                        {$t("notifications.mark_read")}
                                    </button>
                                {/if}
                            </div>
                            {#if notification.link}
                                <a
                                    href={notification.link}
                                    class="inline-block mt-2 text-sm text-blue-600 hover:underline"
                                >
                                    {$t("notifications.view_details")} →
                                </a>
                            {/if}
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>
