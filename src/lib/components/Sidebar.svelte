<script lang="ts">
    import { page } from '$app/state';
    import { enhance } from '$app/forms';
    import { t } from 'svelte-i18n';

    interface NavItem {
        id?: string;
        label: string;
        href?: string;
        icon: string;
        onClick?: () => void;
    }

    interface Props {
        items: NavItem[];
        activeId?: string;
        title: string;
        userName: string;
    }

    let { items, activeId, title, userName }: Props = $props();
    let isCollapsed = $state(false);
</script>

<aside class="bg-gray-900 text-white min-h-screen transition-all duration-300 flex flex-col {isCollapsed ? 'w-20' : 'w-64'} border-inline-end border-gray-800">
    <div class="p-6 flex items-center justify-between border-b border-gray-800">
        {#if !isCollapsed}
            <span class="text-xl font-bold tracking-tight text-indigo-400">{title}</span>
        {/if}
        <button 
            onclick={() => isCollapsed = !isCollapsed}
            class="p-2 rounded-lg hover:bg-gray-800 text-gray-400 mirrored-rtl"
        >
            {isCollapsed ? '→' : '←'}
        </button>
    </div>

    <nav class="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
        {#each items as item}
            {#if item.href}
                <a 
                    href={item.href}
                    class="flex items-center gap-4 px-4 py-3 rounded-xl transition-all {page.url.pathname === item.href ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}"
                >
                    <span class="text-xl">{item.icon}</span>
                    {#if !isCollapsed}
                        <span class="font-medium whitespace-nowrap">{$t(item.label)}</span>
                    {/if}
                </a>
            {:else}
                <button 
                    onclick={item.onClick}
                    class="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all {activeId === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}"
                >
                    <span class="text-xl">{item.icon}</span>
                    {#if !isCollapsed}
                        <span class="font-medium whitespace-nowrap">{$t(item.label)}</span>
                    {/if}
                </button>
            {/if}
        {/each}
    </nav>

    <div class="p-4 border-t border-gray-800 text-start">
        <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white shadow-inner">
                {userName.charAt(0)}
            </div>
            {#if !isCollapsed}
                <div class="flex flex-col overflow-hidden">
                    <span class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none mb-1">{$t('common.user')}</span>
                    <span class="text-sm font-medium truncate">{userName}</span>
                </div>
            {/if}
        </div>
        
        <form action="/logout" method="POST" use:enhance={() => {
            return async () => { window.location.href = '/login'; };
        }}>
            <button type="submit" class="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-red-100 bg-red-500/10 hover:bg-red-500/20 transition-all border border-red-500/20">
                <span class="text-xl">⏻</span>
                {#if !isCollapsed}
                    <span class="text-sm font-bold">{$t('common.logout')}</span>
                {/if}
            </button>
        </form>
    </div>
</aside>
