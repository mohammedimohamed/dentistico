<script lang="ts">
    import { page } from '$app/state';
    import { enhance } from '$app/forms';
    import type { Snippet } from 'svelte';
    
    let { children }: { children: Snippet } = $props();
    
    const navItems = [
        { label: 'Dashboard', href: '/doctor/dashboard' },
        { label: 'Patients', href: '/doctor/patients' }
    ];
</script>

<div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- Main Navigation -->
    <nav class="bg-white border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
                <div class="flex">
                    <div class="flex-shrink-0 flex items-center">
                        <span class="text-xl font-bold text-indigo-600">Dentistico</span>
                    </div>
                    <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
                        {#each navItems as item}
                            <a 
                                href={item.href} 
                                class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium {page.url.pathname === item.href ? 'border-indigo-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
                            >
                                {item.label}
                            </a>
                        {/each}
                    </div>
                </div>
                <div class="hidden sm:ml-6 sm:flex sm:items-center">
                    <form action="/logout" method="POST" use:enhance>
                        <button type="submit" class="text-sm font-medium text-red-600 hover:text-red-800">
                            Logout
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </nav>

    <div class="flex-grow">
        {@render children()}
    </div>

    <footer class="bg-white border-t border-gray-200 py-4">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
            &copy; 2025 Dentistico Professional
        </div>
    </footer>
</div>
