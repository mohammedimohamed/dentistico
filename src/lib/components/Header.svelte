<script lang="ts">
    import { t, locale } from "svelte-i18n";
    import NotificationBell from "./NotificationBell.svelte";

    import type { Snippet } from "svelte";

    let {
        title = "",
        roleLabel = "",
        children,
    }: { title?: string; roleLabel?: string; children?: Snippet } = $props();

    async function setLanguage(lang: string) {
        document.cookie = `lang=${lang}; path=/; max-age=31536000`;
        window.location.reload();
    }
</script>

<header
    class="bg-white shadow-sm border-b border-gray-200 py-4 px-8 flex justify-between items-center shrink-0"
>
    <h1 class="text-xl font-bold text-gray-900">
        {$t(title)}
    </h1>

    <div class="flex items-center gap-4">
        {#if children}
            {@render children()}
        {/if}
        <a
            href="/profile"
            class="p-2 rounded-full hover:bg-gray-100 transition text-gray-600 hover:text-gray-900"
            aria-label={$t("common.profile")}
            title={$t("common.profile")}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="w-6 h-6"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
            </svg>
        </a>
        <NotificationBell />

        <!-- Language Toggle -->
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

        {#if roleLabel}
            <span class="text-sm text-gray-400 italic hidden sm:inline">
                {$t(roleLabel)}
            </span>
        {/if}
    </div>
</header>
