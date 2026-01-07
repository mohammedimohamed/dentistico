<script lang="ts">
    import { onMount } from "svelte";
    import { t } from "svelte-i18n";

    let unreadCount = $state(0);
    let previousCount = 0;
    let isInitialLoad = true;
    let showDropdown = $state(false);
    let notifications = $state<any[]>([]);
    let loading = $state(false);
    let audio: HTMLAudioElement;

    function playNotificationSound() {
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch((e) => {
                // Browsers often block audio until first user interaction
                console.log("Audio playback deferred or blocked:", e.message);
            });
        }
    }

    async function fetchUnreadCount() {
        try {
            const res = await fetch("/api/notifications?type=count");
            const data = await res.json();

            if (!isInitialLoad && data.count > previousCount) {
                playNotificationSound();
            }

            unreadCount = data.count;
            previousCount = data.count;
            isInitialLoad = false;
        } catch (e) {
            console.error("Failed to fetch notification count:", e);
        }
    }

    async function fetchNotifications() {
        loading = true;
        const res = await fetch("/api/notifications?type=unread");
        const data = await res.json();
        notifications = data.notifications;
        loading = false;
    }

    async function markAsRead(id: number) {
        await fetch(`/api/notifications/${id}/read`, { method: "POST" });
        notifications = notifications.filter((n) => n.id !== id);
        unreadCount = Math.max(0, unreadCount - 1);
        previousCount = unreadCount;
    }

    async function markAllRead() {
        await fetch("/api/notifications", { method: "POST" });
        notifications = [];
        unreadCount = 0;
        previousCount = 0;
        showDropdown = false;
    }

    function toggleDropdown() {
        showDropdown = !showDropdown;
        if (showDropdown && notifications.length === 0) {
            fetchNotifications();
        }
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

    function getTranslatedTitle(notification: any) {
        const typeKey = `notifications.types.${notification.title}`;
        const translated = $t(typeKey);
        if (translated !== typeKey) return translated;
        return notification.title;
    }

    onMount(() => {
        fetchUnreadCount();

        // Poll every 30 seconds
        const interval = setInterval(fetchUnreadCount, 30000);

        return () => clearInterval(interval);
    });
</script>

<div class="relative">
    <button
        onclick={toggleDropdown}
        class="relative p-2 rounded-full hover:bg-gray-100 transition"
        aria-label={$t("notifications.title")}
    >
        <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
        </svg>

        {#if unreadCount > 0}
            <span
                class="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
            >
                {unreadCount > 9 ? "9+" : unreadCount}
            </span>
        {/if}
    </button>

    {#if showDropdown}
        <div
            class="absolute end-0 mt-2 w-96 bg-white rounded-lg shadow-xl border z-50 text-start"
        >
            <div class="p-4 border-b flex justify-between items-center">
                <h3 class="font-bold text-lg">{$t("notifications.title")}</h3>
                {#if unreadCount > 0}
                    <button
                        onclick={markAllRead}
                        class="text-sm text-blue-600 hover:underline"
                    >
                        {$t("notifications.mark_all_read")}
                    </button>
                {/if}
            </div>

            <div class="max-h-96 overflow-y-auto">
                {#if loading}
                    <div class="p-8 text-center text-gray-500">
                        {$t("notifications.loading")}
                    </div>
                {:else if notifications.length === 0}
                    <div class="p-8 text-center text-gray-500">
                        <div class="text-4xl mb-2">🔔</div>
                        {$t("notifications.new_empty")}
                    </div>
                {:else}
                    {#each notifications as notification}
                        <div class="p-4 border-b hover:bg-gray-50 transition">
                            <div class="flex items-start gap-3">
                                <div class="text-2xl">
                                    {getIcon(notification.type)}
                                </div>
                                <div class="flex-1">
                                    <div class="font-semibold text-sm">
                                        {getTranslatedTitle(notification)}
                                    </div>
                                    <div class="text-sm text-gray-600 mt-1">
                                        {notification.message}
                                    </div>
                                    <div class="flex gap-2 mt-2">
                                        {#if notification.link}
                                            <a
                                                href={notification.link}
                                                class="text-xs text-blue-600 hover:underline"
                                            >
                                                {$t(
                                                    "notifications.view_details",
                                                )}
                                            </a>
                                        {/if}
                                        <button
                                            onclick={() =>
                                                markAsRead(notification.id)}
                                            class="text-xs text-gray-500 hover:text-gray-700"
                                        >
                                            {$t("notifications.dismiss")}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>

            <div class="p-3 border-t text-center">
                <a
                    href="/notifications"
                    class="text-sm text-blue-600 hover:underline"
                >
                    {$t("notifications.view_all")}
                </a>
            </div>
        </div>
    {/if}
    <audio bind:this={audio} src="/notification.mp3" preload="auto"></audio>
</div>

<svelte:window
    onclick={(e) => {
        const target = e.target as HTMLElement;
        if (!target.closest(".relative")) {
            showDropdown = false;
        }
    }}
/>
