<script lang="ts">
    import { page } from "$app/state";
    import { enhance } from "$app/forms";
    import type { Snippet } from "svelte";
    import { t, locale } from "svelte-i18n";
    import NotificationBell from "$lib/components/NotificationBell.svelte";
    import Sidebar from "$lib/components/Sidebar.svelte";
    import { NAVIGATION } from "$lib/config/navigation";

    let { children, data }: { children: Snippet; data: any } = $props();

    const navItems = NAVIGATION.admin;

    let isMobileMenuOpen = $state(false);

    async function setLanguage(lang: string) {
        document.cookie = `lang=${lang}; path=/; max-age=31536000`;
        window.location.reload();
    }
</script>

<div class="flex min-h-screen bg-gray-50 overflow-hidden">
    <Sidebar
        items={navItems}
        title="Dentistico Admin"
        userName={data?.user?.full_name || "Admin"}
    />

    <!-- Main Column -->
    <div class="flex flex-col w-0 flex-1 overflow-hidden">
        <header
            class="bg-white shadow-sm border-b border-gray-200 py-4 px-8 flex justify-between items-center"
        >
            <h1 class="text-xl font-bold text-gray-900">
                {$t(
                    navItems.find((i) => page.url.pathname.startsWith(i.href))
                        ?.label || "admin.nav.dashboard",
                )}
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
            </div>
        </header>
        <main
            class="flex-1 relative z-0 overflow-y-auto focus:outline-none py-6"
        >
            <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                {@render children()}
            </div>
        </main>
    </div>
</div>
