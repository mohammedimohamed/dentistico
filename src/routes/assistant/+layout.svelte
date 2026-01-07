<script lang="ts">
    import { page } from "$app/state";
    import type { Snippet } from "svelte";
    import Sidebar from "$lib/components/Sidebar.svelte";
    import { t, locale } from "svelte-i18n";
    import NotificationBell from "$lib/components/NotificationBell.svelte";

    import { NAVIGATION } from "$lib/config/navigation";
    let { children, data }: { children: Snippet; data: any } = $props();

    const navItems = NAVIGATION.assistant;

    async function setLanguage(lang: string) {
        document.cookie = `lang=${lang}; path=/; max-age=31536000`;
        window.location.reload();
    }
</script>

<div class="flex min-h-screen bg-gray-50 overflow-hidden">
    <Sidebar
        items={navItems}
        title="Dentistico"
        userName={data?.user?.full_name || "Assistant"}
    />

    <div class="flex-1 flex flex-col overflow-hidden">
        <header
            class="bg-white shadow-sm border-b border-gray-200 py-4 px-8 flex justify-between items-center"
        >
            <h1 class="text-xl font-bold text-gray-900">
                {navItems.find((i) => page.url.pathname === i.href)?.label ||
                    "Assistant Portal"}
            </h1>
            <div class="flex items-center gap-4">
                <NotificationBell />
                <div class="flex gap-2 bg-gray-100 rounded-lg p-1">
                    <button
                        onclick={() => setLanguage("fr")}
                        class="px-3 py-1.5 rounded-md text-xs font-semibold transition-all {$locale ===
                        'fr'
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'}"
                    >
                        FR
                    </button>
                    <button
                        onclick={() => setLanguage("ar")}
                        class="px-3 py-1.5 rounded-md text-xs font-semibold transition-all {$locale ===
                        'ar'
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'}"
                    >
                        AR
                    </button>
                </div>
                <span class="text-sm text-gray-500 italic"
                    >{$t("assistant.nav.userRole")}</span
                >
            </div>
        </header>

        <main class="flex-1 overflow-y-auto">
            {@render children()}
        </main>
    </div>
</div>
