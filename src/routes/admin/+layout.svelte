<script lang="ts">
    import { page } from '$app/state';
    import { enhance } from '$app/forms';
    import type { Snippet } from 'svelte';
    
    let { children }: { children: Snippet } = $props();
    
    const navItems = [
        { label: 'Admin Dashboard', href: '/admin', icon: '📊' },
        { label: 'User Management', href: '/admin/users', icon: '👥' },
        { label: 'System Settings', href: '/admin/settings', icon: '⚙️' },
        { label: 'Inventory (Full)', href: '/inventory', icon: '📦' }
    ];

    let isMobileMenuOpen = $state(false);
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
                                        Logout Admin
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
        <main class="flex-1 relative z-0 overflow-y-auto focus:outline-none py-6">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                {@render children()}
            </div>
        </main>
    </div>
</div>
