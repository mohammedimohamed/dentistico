<script lang="ts">
    import { page } from '$app/state';
    import type { Snippet } from 'svelte';
    import Sidebar from '$lib/components/Sidebar.svelte';
    
    let { children, data }: { children: Snippet, data: any } = $props();
    
    const navItems = [
        { label: 'Schedule', href: '/assistant/dashboard', icon: '📅' },
        { label: 'Inventory', href: '/inventory', icon: '📦' },
        { label: 'Invoices', href: '/assistant/invoices', icon: '📄' }
    ];
</script>

<div class="flex min-h-screen bg-gray-50 overflow-hidden">
    <Sidebar 
        items={navItems} 
        title="Dentistico" 
        userName={data?.user?.full_name || 'Assistant'} 
    />

    <div class="flex-1 flex flex-col overflow-hidden">
        <header class="bg-white shadow-sm border-b border-gray-200 py-4 px-8 flex justify-between items-center">
            <h1 class="text-xl font-bold text-gray-900">
                {navItems.find(i => page.url.pathname === i.href)?.label || 'Assistant Portal'}
            </h1>
            <div class="flex items-center gap-4">
                <span class="text-sm text-gray-500 italic">Clinic Assistant Mode</span>
            </div>
        </header>

        <main class="flex-1 overflow-y-auto">
            {@render children()}
        </main>
    </div>
</div>
