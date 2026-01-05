<script lang="ts">
    import { page } from '$app/state';
    import { enhance } from '$app/forms';
    import type { Snippet } from 'svelte';
    import { t, locale } from 'svelte-i18n';

    let { children }: { children: Snippet } = $props();

    const navItems = [
        { label: $t('admin.nav.dashboard'), href: '/admin', icon: '📊' },
        { label: $t('admin.nav.users'), href: '/admin/users', icon: '👥' },
        { label: $t('admin.nav.settings'), href: '/admin/settings', icon: '⚙️' },
        { label: $t('admin.nav.inventory'), href: '/inventory', icon: '📦' }
    ];

    let isMobileMenuOpen = $state(false);

    async function setLanguage(lang: string) {
        document.cookie = `lang=${lang}; path=/; max-age=31536000`;
        window.location.reload();
    }
</script>

<div class="min-h-screen bg-gray-100 flex overflow-hidden">
    <!-- Desktop Sidebar -->
    <div class="hidden md:flex md:flex-shrink-0">
        <div class="flex flex-col w-64">
            <div class="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
                <div class="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
                    <div class="flex items-center flex-shrink-0 px-4 mb-5">
                        <span class="text-2xl font-bold text-indigo-600">Dentistico <span class="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded ml-2">ADMIN</span></span>
                    </div>
                    <nav class="mt-5 flex-1 px-2 bg-white space-y-1">
                        {#each navItems as item}
                            <a 
                                href={item.href} 
                                class="group flex items-center px-2 py-2 text-sm font-medium rounded-md {page.url.pathname === item.href ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
                            >
                                <span class="mr-3 text-lg">{item.icon}</span>
                                {item.label}
                            </a>
                        {/each}
                    </nav>
                </div>
                <div class="flex-shrink-0 flex border-t border-gray-200 p-4">
                    <form action="/logout" method="POST" use:enhance={() => {
                        return async () => { window.location.href = '/login'; };
                    }} class="w-full">
                        <button type="submit" class="flex-shrink-0 w-full group block">
                            <div class="flex items-center">
                                <div class="ml-3">
                                    <p class="text-sm font-medium text-red-600 group-hover:text-red-800">
                                        {$t('admin.nav.logout')}
                                    </p>
                                </div>
                            </div>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <!-- Main Column -->
    <div class="flex flex-col w-0 flex-1 overflow-hidden">
        <header class="bg-white shadow-sm border-b border-gray-200 py-4 px-8 flex justify-end items-center">
            <div class="flex gap-2 bg-gray-100 rounded-lg p-1">
                <button 
                    onclick={() => setLanguage('fr')} 
                    class="px-3 py-1.5 rounded-md text-xs font-semibold transition-all {$locale === 'fr' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
                >
                    FR
                </button>
                <button 
                    onclick={() => setLanguage('ar')} 
                    class="px-3 py-1.5 rounded-md text-xs font-semibold transition-all {$locale === 'ar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
                >
                    AR
                </button>
            </div>
        </header>
        <main class="flex-1 relative z-0 overflow-y-auto focus:outline-none py-6">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                {@render children()}
            </div>
        </main>
    </div>
</div>
